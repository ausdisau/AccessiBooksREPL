import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, jsonb, index } from "drizzle-orm/pg-core";
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

// Session storage table for Replit Auth
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
  authProvider: varchar("auth_provider").default("local"), // local, google, facebook, microsoft, auth0, replit
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
