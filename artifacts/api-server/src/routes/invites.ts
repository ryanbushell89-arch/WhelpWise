import { Router } from "express";
import { randomBytes } from "node:crypto";
import { db } from "@workspace/db";
import {
  puppyOwnerInvitesTable,
  puppyOwnerAccountsTable,
  chatConversationsTable,
  usersTable,
  puppiesTable,
  littersTable,
  buyersTable,
} from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request } from "express";
import { sendInviteEmail } from "../lib/email";

function getBaseUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

// ─── Public: check token info (no auth required) ─────────────────────────────
export const publicInvitesRouter = Router();

publicInvitesRouter.get("/invites/:token", async (req, res): Promise<void> => {
  const token = req.params.token as string;

  const [invite] = await db
    .select({
      id: puppyOwnerInvitesTable.id,
      status: puppyOwnerInvitesTable.status,
      expiresAt: puppyOwnerInvitesTable.expiresAt,
      email: puppyOwnerInvitesTable.email,
      puppyName: puppiesTable.name,
      puppyColour: puppiesTable.colour,
      puppySex: puppiesTable.sex,
      puppyPhotoUrl: puppiesTable.photoUrl,
      breederUserId: puppyOwnerInvitesTable.breederUserId,
      breederEmail: usersTable.email,
    })
    .from(puppyOwnerInvitesTable)
    .leftJoin(puppiesTable, eq(puppyOwnerInvitesTable.puppyId, puppiesTable.id))
    .leftJoin(usersTable, eq(puppyOwnerInvitesTable.breederUserId, usersTable.id))
    .where(eq(puppyOwnerInvitesTable.token, token));

  if (!invite) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }

  if (new Date() > new Date(invite.expiresAt)) {
    res.json({ ...invite, status: "expired" });
    return;
  }

  res.json(invite);
});

// ─── Auth-only: accept invitation ────────────────────────────────────────────
export const authInvitesRouter = Router();

authInvitesRouter.post("/invites/:token/accept", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const token = req.params.token as string;

  const [invite] = await db
    .select()
    .from(puppyOwnerInvitesTable)
    .where(eq(puppyOwnerInvitesTable.token, token));

  if (!invite) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }
  if (invite.status === "accepted") {
    res.status(409).json({ error: "Invite already accepted", code: "ALREADY_ACCEPTED" });
    return;
  }
  if (invite.status === "expired" || new Date() > new Date(invite.expiresAt)) {
    res.status(410).json({ error: "Invite has expired" });
    return;
  }
  if (invite.breederUserId === userId) {
    res.status(400).json({ error: "You cannot accept your own invitation" });
    return;
  }

  // Check if this user already has an account (prevents double-accept)
  const [existingAccount] = await db
    .select()
    .from(puppyOwnerAccountsTable)
    .where(eq(puppyOwnerAccountsTable.userId, userId));
  if (existingAccount) {
    res.status(409).json({ error: "You already have a linked puppy account", code: "ALREADY_LINKED" });
    return;
  }

  // Atomically: set role, create account, mark invite accepted, create conversation
  await db.update(usersTable).set({ role: "puppy_owner" }).where(eq(usersTable.id, userId));

  await db.insert(puppyOwnerAccountsTable).values({
    userId,
    puppyId: invite.puppyId,
    buyerId: invite.buyerId ?? null,
    breederUserId: invite.breederUserId,
  });

  await db
    .update(puppyOwnerInvitesTable)
    .set({ status: "accepted" })
    .where(eq(puppyOwnerInvitesTable.token, token));

  // Create the chat conversation between owner and breeder
  const [existingConv] = await db
    .select()
    .from(chatConversationsTable)
    .where(
      and(
        eq(chatConversationsTable.puppyId, invite.puppyId),
        eq(chatConversationsTable.breederUserId, invite.breederUserId),
      ),
    );

  if (!existingConv) {
    await db.insert(chatConversationsTable).values({
      puppyId: invite.puppyId,
      breederUserId: invite.breederUserId,
      ownerUserId: userId,
    });
  }

  res.json({ success: true });
});

