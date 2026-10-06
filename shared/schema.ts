import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, jsonb, index, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const books = pgTable("books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  author: text("author").notNull(),
  narrator: text("narrator"),
  description: text("description"),
  duration: integer("duration").notNull(), // duration in seconds
  coverImage: text("cover_image"),
  audioUrl: text("audio_url").notNull(),
  genre: text("genre"),
  publishedYear: integer("published_year"),
  source: text("source").notNull().default("local"), // Track which API/source this book came from
  sourceId: text("source_id"), // Original ID from the source API
  totalTime: text("total_time"), // Human readable duration (e.g., "11:35:00")
  language: text("language").default("English"),
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
});

export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof books.$inferSelect;

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Subscription tier enum values
export const SUBSCRIPTION_TIERS = ["free", "premium"] as const;
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[number];

// User table for multi-provider authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"), // For username/password auth
  authProvider: varchar("auth_provider").default("local"), // local, google, facebook, microsoft, auth0
  providerId: varchar("provider_id"), // ID from OAuth provider
  subscriptionTier: varchar("subscription_tier").default("free"), // free, premium
  stripeCustomerId: varchar("stripe_customer_id"), // Stripe customer ID
  stripeSubscriptionId: varchar("stripe_subscription_id"), // Active Stripe subscription ID
  subscriptionEndDate: timestamp("subscription_end_date"), // When subscription expires
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Listening history table for tracking user activity
export const listeningHistory = pgTable("listening_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookId: varchar("book_id").notNull(),
  bookTitle: text("book_title").notNull(),
  bookAuthor: text("book_author"),
  bookCover: text("book_cover"),
  currentTime: integer("current_time").notNull().default(0), // Progress in seconds
  totalDuration: integer("total_duration"), // Book duration in seconds
  lastPlayedAt: timestamp("last_played_at").defaultNow(),
  completedAt: timestamp("completed_at"), // When user finished the book
  playCount: integer("play_count").notNull().default(1),
}, (table) => [
  index("idx_listening_history_user").on(table.userId),
  index("idx_listening_history_last_played").on(table.lastPlayedAt),
]);

export const insertListeningHistorySchema = createInsertSchema(listeningHistory).omit({
  id: true,
  lastPlayedAt: true,
});

export type InsertListeningHistory = z.infer<typeof insertListeningHistorySchema>;
export type ListeningHistory = typeof listeningHistory.$inferSelect;

