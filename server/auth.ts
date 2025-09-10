// Based on javascript_auth_all_persistance blueprint - modified for external API integration
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Handle cases where stored password might not have the salt format (from external API)
  if (!stored.includes('.')) {
    // If no salt, do simple comparison (not recommended for production)
    return supplied === stored;
  }
  
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secret-key-here",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Attempting login for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`User ${username} not found`);
          return done(null, false, { message: 'User not found' });
        }
        
        console.log(`Found user ${username}, checking password`);
        const isValidPassword = await comparePasswords(password, user.password);
        
        if (!isValidPassword) {
          console.log(`Invalid password for user ${username}`);
          return done(null, false, { message: 'Invalid password' });
        }
        
        console.log(`Login successful for user ${username}`);
        return done(null, user);
      } catch (error) {
        console.error('Login error:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log(`Deserializing user: ${id}`);
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log('Registration attempt:', { 
        username: req.body.username, 
        email: req.body.email 
      });
      
      // Check if user already exists
      const existingUserByUsername = await storage.getUserByUsername(req.body.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingUserByEmail = await storage.getUserByEmail(req.body.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password for local storage (external API will handle its own hashing)
      const hashedPassword = await hashPassword(req.body.password);
      
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      console.log('User registered successfully:', user.username);

      req.login(user, (err) => {
        if (err) {
          console.error('Auto-login error after registration:', err);
          return next(err);
        }
        
        // Don't send password in response
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('Login attempt for:', req.body.username);
    
    passport.authenticate("local", (err: any, user: SelectUser, info: any) => {
      if (err) {
        console.error('Authentication error:', err);
        return res.status(500).json({ message: "Authentication error" });
      }
      
      if (!user) {
        console.log('Authentication failed:', info);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        console.log('Login successful for:', user.username);
        // Don't send password in response
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const username = req.user?.username;
    
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return next(err);
      }
      
      console.log('Logout successful for:', username);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('User not authenticated');
      return res.sendStatus(401);
    }
    
    console.log('Returning current user:', req.user?.username);
    // Don't send password in response
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });
}