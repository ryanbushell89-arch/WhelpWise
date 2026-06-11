import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const breedsTable = pgTable("breeds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  group: text("group"),
});

export const insertBreedSchema = createInsertSchema(breedsTable).omit({ id: true });
export type InsertBreed = z.infer<typeof insertBreedSchema>;
export type Breed = typeof breedsTable.$inferSelect;

// ─── Breed Health Test Requirements ──────────────────────────────────────────
export const breedHealthTestsTable = pgTable("breed_health_tests", {
  id: serial("id").primaryKey(),
  breedId: serial("breed_id").notNull().references(() => breedsTable.id),
  testName: text("test_name").notNull(),
  required: text("required").notNull().default("false"),
  description: text("description"),
});

export const insertBreedHealthTestSchema = createInsertSchema(breedHealthTestsTable).omit({ id: true });
export type InsertBreedHealthTest = z.infer<typeof insertBreedHealthTestSchema>;
export type BreedHealthTest = typeof breedHealthTestsTable.$inferSelect;
