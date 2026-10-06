import type { Express } from "express";
import type { Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { setupAuth } from "./sessionAuth";
import { setupMultiAuth } from "./multiAuth";
import { getUncachableSpotifyClient, isSpotifyConnected } from "./spotifyClient";
import { stripe, PREMIUM_PRICE_MONTHLY, SUBSCRIPTION_CONFIG } from "./stripe";
import { detectAudioFormat } from "./audioUtils";
import { getPrimaryStorageAdapter, getS3Adapter } from "./storageAdapter";
import multer from "multer";
import { db } from "./db";
import { books } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getHospitalCatalogueFacets, getHospitalCatalogueItem, searchHospitalCatalogue } from "./hospitalCatalogue";
import { isWorldCatConfigured, lookupAustralianWorldCatHoldingsByIsbn, lookupWorldCatByIsbn, worldCatStatus } from "./worldcat";
import { importWorldCatIsbn } from "./worldcatCatalogue";
import { createHospitalCatalogueAcquisition, createHospitalCatalogueAccessRoute, ensureHospitalCatalogueSuppliersSeeded, getHospitalCatalogueAcquisitions, getPublicHospitalCatalogueAccessOptions, listHospitalCatalogueSuppliers, updateHospitalCatalogueAcquisition, updateHospitalCatalogueAccessRoute } from "./hospitalCatalogueAcquisitions";
import { ebscoStatus, getEbscoProfileInfo, isEbscoConfigured, retrieveEbscoRecord, searchEbsco, searchEbscoByIsbn, summariseEbscoFullText } from "./ebsco";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB

