import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { breedsTable } from "./breeds";

export const dogsTable = pgTable("dogs", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  registeredName: text("registered_name").notNull(),
  callName: text("call_name").notNull(),
  breedId: integer("breed_id").references(() => breedsTable.id),
  sex: text("sex").notNull(),
  dob: text("dob"),
  colour: text("colour"),
  microchip: text("microchip"),
  registrationNumber: text("registration_number"),
  sireId: integer("sire_id"),
  damId: integer("dam_id"),
  visibility: text("visibility").notNull().default("private"),
  photoUrl: text("photo_url"),
  status: text("status").notNull().default("active"),
  isExternal: text("is_external").notNull().default("false"),
  inKennel: text("in_kennel").notNull().default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_dogs_user_id").on(t.userId),
  index("idx_dogs_sire_id").on(t.sireId),
  index("idx_dogs_dam_id").on(t.damId),
  index("idx_dogs_breed_id").on(t.breedId),
  index("idx_dogs_status").on(t.status),
  index("idx_dogs_is_external").on(t.isExternal),
]);

export const insertDogSchema = createInsertSchema(dogsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDog = z.infer<typeof insertDogSchema>;
export type Dog = typeof dogsTable.$inferSelect;

// ─── Health Test Results ──────────────────────────────────────────────────────
export const healthTestResultsTable = pgTable("health_test_results", {
  id: serial("id").primaryKey(),
  dogId: integer("dog_id").notNull().references(() => dogsTable.id),
  testName: text("test_name").notNull(),
  result: text("result").notNull(),
  date: text("date"),
  laboratory: text("laboratory"),
  certificateUrl: text("certificate_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_health_tests_dog_id").on(t.dogId),
]);

export const insertHealthTestResultSchema = createInsertSchema(healthTestResultsTable).omit({ id: true, createdAt: true });
export type InsertHealthTestResult = z.infer<typeof insertHealthTestResultSchema>;
export type HealthTestResult = typeof healthTestResultsTable.$inferSelect;

// ─── Heat Cycles ──────────────────────────────────────────────────────────────
export const heatCyclesTable = pgTable("heat_cycles", {
  id: serial("id").primaryKey(),
  dogId: integer("dog_id").notNull().references(() => dogsTable.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_heat_cycles_dog_id").on(t.dogId),
]);

export const insertHeatCycleSchema = createInsertSchema(heatCyclesTable).omit({ id: true, createdAt: true });
export type InsertHeatCycle = z.infer<typeof insertHeatCycleSchema>;
export type HeatCycle = typeof heatCyclesTable.$inferSelect;

// ─── Progesterone Readings ────────────────────────────────────────────────────
export const progesteroneReadingsTable = pgTable("progesterone_readings", {
  id: serial("id").primaryKey(),
  dogId: integer("dog_id").notNull().references(() => dogsTable.id),
  date: text("date").notNull(),
  value: text("value").notNull(),
  units: text("units").notNull(),
  laboratory: text("laboratory"),
  ovulationPredicted: text("ovulation_predicted"),
  recommendation: text("recommendation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_progesterone_dog_id").on(t.dogId),
]);

export const insertProgesteroneReadingSchema = createInsertSchema(progesteroneReadingsTable).omit({ id: true, createdAt: true });
export type InsertProgesteroneReading = z.infer<typeof insertProgesteroneReadingSchema>;
export type ProgesteroneReading = typeof progesteroneReadingsTable.$inferSelect;
