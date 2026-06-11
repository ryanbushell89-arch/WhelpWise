import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dogsTable } from "./dogs";
import { breedingsTable } from "./breedings";

export const littersTable = pgTable("litters", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  sireId: integer("sire_id").references(() => dogsTable.id),
  damId: integer("dam_id").references(() => dogsTable.id),
  breedingId: integer("breeding_id").references(() => breedingsTable.id),
  dob: text("dob"),
  totalBorn: integer("total_born"),
  liveMales: integer("live_males"),
  liveFemales: integer("live_females"),
  stillborn: integer("stillborn"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  status: text("status").notNull().default("expected"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_litters_user_id").on(t.userId),
  index("idx_litters_status").on(t.status),
  index("idx_litters_sire_id").on(t.sireId),
  index("idx_litters_dam_id").on(t.damId),
]);

export const insertLitterSchema = createInsertSchema(littersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLitter = z.infer<typeof insertLitterSchema>;
export type Litter = typeof littersTable.$inferSelect;

// ─── Whelping Records ─────────────────────────────────────────────────────────
export const whelpingRecordsTable = pgTable("whelping_records", {
  id: serial("id").primaryKey(),
  litterId: integer("litter_id").notNull().references(() => littersTable.id),
  startTime: text("start_time"),
  endTime: text("end_time"),
  complications: text("complications"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_whelping_records_litter_id").on(t.litterId),
]);

export const insertWhelpingRecordSchema = createInsertSchema(whelpingRecordsTable).omit({ id: true, createdAt: true });
export type InsertWhelpingRecord = z.infer<typeof insertWhelpingRecordSchema>;
export type WhelpingRecord = typeof whelpingRecordsTable.$inferSelect;

// ─── Whelping Documents ───────────────────────────────────────────────────────
export const whelpingDocumentsTable = pgTable("whelping_documents", {
  id: serial("id").primaryKey(),
  litterId: integer("litter_id").notNull().references(() => littersTable.id),
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_whelping_docs_litter_id").on(t.litterId),
]);

export const insertWhelpingDocumentSchema = createInsertSchema(whelpingDocumentsTable).omit({ id: true, createdAt: true });
export type InsertWhelpingDocument = z.infer<typeof insertWhelpingDocumentSchema>;
export type WhelpingDocument = typeof whelpingDocumentsTable.$inferSelect;
