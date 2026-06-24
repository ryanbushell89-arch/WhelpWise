import { pgTable, text, serial, timestamp, integer, real, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { littersTable } from "./litters";

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  litterId: integer("litter_id").references(() => littersTable.id),
  category: text("category").notNull().default("other"),
  description: text("description"),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_expenses_user_id").on(t.userId),
  index("idx_expenses_litter_id").on(t.litterId),
  index("idx_expenses_date").on(t.date),
]);

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;

// ─── Opening Balances ───────────────────────────────────────────────────────────
// One manual "starting position" adjustment per user per fiscal year, for
// breeders migrating from another bookkeeping system mid-history.
export const openingBalancesTable = pgTable("opening_balances", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  year: integer("year").notNull(),
  income: real("income").notNull().default(0),
  expenses: real("expenses").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_opening_balances_user_id").on(t.userId),
  uniqueIndex("idx_opening_balances_user_year").on(t.userId, t.year),
]);

export const insertOpeningBalanceSchema = createInsertSchema(openingBalancesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOpeningBalance = z.infer<typeof insertOpeningBalanceSchema>;
export type OpeningBalance = typeof openingBalancesTable.$inferSelect;
