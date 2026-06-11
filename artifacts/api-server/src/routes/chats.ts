import { Router } from "express";
import { db } from "@workspace/db";
import {
  chatConversationsTable,
  chatMessagesTable,
  usersTable,
  puppiesTable,
} from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { encryptMessage, decryptMessage } from "../lib/encryption";

const router = Router();

router.use(requireAuth);

async function getUserRole(userId: string): Promise<string> {
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  return user?.role ?? "breeder";
}

async function getConversationWithAccess(
  convId: number,
  userId: string,
): Promise<typeof chatConversationsTable.$inferSelect | null> {
  const [conv] = await db
    .select()
    .from(chatConversationsTable)
    .where(eq(chatConversationsTable.id, convId));
  if (!conv) return null;
  if (conv.breederUserId !== userId && conv.ownerUserId !== userId) return null;
  return conv;
}

// GET /chats — list conversations (breeders see all theirs; owners see their one)
router.get("/chats", async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const role = await getUserRole(userId);

  if (role === "puppy_owner") {
    const rows = await db
      .select({
        id: chatConversationsTable.id,
        puppyId: chatConversationsTable.puppyId,
        puppyName: puppiesTable.name,
        puppyPhotoUrl: puppiesTable.photoUrl,
        breederUserId: chatConversationsTable.breederUserId,
        breederEmail: usersTable.email,
        unreadOwner: chatConversationsTable.unreadOwner,
        lastMessageAt: chatConversationsTable.lastMessageAt,
        createdAt: chatConversationsTable.createdAt,
      })
      .from(chatConversationsTable)
      .leftJoin(puppiesTable, eq(chatConversationsTable.puppyId, puppiesTable.id))
      .leftJoin(usersTable, eq(chatConversationsTable.breederUserId, usersTable.id))
      .where(eq(chatConversationsTable.ownerUserId, userId));

    res.json(rows);
    return;
  }

  // Breeder: all conversations
  const rows = await db
    .select({
      id: chatConversationsTable.id,
      puppyId: chatConversationsTable.puppyId,
      puppyName: puppiesTable.name,
      puppyPhotoUrl: puppiesTable.photoUrl,
      ownerUserId: chatConversationsTable.ownerUserId,
      ownerEmail: usersTable.email,
      unreadBreeder: chatConversationsTable.unreadBreeder,
      lastMessageAt: chatConversationsTable.lastMessageAt,
      createdAt: chatConversationsTable.createdAt,
    })
    .from(chatConversationsTable)
    .leftJoin(puppiesTable, eq(chatConversationsTable.puppyId, puppiesTable.id))
    .leftJoin(usersTable, eq(chatConversationsTable.ownerUserId, usersTable.id))
    .where(eq(chatConversationsTable.breederUserId, userId))
    .orderBy(desc(chatConversationsTable.lastMessageAt));

  res.json(rows);
});

// GET /chats/:id — conversation detail
router.get("/chats/:id", async (req, res): Promise<void> => {
  const userId = (req as unknown as AuthenticatedRequest).userId;
  const convId = parseInt(req.params.id as string, 10);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }

  const conv = await getConversationWithAccess(convId, userId);
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const [puppy] = await db.select({ name: puppiesTable.name, photoUrl: puppiesTable.photoUrl })
    .from(puppiesTable).where(eq(puppiesTable.id, conv.puppyId));

  const [breeder] = await db.select({ email: usersTable.email })
    .from(usersTable).where(eq(usersTable.id, conv.breederUserId));

  const [owner] = await db.select({ email: usersTable.email })
    .from(usersTable).where(eq(usersTable.id, conv.ownerUserId));

  res.json({ ...conv, puppyName: puppy?.name, puppyPhotoUrl: puppy?.photoUrl, breederEmail: breeder?.email, ownerEmail: owner?.email });
});

// GET /chats/:id/messages — get messages (decrypted)
router.get("/chats/:id/messages", async (req, res): Promise<void> => {
  const userId = (req as unknown as AuthenticatedRequest).userId;
  const convId = parseInt(req.params.id as string, 10);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }

  const conv = await getConversationWithAccess(convId, userId);
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.conversationId, convId))
    .orderBy(chatMessagesTable.sentAt);

  const decrypted = messages.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderUserId: m.senderUserId,
    senderRole: m.senderRole,
    content: decryptMessage(m.encryptedContent, m.iv),
    readAt: m.readAt,
    sentAt: m.sentAt,
    isOwnMessage: m.senderUserId === userId,
  }));

  // Mark messages from the other party as read
  const isBreeder = conv.breederUserId === userId;
  const otherRole = isBreeder ? "puppy_owner" : "breeder";

  await db
    .update(chatMessagesTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(chatMessagesTable.conversationId, convId),
        eq(chatMessagesTable.senderRole, otherRole),
        sql`${chatMessagesTable.readAt} IS NULL`,
      ),
    );

  // Reset unread count for this user
  if (isBreeder) {
    await db.update(chatConversationsTable)
      .set({ unreadBreeder: 0 })
      .where(eq(chatConversationsTable.id, convId));
  } else {
    await db.update(chatConversationsTable)
      .set({ unreadOwner: 0 })
      .where(eq(chatConversationsTable.id, convId));
  }

  res.json(decrypted);
});

// POST /chats/:id/messages — send a message (encrypted)
router.post("/chats/:id/messages", async (req, res): Promise<void> => {
  const userId = (req as unknown as AuthenticatedRequest).userId;
  const convId = parseInt(req.params.id as string, 10);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }

  const conv = await getConversationWithAccess(convId, userId);
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const { content } = req.body as { content?: string };
  if (typeof content !== "string" || content.trim().length === 0 || content.length > 5000) {
    res.status(400).json({ error: "Message content required (1–5000 characters)" });
    return;
  }

  const senderRole = conv.breederUserId === userId ? "breeder" : "puppy_owner";
  const { encryptedContent, iv } = encryptMessage(content);
  const now = new Date();

  const [msg] = await db
    .insert(chatMessagesTable)
    .values({
      conversationId: convId,
      senderUserId: userId,
      senderRole,
      encryptedContent,
      iv,
      sentAt: now,
    })
    .returning();

  // Bump unread count for the recipient and update lastMessageAt
  if (senderRole === "breeder") {
    await db.update(chatConversationsTable)
      .set({ unreadOwner: sql`${chatConversationsTable.unreadOwner} + 1`, lastMessageAt: now })
      .where(eq(chatConversationsTable.id, convId));
  } else {
    await db.update(chatConversationsTable)
      .set({ unreadBreeder: sql`${chatConversationsTable.unreadBreeder} + 1`, lastMessageAt: now })
      .where(eq(chatConversationsTable.id, convId));
  }

  res.status(201).json({
    id: msg.id,
    conversationId: msg.conversationId,
    senderUserId: msg.senderUserId,
    senderRole: msg.senderRole,
    content,
    readAt: msg.readAt,
    sentAt: msg.sentAt,
    isOwnMessage: true,
  });
});

export default router;