// User preferences for hyper-contextual UX
export const userPreferences = pgTable("user_preferences", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  defaultSpeed: real("default_speed").default(1),
  preferredSections: jsonb("preferred_sections").$type<string[]>().default([]), // e.g. ["continue-listening", "disability-voices", "trending", "new-arrivals"]
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

// Bookmark type for frontend use
export interface Bookmark {
  id: string;
  bookId: string;
  name: string;
  time: number; // time in seconds
  createdAt: string;
}

// Progress tracking type
export interface Progress {
  bookId: string;
  currentTime: number;
  lastPlayed: string;
}


// AccessiBooks @ Hospitals catalogue.
// This is deliberately separate from the playback-oriented `books` table so
// discovery, licensing and accessibility metadata can evolve independently.
export const hospitalCatalogueItems = pgTable("hospital_catalogue_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  author: text("author").notNull(),
  contributors: jsonb("contributors").$type<string[]>().default([]),
  description: text("description"),
  publicationYear: integer("publication_year"),
  publisher: text("publisher"),
  editionStatement: text("edition_statement"),
  oclcNumber: varchar("oclc_number", { length: 32 }),
  isbn10: varchar("isbn10", { length: 16 }),
  language: varchar("language", { length: 16 }).notNull().default("en"),
  audience: varchar("audience", { length: 32 }).notNull().default("general"),
  contentKind: varchar("content_kind", { length: 32 }).notNull().default("book"),
  primaryCollection: varchar("primary_collection", { length: 64 }).notNull().default("general"),
  genres: jsonb("genres").$type<string[]>().default([]),
  subjects: jsonb("subjects").$type<string[]>().default([]),
  hospitalTags: jsonb("hospital_tags").$type<string[]>().default([]),

  sourceProvider: varchar("source_provider", { length: 64 }).notNull(),
  sourceId: text("source_id"),
  sourceUrl: text("source_url").notNull(),
  coverImage: text("cover_image"),

  rightsStatus: varchar("rights_status", { length: 40 }).notNull().default("needs_review"),
  rightsJurisdiction: varchar("rights_jurisdiction", { length: 16 }).notNull().default("AU"),
  rightsNote: text("rights_note"),
  rightsVerifiedAt: timestamp("rights_verified_at"),

  availabilityStatus: varchar("availability_status", { length: 40 }).notNull().default("metadata_only"),
  availabilityNote: text("availability_note"),

  hasAudio: boolean("has_audio").notNull().default(false),
  hasEbook: boolean("has_ebook").notNull().default(false),
  hasHtml: boolean("has_html").notNull().default(false),
  hasPlainText: boolean("has_plain_text").notNull().default(false),
  hasPdf: boolean("has_pdf").notNull().default(false),
  hasDaisy: boolean("has_daisy").notNull().default(false),
  hasLargePrint: boolean("has_large_print").notNull().default(false),
  hasBraille: boolean("has_braille").notNull().default(false),
  transcriptAvailable: boolean("transcript_available").notNull().default(false),
  ttsFriendly: boolean("tts_friendly").notNull().default(false),

  // Accessibility claims supplied by publishers/vendors are evidence, not
  // independent AccessiBooks conformance testing.
  accessibilityClaims: jsonb("accessibility_claims").$type<Record<string, unknown>>().default({}),
  accessibilityClaimsSource: varchar("accessibility_claims_source", { length: 64 }).notNull().default("none"),
  accessibilityClaimsStatus: varchar("accessibility_claims_status", { length: 40 }).notNull().default("not_provided"),
  accessibilityClaimsUpdatedAt: timestamp("accessibility_claims_updated_at"),
  accessibilityTestStatus: varchar("accessibility_test_status", { length: 40 }).notNull().default("not_tested"),

  durationSeconds: integer("duration_seconds"),
  estimatedReadingMinutes: integer("estimated_reading_minutes"),
  isbn13: varchar("isbn13", { length: 20 }),
  commercialTitle: boolean("commercial_title").notNull().default(false),
  acquisitionStatus: varchar("acquisition_status", { length: 40 }).notNull().default("not_acquired"),

  // Denormalised field for simple, portable PostgreSQL search. Importers should
  // rebuild it whenever title/author/subject metadata changes.
  searchText: text("search_text").notNull(),

  // Clinical/patient-education material must never be implied to be reviewed
  // merely because it appears in a hospital distribution.
  clinicalInformation: boolean("clinical_information").notNull().default(false),
  clinicalReviewStatus: varchar("clinical_review_status", { length: 40 }).notNull().default("not_applicable"),
  clinicalReviewNote: text("clinical_review_note"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_hospital_catalogue_title").on(table.title),
  index("idx_hospital_catalogue_author").on(table.author),
  index("idx_hospital_catalogue_collection").on(table.primaryCollection),
  index("idx_hospital_catalogue_availability").on(table.availabilityStatus),
  index("idx_hospital_catalogue_rights").on(table.rightsStatus),
  index("idx_hospital_catalogue_source").on(table.sourceProvider),
  index("idx_hospital_catalogue_isbn13").on(table.isbn13),
  index("idx_hospital_catalogue_oclc").on(table.oclcNumber),
]);

export const insertHospitalCatalogueItemSchema = createInsertSchema(hospitalCatalogueItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type HospitalCatalogueItem = typeof hospitalCatalogueItems.$inferSelect;
export type InsertHospitalCatalogueItem = z.infer<typeof insertHospitalCatalogueItemSchema>;


export const hospitalCatalogueSources = pgTable("hospital_catalogue_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  catalogueItemId: varchar("catalogue_item_id").notNull().references(() => hospitalCatalogueItems.id, { onDelete: "cascade" }),
  sourceProvider: varchar("source_provider", { length: 64 }).notNull(),
  sourceId: text("source_id"),
  sourceUrl: text("source_url").notNull(),
  sourceCatalogueUrl: text("source_catalogue_url"),
  rightsStatus: varchar("rights_status", { length: 40 }).notNull().default("needs_review"),
  rightsJurisdiction: varchar("rights_jurisdiction", { length: 16 }).notNull().default("AU"),
  rightsNote: text("rights_note"),
  rightsVerifiedAt: timestamp("rights_verified_at"),
  availabilityStatus: varchar("availability_status", { length: 40 }).notNull().default("metadata_only"),
  formatUrls: jsonb("format_urls").$type<Record<string, string>>().default({}),
  hasAudio: boolean("has_audio").notNull().default(false),
  hasEbook: boolean("has_ebook").notNull().default(false),
  hasHtml: boolean("has_html").notNull().default(false),
  hasPlainText: boolean("has_plain_text").notNull().default(false),
  hasPdf: boolean("has_pdf").notNull().default(false),
  hasDaisy: boolean("has_daisy").notNull().default(false),
  rawMetadata: jsonb("raw_metadata").$type<Record<string, unknown>>().default({}),
  importedAt: timestamp("imported_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("uniq_hospital_catalogue_source_url").on(table.sourceProvider, table.sourceUrl),
  index("idx_hospital_catalogue_source_item").on(table.catalogueItemId),
  index("idx_hospital_catalogue_source_provider").on(table.sourceProvider),
  index("idx_hospital_catalogue_source_rights").on(table.rightsStatus),
]);

export const hospitalCatalogueIngestionRuns = pgTable("hospital_catalogue_ingestion_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceProvider: varchar("source_provider", { length: 64 }).notNull(),
  trigger: varchar("trigger", { length: 32 }).notNull().default("manual"),
  status: varchar("status", { length: 24 }).notNull().default("running"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  fetchedCount: integer("fetched_count").notNull().default(0),
  insertedCount: integer("inserted_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  skippedCount: integer("skipped_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  errors: jsonb("errors").$type<string[]>().default([]),
  notes: text("notes"),
}, (table) => [
  index("idx_hospital_ingestion_source").on(table.sourceProvider),
  index("idx_hospital_ingestion_started").on(table.startedAt),
]);

export type HospitalCatalogueSource = typeof hospitalCatalogueSources.$inferSelect;
export type InsertHospitalCatalogueSource = typeof hospitalCatalogueSources.$inferInsert;
export type HospitalCatalogueIngestionRun = typeof hospitalCatalogueIngestionRuns.$inferSelect;


export const hospitalCatalogueSuppliers = pgTable("hospital_catalogue_suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  supplierType: varchar("supplier_type", { length: 40 }).notNull().default("commercial"),
  websiteUrl: text("website_url"),
  integrationStatus: varchar("integration_status", { length: 32 }).notNull().default("planned"),
  supportsDiscovery: boolean("supports_discovery").notNull().default(false),
  supportsAvailability: boolean("supports_availability").notNull().default(false),
  supportsCheckout: boolean("supports_checkout").notNull().default(false),
  supportsInstitutionalLicensing: boolean("supports_institutional_licensing").notNull().default(false),
  supportsAccessibleFormats: boolean("supports_accessible_formats").notNull().default(false),
  configurationNote: text("configuration_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_hospital_supplier_type").on(table.supplierType),
  index("idx_hospital_supplier_status").on(table.integrationStatus),
]);

export const hospitalCatalogueAcquisitions = pgTable("hospital_catalogue_acquisitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  catalogueItemId: varchar("catalogue_item_id").notNull().references(() => hospitalCatalogueItems.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id").references(() => hospitalCatalogueSuppliers.id, { onDelete: "set null" }),
  supplierTitleId: text("supplier_title_id"),
  supplierUrl: text("supplier_url"),

  // Scope can represent a whole program, a health network, a hospital or another
  // contractually defined institutional group without storing patient data.
  scopeType: varchar("scope_type", { length: 32 }).notNull().default("program"),
  scopeKey: varchar("scope_key", { length: 120 }).notNull().default("accessibooks-hospitals"),

  acquisitionStatus: varchar("acquisition_status", { length: 40 }).notNull().default("under_review"),
  licenceModel: varchar("licence_model", { length: 48 }).notNull().default("unknown"),
  accessMode: varchar("access_mode", { length: 40 }).notNull().default("external"),
  territory: varchar("territory", { length: 16 }).notNull().default("AU"),

  formats: jsonb("formats").$type<string[]>().default([]),
  accessibilityFeatures: jsonb("accessibility_features").$type<string[]>().default([]),
  copiesOrSeats: integer("copies_or_seats"),
  concurrentUsers: integer("concurrent_users"),
  loanPeriodDays: integer("loan_period_days"),

  agreementReference: text("agreement_reference"),
  rightsBasis: varchar("rights_basis", { length: 48 }).notNull().default("commercial_licence"),
  rightsNote: text("rights_note"),
  termsUrl: text("terms_url"),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: text("verified_by"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_hospital_acquisition_item").on(table.catalogueItemId),
  index("idx_hospital_acquisition_supplier").on(table.supplierId),
  index("idx_hospital_acquisition_status").on(table.acquisitionStatus),
  index("idx_hospital_acquisition_scope").on(table.scopeType, table.scopeKey),
]);

export const hospitalCatalogueAccessRoutes = pgTable("hospital_catalogue_access_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  acquisitionId: varchar("acquisition_id").notNull().references(() => hospitalCatalogueAcquisitions.id, { onDelete: "cascade" }),
  format: varchar("format", { length: 32 }).notNull(),
  routeType: varchar("route_type", { length: 40 }).notNull().default("external_link"),
  url: text("url"),
  requiresAuthentication: boolean("requires_authentication").notNull().default(true),
  requiresLibraryCard: boolean("requires_library_card").notNull().default(false),
  drmProtected: boolean("drm_protected").notNull().default(false),
  downloadAllowed: boolean("download_allowed").notNull().default(false),
  offlineAllowed: boolean("offline_allowed").notNull().default(false),
  accessibleFormat: boolean("accessible_format").notNull().default(false),
  accessibilityFeatures: jsonb("accessibility_features").$type<string[]>().default([]),
  availabilityStatus: varchar("availability_status", { length: 40 }).notNull().default("not_verified"),
  lastVerifiedAt: timestamp("last_verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_hospital_access_route_acquisition").on(table.acquisitionId),
  index("idx_hospital_access_route_format").on(table.format),
  index("idx_hospital_access_route_status").on(table.availabilityStatus),
]);

