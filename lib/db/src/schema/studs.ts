import { pgTable, text, serial, timestamp, integer, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dogsTable } from "./dogs";

export const studListingsTable = pgTable("stud_listings", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  dogId: integer("dog_id").notNull().references(() => dogsTable.id),
  studFee: real("stud_fee"),
  currency: text("currency").notNull().default("USD"),
  country: text("country"),
  location: text("location"),
  description: text("description"),
  healthTested: text("health_tested").notNull().default("false"),
  active: text("active").notNull().default("true"),
  expiresAt: text("expires_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_stud_listings_user_id").on(t.userId),
  index("idx_stud_listings_dog_id").on(t.dogId),
  index("idx_stud_listings_active").on(t.active),
]);

export const insertStudListingSchema = createInsertSchema(studListingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudListing = z.infer<typeof insertStudListingSchema>;
export type StudListing = typeof studListingsTable.$inferSelect;