// ─── Breeder + subscription: create invitation ────────────────────────────────
export const breederInvitesRouter = Router();

breederInvitesRouter.post("/puppies/:puppyId/invite", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const puppyId = parseInt(req.params.puppyId as string, 10);

  if (isNaN(puppyId)) {
    res.status(400).json({ error: "Invalid puppy ID" });
    return;
  }

  // Verify the breeder owns this puppy (puppy → litter → breeder)
  const [puppyRow] = await db
    .select({
      puppyId: puppiesTable.id,
      puppyName: puppiesTable.name,
      puppySex: puppiesTable.sex,
      buyerId: puppiesTable.buyerId,
      buyerEmail: buyersTable.email,
      buyerFirstName: buyersTable.firstName,
      buyerLastName: buyersTable.lastName,
      breederUserId: littersTable.userId,
    })
    .from(puppiesTable)
    .innerJoin(littersTable, eq(puppiesTable.litterId, littersTable.id))
    .leftJoin(buyersTable, eq(puppiesTable.buyerId, buyersTable.id))
    .where(and(eq(puppiesTable.id, puppyId), eq(littersTable.userId, userId)));

  if (!puppyRow) {
    res.status(404).json({ error: "Puppy not found or not owned by you" });
    return;
  }

  // Get email from request body or buyer record
  const { email: bodyEmail } = req.body as { email?: string };
  const targetEmail = bodyEmail ?? puppyRow.buyerEmail;

  if (!targetEmail) {
    res.status(400).json({ error: "Email address required — either pass email in the request body or assign a buyer with an email to this puppy" });
    return;
  }

  // Invalidate any previous pending invites for this puppy
  await db
    .update(puppyOwnerInvitesTable)
    .set({ status: "expired" })
    .where(
      and(
        eq(puppyOwnerInvitesTable.puppyId, puppyId),
        eq(puppyOwnerInvitesTable.status, "pending"),
      ),
    );

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.insert(puppyOwnerInvitesTable).values({
    token,
    puppyId,
    buyerId: puppyRow.buyerId ?? null,
    breederUserId: userId,
    email: targetEmail,
    status: "pending",
    expiresAt,
  });

  const basePath = process.env.BASE_PATH ?? "";
  const inviteUrl = `${getBaseUrl(req)}${basePath}/invite/${token}`;

  // Get breeder email for the email template
  const [breeder] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const breederName = breeder?.email?.split("@")[0] ?? "Your breeder";
  const puppyName = puppyRow.puppyName ?? "Your puppy";

  const emailSent = await sendInviteEmail({
    to: targetEmail,
    puppyName,
    breederName,
    inviteUrl,
  });

  req.log.info({ puppyId, token, emailSent }, "Invite created");

  res.status(201).json({
    success: true,
    inviteUrl,
    token,
    emailSent,
    message: emailSent
      ? `Invitation email sent to ${targetEmail}`
      : `No email sent (RESEND_API_KEY not configured). Share this link manually: ${inviteUrl}`,
  });
});

// ─── Breeder: get invite status for a puppy ───────────────────────────────────
breederInvitesRouter.get("/puppies/:puppyId/invite-status", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const puppyId = parseInt(req.params.puppyId as string, 10);

  if (isNaN(puppyId)) { res.status(400).json({ error: "Invalid puppy ID" }); return; }

  // Verify ownership
  const [puppyRow] = await db
    .select({ puppyId: puppiesTable.id })
    .from(puppiesTable)
    .innerJoin(littersTable, eq(puppiesTable.litterId, littersTable.id))
    .where(and(eq(puppiesTable.id, puppyId), eq(littersTable.userId, userId)));

  if (!puppyRow) { res.status(404).json({ error: "Puppy not found" }); return; }

  const [invite] = await db
    .select()
    .from(puppyOwnerInvitesTable)
    .where(
      and(
        eq(puppyOwnerInvitesTable.puppyId, puppyId),
        eq(puppyOwnerInvitesTable.breederUserId, userId),
      ),
    )
    .orderBy(sql`${puppyOwnerInvitesTable.createdAt} DESC`)
    .limit(1);

  res.json({ invite: invite ?? null });
});
