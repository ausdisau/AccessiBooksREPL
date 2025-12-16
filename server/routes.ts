import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupMultiAuth } from "./multiAuth";
import { getUncachableSpotifyClient, isSpotifyConnected } from "./spotifyClient";

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

  // Auth user endpoint
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        console.error("User claims missing from request");
        return res.status(401).json({ message: "Unauthorized - claims missing" });
      }
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.error(`User ${userId} not found in database`);
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
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

  const httpServer = createServer(app);
  return httpServer;
}
