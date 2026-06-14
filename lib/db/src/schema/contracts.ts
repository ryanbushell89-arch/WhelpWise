import { pgTable, text, serial, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { puppiesTable } from "./puppies";
import { studListingsTable } from "./studs";

// ─── Contract Templates ───────────────────────────────────────────────────────
export const contractTemplatesTable = pgTable("contract_templates", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  // puppy_sale_limited | puppy_sale_main | stud | custom
  category: text("category").notNull().default("custom"),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  isActive: text("is_active").notNull().default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertContractTemplateSchema = createInsertSchema(contractTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContractTemplate = z.infer<typeof insertContractTemplateSchema>;
export type ContractTemplate = typeof contractTemplatesTable.$inferSelect;

// ─── Waiting List ─────────────────────────────────────────────────────────────
export const waitingListTable = pgTable("waiting_list", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),

  // Preferences
  breedPreference: text("breed_preference"),
  sexPreference: text("sex_preference"),       // male | female | either
  colourPreference: text("colour_preference"),
  litterPreference: text("litter_preference"), // free text – e.g. "Summer 2025 litter"
  timeframe: text("timeframe"),                // e.g. "ASAP", "end of year"

  // Financials
  depositPaid: text("deposit_paid").notNull().default("false"),
  depositAmount: text("deposit_amount"),

  // Admin
  priority: integer("priority"),
  notes: text("notes"),
  status: text("status").notNull().default("waiting"), // waiting | assigned | completed | cancelled
  puppyId: integer("puppy_id"),                // set when assigned to a specific puppy

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWaitingListSchema = createInsertSchema(waitingListTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWaitingListEntry = z.infer<typeof insertWaitingListSchema>;
export type WaitingListEntry = typeof waitingListTable.$inferSelect;

// ─── Contracts ────────────────────────────────────────────────────────────────
export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  type: text("type").notNull(),   // puppy_sale_limited | puppy_sale_main | stud
  // draft | sent | viewed | signed | rejected | completed
  status: text("status").notNull().default("draft"),

  // Template linkage
  templateId: integer("template_id").references(() => contractTemplatesTable.id),
  buyerId: integer("buyer_id"),

  // Links
  puppyId: integer("puppy_id"),
  studListingId: integer("stud_listing_id"),
  waitingListId: integer("waiting_list_id"),

  // Buyer / Party details (pre-filled from waiting list or entered manually)
  buyerName: text("buyer_name"),
  buyerEmail: text("buyer_email"),
  buyerPhone: text("buyer_phone"),
  buyerAddress: text("buyer_address"),

  // For stud contracts: the bitch owner details
  bitchOwnerName: text("bitch_owner_name"),
  bitchOwnerEmail: text("bitch_owner_email"),
  bitchOwnerPhone: text("bitch_owner_phone"),
  bitchOwnerAddress: text("bitch_owner_address"),
  bitchName: text("bitch_name"),
  bitchRegNumber: text("bitch_reg_number"),
  bitchBreed: text("bitch_breed"),

  // Financials
  salePrice: text("sale_price"),
  depositAmount: text("deposit_amount"),
  balanceDue: text("balance_due"),
  balanceDueDate: text("balance_due_date"),
  studFee: text("stud_fee"),
  studFeePaymentTerms: text("stud_fee_payment_terms"),

  // Terms
  specialConditions: text("special_conditions"),
  returnPolicy: text("return_policy"),
  healthGuarantee: text("health_guarantee"),

  // Files
  templateUrl: text("template_url"),          // uploaded PDF/DOCX template
  signedContractUrl: text("signed_contract_url"),

  notes: text("notes"),
  contractDate: text("contract_date"),        // YYYY-MM-DD

  // Signing workflow
  sentAt: timestamp("sent_at", { withTimezone: true }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  signatureImageUrl: text("signature_image_url"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  signerIp: text("signer_ip"),
  signerUserAgent: text("signer_user_agent"),

  // Secure token for buyer signing link (no account required)
  buyerAccessToken: text("buyer_access_token"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("idx_contracts_buyer_token").on(t.buyerAccessToken),
]);

export const insertContractSchema = createInsertSchema(contractsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contractsTable.$inferSelect;
