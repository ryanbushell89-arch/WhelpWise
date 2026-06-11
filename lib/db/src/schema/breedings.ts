import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dogsTable } from "./dogs";

export const breedingsTable = pgTable("breedings", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  sireId: integer("sire_id").notNull().references(() => dogsTable.id),
  damId: integer("dam_id").notNull().references(() => dogsTable.id),
  date: text("date").notNull(),
  method: text("method").notNull(),
  tieDuration: integer("tie_duration"),
  notes: text("notes"),
  ultrasoundDate: text("ultrasound_date"),
  ultrasoundCompleted: text("ultrasound_completed").notNull().default("false"),
  ultrasoundNotes: text("ultrasound_notes"),
  xrayDate: text("xray_date"),
  xrayCompleted: text("xray_completed").notNull().default("false"),
  xrayPuppyCount: integer("xray_puppy_count"),
  xrayNotes: text("xray_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_breedings_user_id").on(t.userId),
  index("idx_breedings_sire_id").on(t.sireId),
  index("idx_breedings_dam_id").on(t.damId),
  index("idx_breedings_date").on(t.date),
]);

export const insertBreedingSchema = createInsertSchema(breedingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBreeding = z.infer<typeof insertBreedingSchema>;
export type Breeding = typeof breedingsTable.$inferSelect;
