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
