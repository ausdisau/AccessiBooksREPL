import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import { Strategy as Auth0Strategy } from "passport-auth0";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import bcrypt from "bcryptjs";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Local strategy (username/password)
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email));

        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }

        if (!user.passwordHash) {
          return done(null, false, { message: "Please use OAuth to sign in" });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return done(null, false, { message: "Invalid email or password" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Facebook Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: "/api/auth/facebook/callback",
        profileFields: ["id", "emails", "name", "picture"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const user = await storage.upsertUser({
            id: `facebook-${profile.id}`,
            email: email || null,
            firstName: profile.name?.givenName || null,
            lastName: profile.name?.familyName || null,
            profileImageUrl: profile.photos?.[0]?.value || null,
            authProvider: "facebook",
            providerId: profile.id,
          });
          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

// Microsoft Strategy
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(
    new MicrosoftStrategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: "/api/auth/microsoft/callback",
        scope: ["user.read"],
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value || profile._json?.userPrincipalName;
          const user = await storage.upsertUser({
            id: `microsoft-${profile.id}`,
            email: email || null,
            firstName: profile.name?.givenName || null,
            lastName: profile.name?.familyName || null,
            profileImageUrl: null,
            authProvider: "microsoft",
            providerId: profile.id,
          });
          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

// Auth0 Strategy
if (process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID && process.env.AUTH0_CLIENT_SECRET) {
  passport.use(
    new Auth0Strategy(
      {
        domain: process.env.AUTH0_DOMAIN,
        clientID: process.env.AUTH0_CLIENT_ID,
        clientSecret: process.env.AUTH0_CLIENT_SECRET,
        callbackURL: "/api/auth/auth0/callback",
      },
      async (accessToken: string, refreshToken: string, extraParams: any, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value || profile._json?.email;
          const user = await storage.upsertUser({
            id: `auth0-${profile.id}`,
            email: email || null,
            firstName: profile.name?.givenName || profile._json?.given_name || null,
            lastName: profile.name?.familyName || profile._json?.family_name || null,
            profileImageUrl: profile._json?.picture || null,
            authProvider: "auth0",
            providerId: profile.id,
          });
          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value;
          const user = await storage.upsertUser({
            id: `google-${profile.id}`,
            email: email || null,
            firstName: profile.name?.givenName || null,
            lastName: profile.name?.familyName || null,
            profileImageUrl: profile.photos?.[0]?.value || null,
            authProvider: "google",
            providerId: profile.id,
          });
          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

// GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "/api/auth/github/callback",
        scope: ["user:email"],
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value || profile._json?.email;
          const user = await storage.upsertUser({
            id: `github-${profile.id}`,
            email: email || null,
            firstName: profile.displayName?.split(" ")[0] || profile.username || null,
            lastName: profile.displayName?.split(" ").slice(1).join(" ") || null,
            profileImageUrl: profile.photos?.[0]?.value || profile._json?.avatar_url || null,
            authProvider: "github",
            providerId: profile.id,
          });
          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

export function setupMultiAuth(app: Express) {
  // Note: passport.initialize() and passport.session() should be set up before calling this function
  
  // Local registration
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          passwordHash,
          firstName: firstName || null,
          lastName: lastName || null,
          authProvider: "local",
        })
        .returning();

      // Log them in
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after registration" });
        }
        const { passwordHash, ...userWithoutPassword } = newUser;
        return res.json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Local login
  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Login failed" });
        }
        const { passwordHash, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Facebook OAuth
  if (process.env.FACEBOOK_APP_ID) {
    app.get("/api/auth/facebook", passport.authenticate("facebook", { scope: ["email"] }));
    app.get(
      "/api/auth/facebook/callback",
      passport.authenticate("facebook", { failureRedirect: "/?auth=failed" }),
      (req, res) => res.redirect("/")
    );
  }

  // Microsoft OAuth
  if (process.env.MICROSOFT_CLIENT_ID) {
    app.get("/api/auth/microsoft", passport.authenticate("microsoft"));
    app.get(
      "/api/auth/microsoft/callback",
      passport.authenticate("microsoft", { failureRedirect: "/?auth=failed" }),
      (req, res) => res.redirect("/")
    );
  }

  // Auth0 OAuth
  if (process.env.AUTH0_DOMAIN) {
    app.get("/api/auth/auth0", passport.authenticate("auth0"));
    app.get(
      "/api/auth/auth0/callback",
      passport.authenticate("auth0", { failureRedirect: "/?auth=failed" }),
      (req, res) => res.redirect("/")
    );
  }

  // Google OAuth
  if (process.env.GOOGLE_CLIENT_ID) {
    app.get(
      "/api/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"] })
    );
    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/?auth=failed" }),
      (req, res) => res.redirect("/")
    );
  }

  // GitHub OAuth
  if (process.env.GITHUB_CLIENT_ID) {
    app.get("/api/auth/github", passport.authenticate("github", { scope: ["user:email"] }));
    app.get(
      "/api/auth/github/callback",
      passport.authenticate("github", { failureRedirect: "/?auth=failed" }),
      (req, res) => res.redirect("/")
    );
  }

  // Get available auth providers
  app.get("/api/auth/providers", (req, res) => {
    res.json({
      local: true, // Always available
      facebook: !!process.env.FACEBOOK_APP_ID,
      microsoft: !!process.env.MICROSOFT_CLIENT_ID,
      auth0: !!process.env.AUTH0_DOMAIN,
      google: !!process.env.GOOGLE_CLIENT_ID,
      github: !!process.env.GITHUB_CLIENT_ID,
    });
  });

  // Local logout (for local auth)
  app.post("/api/auth/logout/local", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user (for local auth)
  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      const user = req.user as any;
      const { passwordHash, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    }
    return res.status(401).json({ message: "Not authenticated" });
  });
}

export const isLocalAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
