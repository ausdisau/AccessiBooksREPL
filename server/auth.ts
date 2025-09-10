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

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  if (!stored || !supplied) {
    console.warn('Attempted authentication with empty password');
    return false; // Never allow empty password authentication
  }
  
  // Only handle properly formatted hashed passwords
  if (!stored.includes('.')) {
    console.warn('Attempted authentication with non-hashed password format');
    return false; // No plaintext fallback - all passwords must be properly hashed
  }
  
  try {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const SESSION_SECRET = process.env.SESSION_SECRET;
  
  if (!SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required for security');
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Enable secure cookies in production
      httpOnly: true, // Prevent XSS attacks
      sameSite: 'lax', // CSRF protection
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
        
        if (user && user.password === 'EXTERNAL_USER') {
          // This is an external user, delegate authentication to external API
          console.log(`External user ${username}, delegating to external API`);
          const authenticatedUser = await storage.authenticateExternalUser(username, password);
          
          if (authenticatedUser) {
            console.log(`External authentication successful for ${username}`);
            return done(null, authenticatedUser);
          } else {
            console.log(`External authentication failed for ${username}`);
            return done(null, false, { message: 'Invalid credentials' });
          }
        } else if (user) {
          // This is a local user, use local password verification
          console.log(`Local user ${username}, checking password`);
          const isValidPassword = await comparePasswords(password, user.password);
          
          if (!isValidPassword) {
            console.log(`Invalid password for local user ${username}`);
            return done(null, false, { message: 'Invalid password' });
          }
          
          console.log(`Local login successful for user ${username}`);
          return done(null, user);
        } else {
          // User not found, try external authentication as a fallback
          console.log(`User ${username} not found locally, trying external authentication`);
          const authenticatedUser = await storage.authenticateExternalUser(username, password);
          
          if (authenticatedUser) {
            console.log(`External authentication successful for new user ${username}`);
            return done(null, authenticatedUser);
          } else {
            console.log(`User ${username} not found`);
            return done(null, false, { message: 'User not found' });
          }
        }
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