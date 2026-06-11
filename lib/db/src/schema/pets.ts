import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const familyPetsTable = pgTable("family_pets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  species: text("species").notNull().default("dog"), // dog | cat | rabbit | guinea_pig | bird | reptile | horse | other
  breed: text("breed"),
  sex: text("sex"), // male | female | unknown
  dob: text("dob"), // YYYY-MM-DD
  colour: text("colour"),
  microchip: text("microchip"),
  vetName: text("vet_name"),
  vetPhone: text("vet_phone"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  status: text("status").notNull().default("alive"), // alive | deceased
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFamilyPetSchema = createInsertSchema(familyPetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFamilyPet = z.infer<typeof insertFamilyPetSchema>;
export type FamilyPet = typeof familyPetsTable.$inferSelect;

// ─── Vaccinations ─────────────────────────────────────────────────────────────
export const petVaccinationsTable = pgTable("pet_vaccinations", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull().references(() => familyPetsTable.id, { onDelete: "cascade" }),
  vaccine: text("vaccine").notNull(),
  dateGiven: text("date_given"), // YYYY-MM-DD
  nextDueDate: text("next_due_date"), // YYYY-MM-DD
  vet: text("vet"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPetVaccinationSchema = createInsertSchema(petVaccinationsTable).omit({ id: true, createdAt: true });
export type InsertPetVaccination = z.infer<typeof insertPetVaccinationSchema>;
export type PetVaccination = typeof petVaccinationsTable.$inferSelect;

// ─── Vet Visits ───────────────────────────────────────────────────────────────
export const petVetVisitsTable = pgTable("pet_vet_visits", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull().references(() => familyPetsTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  reason: text("reason").notNull(),
  vet: text("vet"),
  notes: text("notes"),
  cost: text("cost"), // stored as decimal string
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPetVetVisitSchema = createInsertSchema(petVetVisitsTable).omit({ id: true, createdAt: true });
export type InsertPetVetVisit = z.infer<typeof insertPetVetVisitSchema>;
export type PetVetVisit = typeof petVetVisitsTable.$inferSelect;
