import { Router, type IRouter } from "express";
import { db, buyersTable, puppiesTable, puppyOwnerInvitesTable, puppyOwnerAccountsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateBuyerBody,
  UpdateBuyerBody,
} from "@workspace/api-zod";
import { type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request } from "express";

const router: IRouter = Router();

function uid(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function formatBuyer(b: typeof buyersTable.$inferSelect) {
  return {
    id: b.id,
    firstName: b.firstName,
    lastName: b.lastName,
    email: b.email,
    phone: b.phone,
    address: b.address,
    contractSigned: b.contractSigned === "true",
    notes: b.notes,
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/buyers", async (req, res): Promise<void> => {
  const userId = uid(req);
  const buyers = await db.select().from(buyersTable)
    .where(eq(buyersTable.userId, userId))
    .orderBy(buyersTable.lastName);
  res.json(buyers.map(formatBuyer));
});

router.post("/buyers", async (req, res): Promise<void> => {
  const userId = uid(req);
  const parsed = CreateBuyerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [buyer] = await db.insert(buyersTable).values({ ...parsed.data, userId }).returning();
  res.status(201).json(formatBuyer(buyer));
});

router.get("/buyers/:buyerId", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseId(req.params.buyerId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid buyerId" }); return; }
  const [buyer] = await db.select().from(buyersTable)
    .where(and(eq(buyersTable.id, id), eq(buyersTable.userId, userId)));
  if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }
  res.json(formatBuyer(buyer));
});

router.patch("/buyers/:buyerId", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseId(req.params.buyerId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid buyerId" }); return; }
  const parsed = UpdateBuyerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Record<string, any> = { ...parsed.data };
  if (parsed.data.contractSigned !== undefined) updateData.contractSigned = String(parsed.data.contractSigned);
  const [buyer] = await db.update(buyersTable).set(updateData)
    .where(and(eq(buyersTable.id, id), eq(buyersTable.userId, userId)))
    .returning();
  if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }
  res.json(formatBuyer(buyer));
});

router.delete("/buyers/:buyerId", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseId(req.params.buyerId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid buyerId" }); return; }
  const [buyer] = await db.select().from(buyersTable)
    .where(and(eq(buyersTable.id, id), eq(buyersTable.userId, userId)));
  if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }

  // Unassign this buyer from any puppies, mirroring the single-puppy "Unassign" action.
  await db.update(puppiesTable).set({ buyerId: null, collectionDate: null }).where(eq(puppiesTable.buyerId, id));
  // Clear the FK reference on any buyer-portal invites/accounts so the delete doesn't violate it.
  await db.update(puppyOwnerInvitesTable).set({ buyerId: null }).where(eq(puppyOwnerInvitesTable.buyerId, id));
  await db.update(puppyOwnerAccountsTable).set({ buyerId: null }).where(eq(puppyOwnerAccountsTable.buyerId, id));

  await db.delete(buyersTable).where(and(eq(buyersTable.id, id), eq(buyersTable.userId, userId)));
  res.status(204).send();
});

export default router;