export type HospitalCatalogueSupplier = typeof hospitalCatalogueSuppliers.$inferSelect;
export type HospitalCatalogueAcquisition = typeof hospitalCatalogueAcquisitions.$inferSelect;
export type HospitalCatalogueAccessRoute = typeof hospitalCatalogueAccessRoutes.$inferSelect;


// AccessiBooks @ Hospitals research and current-awareness layer.
// Kept separate from books so scholarly/news discovery, citation metrics and
// licensed full text cannot be confused with book acquisition or patient advice.
export const hospitalKnowledgeItems = pgTable("hospital_knowledge_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  kind: varchar("kind", { length: 32 }).notNull(), // scholarly_article, book_chapter, journal, news_article, magazine_article
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  abstract: text("abstract"),
  authors: jsonb("authors").$type<string[]>().default([]),
  publisher: text("publisher"),
  containerTitle: text("container_title"),
  publicationDate: timestamp("publication_date"),
  language: varchar("language", { length: 16 }).default("en"),

  doi: varchar("doi", { length: 255 }),
  issn: varchar("issn", { length: 32 }),
  isbn: varchar("isbn", { length: 20 }),
  pmid: varchar("pmid", { length: 32 }),
  sourceUrl: text("source_url").notNull(),
  canonicalUrl: text("canonical_url"),

  sourceProvider: varchar("source_provider", { length: 64 }).notNull(),
  sourceRecordId: text("source_record_id"),
  sourceMetadata: jsonb("source_metadata").$type<Record<string, unknown>>().default({}),

  openAccess: boolean("open_access").notNull().default(false),
  fullTextStatus: varchar("full_text_status", { length: 40 }).notNull().default("metadata_only"),
  fullTextFormat: varchar("full_text_format", { length: 32 }),
  entitlementStatus: varchar("entitlement_status", { length: 40 }).notNull().default("not_verified"),
  licenceStatus: varchar("licence_status", { length: 40 }).notNull().default("not_verified"),
  rightsNote: text("rights_note"),

  citationCount: integer("citation_count"),
  journalImpactFactor: real("journal_impact_factor"),
  metricsSource: varchar("metrics_source", { length: 64 }),
  metricsVerifiedAt: timestamp("metrics_verified_at"),

  // Clinical/research records are not patient education by default.
  audience: varchar("audience", { length: 32 }).notNull().default("staff_research"),
  patientFacing: boolean("patient_facing").notNull().default(false),
  clinicalUseStatus: varchar("clinical_use_status", { length: 40 }).notNull().default("research_reference_only"),
  clinicalReviewStatus: varchar("clinical_review_status", { length: 40 }).notNull().default("not_reviewed"),

  searchText: text("search_text").notNull(),
  importedAt: timestamp("imported_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_hospital_knowledge_kind").on(table.kind),
  index("idx_hospital_knowledge_doi").on(table.doi),
  index("idx_hospital_knowledge_source").on(table.sourceProvider),
  index("idx_hospital_knowledge_date").on(table.publicationDate),
  index("idx_hospital_knowledge_patient").on(table.patientFacing),
]);

export const hospitalKnowledgeSources = pgTable("hospital_knowledge_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  knowledgeItemId: varchar("knowledge_item_id").notNull().references(() => hospitalKnowledgeItems.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 64 }).notNull(),
  providerRecordId: text("provider_record_id"),
  url: text("url").notNull(),
  role: varchar("role", { length: 40 }).notNull().default("metadata"), // metadata, full_text, metrics, news
  accessStatus: varchar("access_status", { length: 40 }).notNull().default("metadata_only"),
  entitlementRequired: boolean("entitlement_required").notNull().default(false),
  rawMetadata: jsonb("raw_metadata").$type<Record<string, unknown>>().default({}),
  lastVerifiedAt: timestamp("last_verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("uniq_hospital_knowledge_source").on(table.provider, table.url),
  index("idx_hospital_knowledge_source_item").on(table.knowledgeItemId),
  index("idx_hospital_knowledge_source_role").on(table.role),
]);

export type HospitalKnowledgeItem = typeof hospitalKnowledgeItems.$inferSelect;
export type HospitalKnowledgeSource = typeof hospitalKnowledgeSources.$inferSelect;
