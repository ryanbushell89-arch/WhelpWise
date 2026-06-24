import { pgTable, text, serial, timestamp, integer, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { littersTable } from "./litters";

export const buyersTable = pgTable("buyers", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  contractSigned: text("contract_signed").notNull().default("false"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_buyers_user_id").on(t.userId),
]);

export const insertBuyerSchema = createInsertSchema(buyersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBuyer = z.infer<typeof insertBuyerSchema>;
export type Buyer = typeof buyersTable.$inferSelect;

export const puppiesTable = pgTable("puppies", {
  id: serial("id").primaryKey(),
  litterId: integer("litter_id").notNull().references(() => littersTable.id),
  buyerId: integer("buyer_id").references(() => buyersTable.id),
  name: text("name"),
  callName: text("call_name"),
  registeredName: text("registered_name"),
  collarColour: text("collar_colour"),
  sex: text("sex").notNull(),
  colour: text("colour"),
  markings: text("markings"),
  birthWeight: real("birth_weight"),
  birthTime: text("birth_time"),
  placentaPresent: text("placenta_present"),
  alive: text("alive").notNull().default("true"),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  collectionDate: text("collection_date"),
  // ─── Sale (per-puppy, since one buyer may purchase multiple puppies at different prices) ───
  salePrice: real("sale_price"),
  depositAmount: real("deposit_amount"),
  depositPaid: text("deposit_paid").notNull().default("false"),
  balanceAmount: real("balance_amount"),
  balancePaid: text("balance_paid").notNull().default("false"),
  saleDate: text("sale_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_puppies_litter_id").on(t.litterId),
  index("idx_puppies_buyer_id").on(t.buyerId),
  index("idx_puppies_alive").on(t.alive),
]);

export const insertPuppySchema = createInsertSchema(puppiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPuppy = z.infer<typeof insertPuppySchema>;
export type Puppy = typeof puppiesTable.$inferSelect;

export const weightEntriesTable = pgTable("weight_entries", {
  id: serial("id").primaryKey(),
  puppyId: integer("puppy_id").notNull().references(() => puppiesTable.id),
  date: text("date").notNull(),
  weightGrams: real("weight_grams").notNull(),
  notes: text("notes"),
  alertTriggered: text("alert_triggered").notNull().default("false"),
  overrideReason: text("override_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_weight_entries_puppy_id").on(t.puppyId),
  index("idx_weight_entries_date").on(t.date),
]);

export const insertWeightEntrySchema = createInsertSchema(weightEntriesTable).omit({ id: true, createdAt: true });
export type InsertWeightEntry = z.infer<typeof insertWeightEntrySchema>;
export type WeightEntry = typeof weightEntriesTable.$inferSelect;

// ─── Worming Records ──────────────────────────────────────────────────────────
export const puppyWormingTable = pgTable("puppy_worming", {
  id: serial("id").primaryKey(),
  puppyId: integer("puppy_id").notNull().references(() => puppiesTable.id),
  date: text("date").notNull(),
  product: text("product").notNull(),
  dose: text("dose"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_puppy_worming_puppy_id").on(t.puppyId),
]);

export const insertPuppyWormingSchema = createInsertSchema(puppyWormingTable).omit({ id: true, createdAt: true });
export type InsertPuppyWorming = z.infer<typeof insertPuppyWormingSchema>;
export type PuppyWorming = typeof puppyWormingTable.$inferSelect;

// ─── Vaccination Records ───────────────────────────────────────────────────────
export const puppyVaccinationsTable = pgTable("puppy_vaccinations", {
  id: serial("id").primaryKey(),
  puppyId: integer("puppy_id").notNull().references(() => puppiesTable.id),
  date: text("date").notNull(),
  vaccineName: text("vaccine_name").notNull(),
  batchLot: text("batch_lot"),
  vet: text("vet"),
  nextDueDate: text("next_due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_puppy_vaccinations_puppy_id").on(t.puppyId),
]);

export const insertPuppyVaccinationSchema = createInsertSchema(puppyVaccinationsTable).omit({ id: true, createdAt: true });
export type InsertPuppyVaccination = z.infer<typeof insertPuppyVaccinationSchema>;
export type PuppyVaccination = typeof puppyVaccinationsTable.$inferSelect;

// ─── Puppy Documents ──────────────────────────────────────────────────────────
export const puppyDocumentsTable = pgTable("puppy_documents", {
  id: serial("id").primaryKey(),
  puppyId: integer("puppy_id").notNull().references(() => puppiesTable.id),
  docType: text("doc_type").notNull().default("other"),
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_puppy_documents_puppy_id").on(t.puppyId),
]);

export const insertPuppyDocumentSchema = createInsertSchema(puppyDocumentsTable).omit({ id: true, createdAt: true });
export type InsertPuppyDocument = z.infer<typeof insertPuppyDocumentSchema>;
export type PuppyDocument = typeof puppyDocumentsTable.$inferSelect;
