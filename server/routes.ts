import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupMultiAuth } from "./multiAuth";
import { getUncachableSpotifyClient, isSpotifyConnected } from "./spotifyClient";
import { stripe, PREMIUM_PRICE_MONTHLY, SUBSCRIPTION_CONFIG } from "./stripe";

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable CORS for same-origin requests (more secure than wildcard)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:5000', // Dev server
      'https://localhost:5000',
      process.env.ALLOWED_ORIGIN // Production domain
    ].filter(Boolean);
    
    // Only set CORS headers if origin is in allowlist (never use "*" with credentials)
    if (origin && allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true"); // Required for sessions
    }
    
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Setup authentication routes: /api/login, /api/callback, /api/logout (Replit Auth)
  await setupAuth(app);
  
  // Setup multi-provider authentication: local, Facebook, Microsoft, Auth0
  setupMultiAuth(app);

  // Auth user endpoint - supports both Replit Auth and local auth
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if this is a Replit Auth user (has claims.sub)
      if (req.user.claims?.sub) {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        
        if (!user) {
          console.error(`User ${userId} not found in database`);
          return res.status(404).json({ message: "User not found" });
        }
        
        return res.json(user);
      }
      
      // Local auth user - user object stored directly in session
      if (req.user.id) {
        const { passwordHash, ...userWithoutPassword } = req.user;
        return res.json(userWithoutPassword);
      }
      
      return res.status(401).json({ message: "Unauthorized - invalid session" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // GET /api/books - Get all books
  app.get("/api/books", async (req, res) => {
    try {
      const books = await storage.getBooks();
      res.json(books);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch books" });
    }
  });

  // GET /api/books/search - Search books
  app.get("/api/books/search", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }

      const books = await storage.searchBooks(q);
      res.json(books);
    } catch (error) {
      res.status(500).json({ message: "Failed to search books" });
    }
  });

  // GET /api/books/:id - Get specific book
  app.get("/api/books/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const book = await storage.getBook(id);
      
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      res.json(book);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch book" });
    }
  });

  // GET /api/stream/:id - Stream audio (redirect to actual audio URL)
  app.get("/api/stream/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const book = await storage.getBook(id);
      
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      // Security: Validate audio URL against allowed domains to prevent SSRF
      if (!storage.validateAudioUrl(book.audioUrl)) {
        console.warn(`Blocked potentially unsafe audio URL for book ${id}: ${book.audioUrl}`);
        return res.status(403).json({ 
          message: "Audio source not allowed",
          error: "INVALID_AUDIO_SOURCE"
        });
      }
      
      // Redirect to the validated audio URL
      res.redirect(302, book.audioUrl);
    } catch (error) {
      console.error('Streaming error:', error);
      res.status(500).json({ message: "Failed to stream book" });
    }
  });

  // Spotify connection status
  app.get("/api/spotify/status", async (req, res) => {
    try {
      const connected = await isSpotifyConnected();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // Search Spotify audiobooks
  app.get("/api/spotify/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }

      const spotify = await getUncachableSpotifyClient();
      const results = await spotify.search(q, ["audiobook"], undefined, 20);
      
      const audiobooks = results.audiobooks?.items.map(item => ({
        id: `spotify-${item.id}`,
        title: item.name,
        author: item.authors?.[0]?.name || "Unknown Author",
        narrator: item.narrators?.[0]?.name || null,
        description: item.description || null,
        duration: item.total_chapters ? item.total_chapters * 1800 : 3600, // Estimate
        coverImage: item.images?.[0]?.url || null,
        audioUrl: item.external_urls?.spotify || "",
        genre: null,
        publishedYear: null,
        source: "spotify",
        sourceId: item.id,
        totalTime: null,
        language: item.languages?.[0] || "en",
      })) || [];

      res.json(audiobooks);
    } catch (error) {
      console.error("Spotify search error:", error);
      res.status(500).json({ message: "Failed to search Spotify audiobooks" });
    }
  });

  // Get Spotify audiobook details
  app.get("/api/spotify/audiobook/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const spotify = await getUncachableSpotifyClient();
      const audiobook = await spotify.audiobooks.get(id);
      
      res.json({
        id: `spotify-${audiobook.id}`,
        title: audiobook.name,
        author: audiobook.authors?.[0]?.name || "Unknown Author",
        narrator: audiobook.narrators?.[0]?.name || null,
        description: audiobook.description || null,
        duration: audiobook.total_chapters ? audiobook.total_chapters * 1800 : 3600,
        coverImage: audiobook.images?.[0]?.url || null,
        audioUrl: audiobook.external_urls?.spotify || "",
        genre: null,
        publishedYear: null,
        source: "spotify",
        sourceId: audiobook.id,
        chapters: audiobook.chapters?.items?.map(ch => ({
          id: ch.id,
          name: ch.name,
          duration_ms: ch.duration_ms,
        })) || [],
      });
    } catch (error) {
      console.error("Spotify audiobook error:", error);
      res.status(500).json({ message: "Failed to fetch Spotify audiobook" });
    }
  });

  // Get user's Spotify library audiobooks
  app.get("/api/spotify/library", async (req, res) => {
    try {
      const spotify = await getUncachableSpotifyClient();
      const savedAudiobooks = await spotify.currentUser.audiobooks.savedAudiobooks(20);
      
      const audiobooks = savedAudiobooks.items.map(item => ({
        id: `spotify-${item.id}`,
        title: item.name,
        author: item.authors?.[0]?.name || "Unknown Author",
        narrator: item.narrators?.[0]?.name || null,
        description: item.description || null,
        duration: item.total_chapters ? item.total_chapters * 1800 : 3600,
        coverImage: item.images?.[0]?.url || null,
        audioUrl: item.external_urls?.spotify || "",
        genre: null,
        publishedYear: null,
        source: "spotify",
        sourceId: item.id,
      }));

      res.json(audiobooks);
    } catch (error) {
      console.error("Spotify library error:", error);
      res.status(500).json({ message: "Failed to fetch Spotify library" });
    }
  });

  // Stripe subscription routes
  
  // GET /api/subscription/status - Get current subscription status
  app.get("/api/subscription/status", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        subscriptionTier: user.subscriptionTier || "free",
        subscriptionEndDate: user.subscriptionEndDate,
        stripeSubscriptionId: user.stripeSubscriptionId,
        isPremium: user.subscriptionTier === "premium",
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });
  
  // POST /api/subscription/create-checkout - Create Stripe checkout session
  app.post("/api/subscription/create-checkout", async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment system not configured" });
      }
      
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get or create Stripe customer
      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;
        
        // Save customer ID to database
        await storage.updateUserSubscription(userId, { stripeCustomerId: customerId });
      }
      
      // Create checkout session for subscription
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: SUBSCRIPTION_CONFIG.productName,
                description: "Ad-free listening, unlimited bookmarks, exclusive content",
              },
              unit_amount: PREMIUM_PRICE_MONTHLY,
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${req.headers.origin || "http://localhost:5000"}?subscription=success`,
        cancel_url: `${req.headers.origin || "http://localhost:5000"}?subscription=cancelled`,
        metadata: {
          userId: user.id,
        },
      });
      
      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });
  
  // POST /api/subscription/cancel - Cancel subscription
  app.post("/api/subscription/cancel", async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment system not configured" });
      }
      
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription found" });
      }
      
      // Cancel at period end (don't cancel immediately)
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      
      // Update the database with cancellation info
      const cancelAt = subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null;
      await storage.updateUserSubscription(userId, {
        subscriptionEndDate: cancelAt,
      });
      
      res.json({
        message: "Subscription will be cancelled at period end",
        cancelAt: subscription.cancel_at,
      });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });
  
  // POST /api/webhook/stripe - Stripe webhook handler
  app.post("/api/webhook/stripe", async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Payment system not configured" });
    }
    
    const sig = req.headers["stripe-signature"] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
      // In production, always require signature verification
      if (endpointSecret && sig) {
        // req.body is raw Buffer when using express.raw() middleware
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } else if (process.env.NODE_ENV === "development") {
        // Only allow unverified webhooks in development (for testing)
        console.warn("WARNING: Processing unverified Stripe webhook (dev mode only)");
        event = JSON.parse(req.body.toString());
      } else {
        console.error("Webhook secret not configured - rejecting request");
        return res.status(400).json({ message: "Webhook secret not configured" });
      }
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        
        if (userId && subscriptionId) {
          // Fetch subscription to get current period end
          let subscriptionEndDate: Date | null = null;
          try {
            const subResponse = await stripe.subscriptions.retrieve(subscriptionId as string);
            const sub = subResponse as any;
            if (sub.current_period_end) {
              subscriptionEndDate = new Date(sub.current_period_end * 1000);
            }
            // Also update the subscription metadata with userId for future lookups
            await stripe.subscriptions.update(subscriptionId as string, {
              metadata: { userId },
            });
          } catch (e) {
            console.warn("Could not fetch subscription details:", e);
          }
          
          // Persist stripeCustomerId along with subscription details
          await storage.updateUserSubscription(userId, {
            stripeCustomerId: customerId as string,
            stripeSubscriptionId: subscriptionId as string,
            subscriptionTier: "premium",
            subscriptionEndDate,
          });
          console.log(`User ${userId} upgraded to premium with customer ${customerId}`);
        }
        break;
      }
      
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        let userId = subscription.metadata?.userId;
        
        // Fallback: lookup user by Stripe customer ID if userId not in metadata
        if (!userId && subscription.customer) {
          const user = await storage.getUserByStripeCustomerId(subscription.customer);
          if (user) {
            userId = user.id;
          }
        }
        
        if (userId) {
          await storage.updateUserSubscription(userId, {
            subscriptionTier: "free",
            stripeSubscriptionId: null,
            subscriptionEndDate: null,
          });
          console.log(`User ${userId} subscription deleted - downgraded to free`);
        } else {
          console.log(`Subscription ${subscription.id} deleted but no userId found`);
        }
        break;
      }
      
      case "customer.subscription.updated": {
        const subUpdated = event.data.object as any;
        let userId = subUpdated.metadata?.userId;
        
        // Fallback: lookup user by Stripe customer ID if userId not in metadata
        if (!userId && subUpdated.customer) {
          const user = await storage.getUserByStripeCustomerId(subUpdated.customer);
          if (user) {
            userId = user.id;
          }
        }
        
        if (userId) {
          if (subUpdated.status === "canceled" || subUpdated.status === "unpaid") {
            await storage.updateUserSubscription(userId, {
              subscriptionTier: "free",
              stripeSubscriptionId: null,
              subscriptionEndDate: null,
            });
            console.log(`User ${userId} downgraded to free (status: ${subUpdated.status})`);
          } else if (subUpdated.status === "active" && subUpdated.cancel_at_period_end) {
            // Subscription is active but will cancel at period end
            const endDate = subUpdated.current_period_end 
              ? new Date(subUpdated.current_period_end * 1000) 
              : null;
            await storage.updateUserSubscription(userId, {
              subscriptionEndDate: endDate,
            });
            console.log(`User ${userId} subscription will cancel at period end`);
          }
        }
        break;
      }
      
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;
        
        if (subscriptionId) {
          try {
            const subResponse = await stripe.subscriptions.retrieve(subscriptionId as string);
            const subData = subResponse as any;
            let userId = subData.metadata?.userId;
            
            // Fallback: lookup user by Stripe customer ID if userId not in metadata
            if (!userId && customerId) {
              const user = await storage.getUserByStripeCustomerId(customerId);
              if (user) {
                userId = user.id;
              }
            }
            
            if (userId) {
              const endDate = subData.current_period_end 
                ? new Date(subData.current_period_end * 1000) 
                : null;
              await storage.updateUserSubscription(userId, {
                subscriptionTier: "premium",
                subscriptionEndDate: endDate,
              });
              console.log(`User ${userId} subscription renewed`);
            }
          } catch (e) {
            console.warn("Could not process invoice payment:", e);
          }
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
