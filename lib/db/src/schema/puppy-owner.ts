import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { puppiesTable, buyersTable } from "./puppies";

// ─── Invitations ──────────────────────────────────────────────────────────────
export const puppyOwnerInvitesTable = pgTable("puppy_owner_invites", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  puppyId: integer("puppy_id").notNull().references(() => puppiesTable.id),
  buyerId: integer("buyer_id").references(() => buyersTable.id),
  breederUserId: text("breeder_user_id").notNull().references(() => usersTable.id),
  email: text("email").notNull(),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_invite_token").on(t.token),
  index("idx_invite_puppy_id").on(t.puppyId),
  index("idx_invite_breeder").on(t.breederUserId),
]);

export const insertPuppyOwnerInviteSchema = createInsertSchema(puppyOwnerInvitesTable).omit({ id: true, createdAt: true });
export type InsertPuppyOwnerInvite = z.infer<typeof insertPuppyOwnerInviteSchema>;
export type PuppyOwnerInvite = typeof puppyOwnerInvitesTable.$inferSelect;

// ─── Accounts (Clerk userId → puppy link) ────────────────────────────────────
export const puppyOwnerAccountsTable = pgTable("puppy_owner_accounts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => usersTable.id),
  puppyId: integer("puppy_id").notNull().references(() => puppiesTable.id),
  buyerId: integer("buyer_id").references(() => buyersTable.id),
  breederUserId: text("breeder_user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_poa_user_id").on(t.userId),
  index("idx_poa_puppy_id").on(t.puppyId),
  index("idx_poa_breeder_user_id").on(t.breederUserId),
]);

export const insertPuppyOwnerAccountSchema = createInsertSchema(puppyOwnerAccountsTable).omit({ id: true, createdAt: true });
export type InsertPuppyOwnerAccount = z.infer<typeof insertPuppyOwnerAccountSchema>;
export type PuppyOwnerAccount = typeof puppyOwnerAccountsTable.$inferSelect;

// ─── Chat Conversations ───────────────────────────────────────────────────────
export const chatConversationsTable = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  puppyId: integer("puppy_id").notNull().references(() => puppiesTable.id),
  breederUserId: text("breeder_user_id").notNull().references(() => usersTable.id),
  ownerUserId: text("owner_user_id").notNull().references(() => usersTable.id),
  unreadBreeder: integer("unread_breeder").notNull().default(0),
  unreadOwner: integer("unread_owner").notNull().default(0),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_conv_breeder").on(t.breederUserId),
  index("idx_conv_owner").on(t.ownerUserId),
  index("idx_conv_puppy").on(t.puppyId),
]);

export type ChatConversation = typeof chatConversationsTable.$inferSelect;

// ─── Chat Messages (AES-256-GCM encrypted at rest) ───────────────────────────
export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => chatConversationsTable.id),
  senderUserId: text("sender_user_id").notNull().references(() => usersTable.id),
  senderRole: text("sender_role").notNull(),
  encryptedContent: text("encrypted_content").notNull(),
  iv: text("iv").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_msg_conversation_id").on(t.conversationId),
  index("idx_msg_sent_at").on(t.sentAt),
]);

export type ChatMessage = typeof chatMessagesTable.$inferSelect;