function requireAdmin(req: Request, res: Response, next: () => void) {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const adminEmails = (process.env.ADMIN_EMAILS || "").trim().split(/\s*,\s*/).filter(Boolean);
  if (adminEmails.length > 0) {
    const email = (req.user as { email?: string }).email;
    if (!email || !adminEmails.includes(email)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable CORS for same-origin requests (more secure than wildcard)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:3000', // Dev server
      'http://localhost:5000', // Node app direct
      'http://localhost',     // IIS reverse proxy (port 80)
      'https://localhost:3000',
      'https://localhost:5000',
      'https://localhost',
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

  // Session and Passport auth (login, callback, logout)
  await setupAuth(app);
  
  // Setup multi-provider authentication: local, Facebook, Microsoft, Auth0
  setupMultiAuth(app);

  // Auth user endpoint - supports local auth and OAuth providers
  app.get('/api/auth/user', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // User object stored in session (local auth or OAuth)
      if (req.user.id) {
        // Try to get user from database first (OAuth users might be in DB)
        const dbUser = await storage.getUser(req.user.id);
        if (dbUser) {
          return res.json(dbUser);
        }
        
        // If not in DB, return session user (local auth)
        const { passwordHash, ...userWithoutPassword } = req.user;
        return res.json(userWithoutPassword);
      }
      
      return res.status(401).json({ message: "Unauthorized - invalid session" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // GET /api/user/preferences - Get current user preferences (hyper-contextual)
  app.get("/api/user/preferences", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const prefs = await storage.getUserPreferences(req.user.id);
      return res.json(prefs ?? { defaultSpeed: 1, preferredSections: [] });
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  // PATCH /api/user/preferences - Update current user preferences
  app.patch("/api/user/preferences", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const body = req.body as { defaultSpeed?: number; preferredSections?: string[] };
      const updated = await storage.updateUserPreferences(req.user.id, {
        ...(typeof body.defaultSpeed === "number" && { defaultSpeed: body.defaultSpeed }),
        ...(Array.isArray(body.preferredSections) && { preferredSections: body.preferredSections }),
      });
      return res.json(updated);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // AccessiBooks @ Hospitals - searchable, rights-aware catalogue.
  app.get("/api/hospitals/catalogue", async (req: Request, res: Response) => {
    try {
      const {
        q,
        audience,
        collection,
        language,
        rightsStatus,
        availabilityStatus,
        format,
        clinicalInformation,
        sort,
        limit,
        offset,
      } = req.query;

      const parsedClinical =
        clinicalInformation === "true"
          ? true
          : clinicalInformation === "false"
            ? false
            : undefined;

      const items = await searchHospitalCatalogue({
        q: typeof q === "string" ? q : undefined,
        audience: typeof audience === "string" ? audience : undefined,
        collection: typeof collection === "string" ? collection : undefined,
        language: typeof language === "string" ? language : undefined,
        rightsStatus: typeof rightsStatus === "string" ? rightsStatus : undefined,
        availabilityStatus: typeof availabilityStatus === "string" ? availabilityStatus : undefined,
        format: typeof format === "string" ? format as any : undefined,
        clinicalInformation: parsedClinical,
        sort: typeof sort === "string" ? sort as any : undefined,
        limit: typeof limit === "string" ? Number(limit) : undefined,
        offset: typeof offset === "string" ? Number(offset) : undefined,
      });

      res.json(items);
    } catch (error) {
      console.error("Hospital catalogue search failed:", error);
      res.status(500).json({ message: "Failed to search hospital catalogue" });
    }
  });

  app.get("/api/hospitals/catalogue/facets", async (_req: Request, res: Response) => {
    try {
      res.json(await getHospitalCatalogueFacets());
    } catch (error) {
      console.error("Hospital catalogue facets failed:", error);
      res.status(500).json({ message: "Failed to load hospital catalogue filters" });
    }
  });

  app.get("/api/hospitals/catalogue/:id", async (req: Request, res: Response) => {
    try {
      const item = await getHospitalCatalogueItem(req.params.id);
      if (!item) return res.status(404).json({ message: "Catalogue item not found" });
      res.json(item);
    } catch (error) {
      console.error("Hospital catalogue item failed:", error);
      res.status(500).json({ message: "Failed to load hospital catalogue item" });
    }
  });

  // WorldCat commercial-title integration. Metadata discovery does not imply content rights.
  app.get("/api/hospitals/worldcat/status", requireAdmin, async (_req: Request, res: Response) => {
    res.json(worldCatStatus());
  });

  app.get("/api/hospitals/worldcat/isbn/:isbn", requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!isWorldCatConfigured()) {
        return res.status(503).json({
          message: "WorldCat integration is not configured",
          requiredEnvironment: [
            "OCLC_WORLDCAT_CLIENT_ID",
            "OCLC_WORLDCAT_CLIENT_SECRET",
          ],
          optionalEnvironment: ["OCLC_WORLDCAT_REGISTRY_ID"],
        });
      }
      res.json(await lookupWorldCatByIsbn(req.params.isbn, { limit: 20 }));
    } catch (error) {
      console.error("WorldCat ISBN lookup failed:", error);
      res.status(502).json({
        message: "WorldCat ISBN lookup failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/hospitals/worldcat/isbn/:isbn/holdings", requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!isWorldCatConfigured()) {
        return res.status(503).json({ message: "WorldCat integration is not configured" });
      }
      res.json(await lookupAustralianWorldCatHoldingsByIsbn(req.params.isbn, { limit: 50 }));
    } catch (error) {
      console.error("WorldCat holdings lookup failed:", error);
      res.status(502).json({
        message: "WorldCat holdings lookup failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/hospitals/catalogue/worldcat/import-isbn", requireAdmin, async (req: Request, res: Response) => {
    try {
      const isbn = typeof req.body?.isbn === "string" ? req.body.isbn : "";
      if (!isbn) return res.status(400).json({ message: "ISBN is required" });
      if (!isWorldCatConfigured()) {
        return res.status(503).json({ message: "WorldCat integration is not configured" });
      }

      const result = await importWorldCatIsbn(isbn);
      res.status(201).json(result);
    } catch (error) {
      console.error("WorldCat catalogue import failed:", error);
      res.status(502).json({
        message: "WorldCat catalogue import failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Commercial acquisition and lawful access management.
  app.get("/api/hospitals/catalogue/suppliers", requireAdmin, async (_req: Request, res: Response) => {
    try {
      res.json(await listHospitalCatalogueSuppliers());
    } catch (error) {
      console.error("Hospital suppliers failed:", error);
      res.status(500).json({ message: "Failed to load catalogue suppliers" });
    }
  });

  app.get("/api/hospitals/catalogue/:id/acquisitions", requireAdmin, async (req: Request, res: Response) => {
    try {
      res.json(await getHospitalCatalogueAcquisitions(req.params.id));
    } catch (error) {
      console.error("Hospital acquisitions failed:", error);
      res.status(500).json({ message: "Failed to load catalogue acquisitions" });
    }
  });

  app.get("/api/hospitals/catalogue/:id/access-options", async (req: Request, res: Response) => {
    try {
      res.json(await getPublicHospitalCatalogueAccessOptions(req.params.id));
    } catch (error) {
      console.error("Hospital access options failed:", error);
      res.status(500).json({ message: "Failed to load access options" });
    }
  });

  app.post("/api/hospitals/catalogue/:id/acquisitions", requireAdmin, async (req: Request, res: Response) => {
    try {
      const body = req.body ?? {};
      const acquisition = await createHospitalCatalogueAcquisition({
        catalogueItemId: req.params.id,
        supplierCode: typeof body.supplierCode === "string" ? body.supplierCode : undefined,
        supplierTitleId: typeof body.supplierTitleId === "string" ? body.supplierTitleId : null,
        supplierUrl: typeof body.supplierUrl === "string" ? body.supplierUrl : null,
        scopeType: typeof body.scopeType === "string" ? body.scopeType : undefined,
        scopeKey: typeof body.scopeKey === "string" ? body.scopeKey : undefined,
        acquisitionStatus: typeof body.acquisitionStatus === "string" ? body.acquisitionStatus : undefined,
        licenceModel: typeof body.licenceModel === "string" ? body.licenceModel : undefined,
        accessMode: typeof body.accessMode === "string" ? body.accessMode : undefined,
        territory: typeof body.territory === "string" ? body.territory : undefined,
        formats: Array.isArray(body.formats) ? body.formats.filter((v: unknown) => typeof v === "string") : undefined,
        accessibilityFeatures: Array.isArray(body.accessibilityFeatures) ? body.accessibilityFeatures.filter((v: unknown) => typeof v === "string") : undefined,
        copiesOrSeats: typeof body.copiesOrSeats === "number" ? body.copiesOrSeats : null,
        concurrentUsers: typeof body.concurrentUsers === "number" ? body.concurrentUsers : null,
        loanPeriodDays: typeof body.loanPeriodDays === "number" ? body.loanPeriodDays : null,
        agreementReference: typeof body.agreementReference === "string" ? body.agreementReference : null,
        rightsBasis: typeof body.rightsBasis === "string" ? body.rightsBasis : undefined,
        rightsNote: typeof body.rightsNote === "string" ? body.rightsNote : null,
        termsUrl: typeof body.termsUrl === "string" ? body.termsUrl : null,
        startsAt: typeof body.startsAt === "string" ? new Date(body.startsAt) : null,
        endsAt: typeof body.endsAt === "string" ? new Date(body.endsAt) : null,
        verifiedAt: typeof body.verifiedAt === "string" ? new Date(body.verifiedAt) : null,
        verifiedBy: typeof body.verifiedBy === "string" ? body.verifiedBy : null,
      });
      res.status(201).json(acquisition);
    } catch (error) {
      console.error("Create hospital acquisition failed:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create acquisition" });
    }
  });

  app.patch("/api/hospitals/acquisitions/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const body = req.body ?? {};
      const patch: any = {};
      const stringFields = ["supplierCode", "supplierTitleId", "supplierUrl", "scopeType", "scopeKey", "acquisitionStatus", "licenceModel", "accessMode", "territory", "agreementReference", "rightsBasis", "rightsNote", "termsUrl", "verifiedBy"];
      for (const field of stringFields) {
        if (typeof body[field] === "string" || body[field] === null) patch[field] = body[field];
      }
      if (Array.isArray(body.formats)) patch.formats = body.formats.filter((v: unknown) => typeof v === "string");
      if (Array.isArray(body.accessibilityFeatures)) patch.accessibilityFeatures = body.accessibilityFeatures.filter((v: unknown) => typeof v === "string");
      for (const field of ["copiesOrSeats", "concurrentUsers", "loanPeriodDays"]) {
        if (typeof body[field] === "number" || body[field] === null) patch[field] = body[field];
      }
      for (const field of ["startsAt", "endsAt", "verifiedAt"]) {
        if (typeof body[field] === "string") patch[field] = new Date(body[field]);
        if (body[field] === null) patch[field] = null;
      }
      res.json(await updateHospitalCatalogueAcquisition(req.params.id, patch));
    } catch (error) {
      console.error("Update hospital acquisition failed:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update acquisition" });
    }
  });

  app.post("/api/hospitals/acquisitions/:id/routes", requireAdmin, async (req: Request, res: Response) => {
    try {
      const body = req.body ?? {};
      if (typeof body.format !== "string") return res.status(400).json({ message: "format is required" });
      const route = await createHospitalCatalogueAccessRoute({
        acquisitionId: req.params.id,
        format: body.format,
        routeType: typeof body.routeType === "string" ? body.routeType : undefined,
        url: typeof body.url === "string" ? body.url : null,
        requiresAuthentication: typeof body.requiresAuthentication === "boolean" ? body.requiresAuthentication : undefined,
        requiresLibraryCard: typeof body.requiresLibraryCard === "boolean" ? body.requiresLibraryCard : undefined,
        drmProtected: typeof body.drmProtected === "boolean" ? body.drmProtected : undefined,
        downloadAllowed: typeof body.downloadAllowed === "boolean" ? body.downloadAllowed : undefined,
        offlineAllowed: typeof body.offlineAllowed === "boolean" ? body.offlineAllowed : undefined,
        accessibleFormat: typeof body.accessibleFormat === "boolean" ? body.accessibleFormat : undefined,
        accessibilityFeatures: Array.isArray(body.accessibilityFeatures) ? body.accessibilityFeatures.filter((v: unknown) => typeof v === "string") : undefined,
        availabilityStatus: typeof body.availabilityStatus === "string" ? body.availabilityStatus : undefined,
        lastVerifiedAt: typeof body.lastVerifiedAt === "string" ? new Date(body.lastVerifiedAt) : null,
      });
      res.status(201).json(route);
    } catch (error) {
      console.error("Create hospital access route failed:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create access route" });
    }
  });

  app.patch("/api/hospitals/access-routes/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const body = req.body ?? {};
      const patch: any = {};
      const stringFields = ["format", "routeType", "url", "availabilityStatus"];
      for (const field of stringFields) {
        if (typeof body[field] === "string" || body[field] === null) patch[field] = body[field];
      }
      const boolFields = ["requiresAuthentication", "requiresLibraryCard", "drmProtected", "downloadAllowed", "offlineAllowed", "accessibleFormat"];
      for (const field of boolFields) {
        if (typeof body[field] === "boolean") patch[field] = body[field];
      }
      if (Array.isArray(body.accessibilityFeatures)) patch.accessibilityFeatures = body.accessibilityFeatures.filter((v: unknown) => typeof v === "string");
      if (typeof body.lastVerifiedAt === "string") patch.lastVerifiedAt = new Date(body.lastVerifiedAt);
      if (body.lastVerifiedAt === null) patch.lastVerifiedAt = null;
      res.json(await updateHospitalCatalogueAccessRoute(req.params.id, patch));
    } catch (error) {
      console.error("Update hospital access route failed:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update access route" });
    }
  });

  // EBSCO Discovery Service integration.
  // Institution-scoped discovery only: catalogue metadata or full-text indicators do not
  // become a patient-facing AccessiBooks entitlement without a verified acquisition route.
  app.get("/api/hospitals/ebsco/status", requireAdmin, async (_req: Request, res: Response) => {
    res.json(ebscoStatus());
  });

  app.get("/api/hospitals/ebsco/info", requireAdmin, async (_req: Request, res: Response) => {
    try {
      if (!isEbscoConfigured()) {
        return res.status(503).json({
          message: "EBSCO EDS integration is not configured",
          requiredEnvironment: [
            "EBSCO_EDS_USER_ID",
            "EBSCO_EDS_PASSWORD",
            "EBSCO_EDS_PROFILE",
          ],
          optionalEnvironment: [
            "EBSCO_EDS_API_KEY",
            "EBSCO_EDS_INTERFACE_ID",
            "EBSCO_EDS_ORG",
          ],
        });
      }
      res.json(await getEbscoProfileInfo());
    } catch (error) {
      console.error("EBSCO profile info failed:", error);
      res.status(502).json({
        message: "EBSCO profile info failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/hospitals/ebsco/search", requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!isEbscoConfigured()) {
        return res.status(503).json({ message: "EBSCO EDS integration is not configured" });
      }
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (!q) return res.status(400).json({ message: "q is required" });

      const resultsPerPage =
        typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
      const pageNumber =
        typeof req.query.page === "string" ? Number(req.query.page) : undefined;
      const guest = req.query.guest === "true";

      res.json(await searchEbsco({
        query: q,
        resultsPerPage,
        pageNumber,
        sort: typeof req.query.sort === "string" ? req.query.sort : undefined,
        view: req.query.view === "title" || req.query.view === "brief" || req.query.view === "detailed"
          ? req.query.view
          : "detailed",
        includeFacets: req.query.facets !== "false",
        guest,
      }));
    } catch (error) {
      console.error("EBSCO search failed:", error);
      res.status(502).json({
        message: "EBSCO search failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/hospitals/ebsco/isbn/:isbn", requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!isEbscoConfigured()) {
        return res.status(503).json({ message: "EBSCO EDS integration is not configured" });
      }
      res.json(await searchEbscoByIsbn(req.params.isbn, {
        resultsPerPage: 20,
        view: "detailed",
        includeFacets: true,
        guest: req.query.guest === "true",
      }));
    } catch (error) {
      console.error("EBSCO ISBN search failed:", error);
      res.status(502).json({
        message: "EBSCO ISBN search failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/hospitals/catalogue/:id/ebsco/discover", requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!isEbscoConfigured()) {
        return res.status(503).json({ message: "EBSCO EDS integration is not configured" });
      }
      const item = await getHospitalCatalogueItem(req.params.id);
      if (!item) return res.status(404).json({ message: "Catalogue item not found" });
      const isbn = item.isbn13 || item.isbn10;
      if (!isbn) {
        return res.status(400).json({
          message: "Catalogue item requires an ISBN before EBSCO discovery",
        });
      }
      res.json({
        catalogueItemId: item.id,
        isbn,
        result: await searchEbscoByIsbn(isbn, {
          resultsPerPage: 20,
          view: "detailed",
          includeFacets: true,
        }),
        entitlementStatus: "not_recorded",
        note:
          "EDS search results are institution-scoped discovery. Review the selected record and licence/access route before exposing it to patients.",
      });
    } catch (error) {
      console.error("EBSCO catalogue discovery failed:", error);
      res.status(502).json({
        message: "EBSCO catalogue discovery failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/hospitals/ebsco/retrieve", requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!isEbscoConfigured()) {
        return res.status(503).json({ message: "EBSCO EDS integration is not configured" });
      }
      const dbId = typeof req.body?.dbId === "string" ? req.body.dbId : "";
      const an = typeof req.body?.an === "string" ? req.body.an : "";
      if (!dbId || !an) {
        return res.status(400).json({ message: "dbId and an are required" });
      }
      const record = await retrieveEbscoRecord({
        dbId,
        an,
        ebookPreferredFormat:
          typeof req.body?.ebookPreferredFormat === "string"
            ? req.body.ebookPreferredFormat
            : undefined,
        guest: req.body?.guest === true,
      });
      res.json({
        record,
        fullText: summariseEbscoFullText(record),
      });
    } catch (error) {
      console.error("EBSCO retrieve failed:", error);
      res.status(502).json({
        message: "EBSCO retrieve failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // GET /api/books - Get all books
  app.get("/api/books", async (req: Request, res: Response) => {
    try {
      const books = await storage.getBooks();
      res.json(books);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch books" });
    }
  });

  // GET /api/books/search - Search books
  app.get("/api/books/search", async (req: Request, res: Response) => {
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
  app.get("/api/books/:id", async (req: Request, res: Response) => {
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

  // GET /api/books/:id/chapters - Get chapters for a book (LibriVox only)
  app.get("/api/books/:id/chapters", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Only LibriVox books have chapters
      if (!id.startsWith("librivox-")) {
        return res.json([]);
      }
      
      const chapters = await storage.getBookChapters(id);
      res.json(chapters);
    } catch (error) {
      console.error("Error fetching chapters:", error);
      res.status(500).json({ message: "Failed to fetch chapters" });
    }
  });

  // GET /api/stream/:id - Stream audio with format support (MP3, WAV, OGG)
  app.get("/api/stream/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const book = await storage.getBook(id);
      
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      // S3/GCS: redirect to signed URL
      if (book.source === "s3" || book.source === "gcs") {
        const key = book.sourceId;
        if (!key) return res.status(400).json({ message: "Invalid book source" });
        const adapter = await getPrimaryStorageAdapter();
        if (!adapter) return res.status(503).json({ message: "Storage not configured" });
        const signedUrl = await adapter.getSignedUrl(key, 3600);
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.redirect(302, signedUrl);
      }
      // Project Gutenberg / Google Books / Amazon: redirect to read or product page (no audio)
      if (book.source === "gutenberg" || book.source === "google-books" || book.source === "amazon") {
        res.setHeader("Cache-Control", "public, max-age=3600");
        return res.redirect(302, book.audioUrl);
      }
      // Security: Validate audio URL against allowed domains to prevent SSRF
      if (!storage.validateAudioUrl(book.audioUrl)) {
        console.warn(`Blocked potentially unsafe audio URL for book ${id}: ${book.audioUrl}`);
        return res.status(403).json({ 
          message: "Audio source not allowed",
          error: "INVALID_AUDIO_SOURCE"
        });
      }
      
      // Detect audio format from URL
      const formatInfo = detectAudioFormat(book.audioUrl);
      
      // Set appropriate headers for high-fidelity audio streaming
      res.setHeader('Content-Type', formatInfo.mimeType);
      res.setHeader('Accept-Ranges', 'bytes'); // Enable range requests for seeking
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for audio streaming
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
      
      // Enable compression for better streaming (if supported)
      // Note: Audio files are usually already compressed, so this may not apply
      
      // Support range requests for seeking
      const range = req.headers.range;
      if (range) {
        // For now, redirect with range header support
        // The actual server handling the audio file will process the range request
        res.setHeader('Location', book.audioUrl);
        return res.status(307).end(); // Temporary redirect with method preservation
      }
      
      // Redirect to the validated audio URL with format awareness
      res.redirect(302, book.audioUrl);
    } catch (error) {
      console.error('Streaming error:', error);
      res.status(500).json({ message: "Failed to stream book" });
    }
  });

  // Spotify connection status
  app.get("/api/spotify/status", async (req: Request, res: Response) => {
    try {
      const connected = await isSpotifyConnected();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // Search Spotify audiobooks
  app.get("/api/spotify/search", async (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }

      const spotify = await getUncachableSpotifyClient();
      const results = await spotify.search(q, ["audiobook"], undefined, 20);
      
      const audiobooks = results.audiobooks?.items.map((item: any) => ({
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
  app.get("/api/spotify/audiobook/:id", async (req: Request, res: Response) => {
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
        chapters: audiobook.chapters?.items?.map((ch: any) => ({
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
  app.get("/api/spotify/library", async (req: Request, res: Response) => {
    try {
      const spotify = await getUncachableSpotifyClient();
      const savedAudiobooks = await spotify.currentUser.audiobooks.savedAudiobooks(20);
      
      const audiobooks = savedAudiobooks.items.map((item: any) => ({
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
  app.get("/api/subscription/status", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
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
  app.post("/api/subscription/create-checkout", async (req: Request, res: Response) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment system not configured" });
      }
      
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
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
  app.post("/api/subscription/cancel", async (req: Request, res: Response) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment system not configured" });
      }
      
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
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
  
  // ============== LISTENING HISTORY API ==============
  
  // GET /api/history - Get user's listening history
  app.get("/api/history", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getListeningHistory(userId, limit);
      
      res.json(history);
    } catch (error) {
      console.error("Error fetching listening history:", error);
      res.status(500).json({ message: "Failed to fetch listening history" });
    }
  });
  
  // GET /api/history/continue - Get continue listening items
  app.get("/api/history/continue", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const continueListening = await storage.getContinueListening(userId, limit);
      
      res.json(continueListening);
    } catch (error) {
      console.error("Error fetching continue listening:", error);
      res.status(500).json({ message: "Failed to fetch continue listening" });
    }
  });
  
  // POST /api/history/progress - Update listening progress
  app.post("/api/history/progress", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      const { bookId, currentTime, bookTitle, bookAuthor, bookCover, totalDuration } = req.body;
      
      if (!bookId || currentTime === undefined || !bookTitle) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const history = await storage.updateListeningProgress(userId, bookId, {
        currentTime,
        bookTitle,
        bookAuthor,
        bookCover,
        totalDuration,
      });
      
      res.json(history);
    } catch (error) {
      console.error("Error updating listening progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });
  
  // POST /api/webhook/stripe - Stripe webhook handler
  app.post("/api/webhook/stripe", async (req: Request, res: Response) => {
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

  // Admin storage (S3/GCS) - require auth; optionally restrict to ADMIN_EMAILS
  app.get("/api/admin/storage", requireAdmin, async (req: Request, res: Response) => {
    try {
      const adapter = await getPrimaryStorageAdapter();
      if (!adapter) return res.status(503).json({ message: "Storage not configured" });
      const prefix = (req.query.prefix as string) || "";
      const objects = await adapter.listObjects(prefix);
      res.json({ objects });
    } catch (error) {
      console.error("Admin list storage error:", error);
      res.status(500).json({ message: "Failed to list storage" });
    }
  });

  app.post("/api/admin/upload", requireAdmin, upload.single("file"), async (req: Request, res: Response) => {
    try {
      const adapter = await getPrimaryStorageAdapter();
      if (!adapter) return res.status(503).json({ message: "Storage not configured" });
      const file = (req as any).file;
      if (!file || !file.buffer) return res.status(400).json({ message: "No file uploaded" });
      const title = (req.body?.title as string) || file.originalname || "Untitled";
      const author = (req.body?.author as string) || "Unknown";
      const key = `uploads/${Date.now()}-${file.originalname || "audio"}`;
      const contentType = file.mimetype || "audio/mpeg";
      await adapter.putObject(key, file.buffer, contentType);
      const source = (await getS3Adapter()) ? "s3" : "gcs";
      const duration = 0;
      const book = await storage.insertUploadedBook({
        title,
        author,
        narrator: null,
        description: null,
        duration,
        coverImage: null,
        audioUrl: "/api/stream/",
        genre: null,
        publishedYear: null,
        source,
        sourceId: key,
        totalTime: "0:00:00",
        language: "English",
      });
      res.status(201).json(book);
    } catch (error) {
      console.error("Admin upload error:", error);
      res.status(500).json({ message: "Failed to upload" });
    }
  });

  app.delete("/api/admin/storage/:key", requireAdmin, async (req: Request, res: Response) => {
    try {
      const key = decodeURIComponent(req.params.key);
      const adapter = await getPrimaryStorageAdapter();
      if (!adapter) return res.status(503).json({ message: "Storage not configured" });
      await adapter.deleteObject(key);
      await db.delete(books).where(eq(books.sourceId, key));
      res.json({ deleted: key });
    } catch (error) {
      console.error("Admin delete storage error:", error);
      res.status(500).json({ message: "Failed to delete" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
