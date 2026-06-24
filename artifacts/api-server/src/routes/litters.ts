import { Router, type IRouter } from "express";
import {
  db, littersTable, dogsTable, whelpingRecordsTable, puppiesTable, buyersTable, weightEntriesTable,
  puppyWormingTable, puppyVaccinationsTable, puppyDocumentsTable, whelpingDocumentsTable, expensesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateLitterBody,
  UpdateLitterBody,
  CreateWhelpingRecordBody,
  CreatePuppyBody,
  UpdatePuppyBody,
  CreateWeightBody,
  ListPuppiesByBuyerQueryParams,
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

function formatPuppy(p: typeof puppiesTable.$inferSelect, buyerName: string | null) {
  return {
    ...p,
    alive: p.alive === "true",
    placentaPresent: p.placentaPresent === "true" ? true : p.placentaPresent === "false" ? false : null,
    depositPaid: p.depositPaid === "true",
    balancePaid: p.balancePaid === "true",
    buyerName,
    createdAt: p.createdAt.toISOString(),
  };
}

async function litterWithNames(l: typeof littersTable.$inferSelect) {
  let sireName: string | null = null;
  let damName: string | null = null;
  if (l.sireId) {
    const [sire] = await db.select().from(dogsTable).where(eq(dogsTable.id, l.sireId));
    sireName = sire?.registeredName ?? null;
  }
  if (l.damId) {
    const [dam] = await db.select().from(dogsTable).where(eq(dogsTable.id, l.damId));
    damName = dam?.registeredName ?? null;
  }
  return {
    id: l.id,
    sireId: l.sireId,
    sireName,
    damId: l.damId,
    damName,
    breedingId: l.breedingId,
    dob: l.dob,
    totalBorn: l.totalBorn,
    liveMales: l.liveMales,
    liveFemales: l.liveFemales,
    stillborn: l.stillborn,
    notes: l.notes,
    status: l.status,
    createdAt: l.createdAt.toISOString(),
  };
}

// ─── Litters ──────────────────────────────────────────────────────────────────
router.get("/litters", async (req, res): Promise<void> => {
  const userId = uid(req);
  const litters = await db.select().from(littersTable)
    .where(eq(littersTable.userId, userId))
    .orderBy(littersTable.createdAt);
  const enriched = await Promise.all(litters.map(litterWithNames));
  res.json(enriched);
});

router.post("/litters", async (req, res): Promise<void> => {
  const userId = uid(req);
  const parsed = CreateLitterBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [litter] = await db.insert(littersTable).values({
    ...parsed.data,
    userId,
    status: parsed.data.status ?? "expected",
  }).returning();
  res.status(201).json(await litterWithNames(litter));
});

router.get("/litters/:litterId", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseId(req.params.litterId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid litterId" }); return; }
  const [litter] = await db.select().from(littersTable)
    .where(and(eq(littersTable.id, id), eq(littersTable.userId, userId)));
  if (!litter) { res.status(404).json({ error: "Litter not found" }); return; }
  res.json(await litterWithNames(litter));
});

router.patch("/litters/:litterId", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseId(req.params.litterId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid litterId" }); return; }
  const parsed = UpdateLitterBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [litter] = await db.update(littersTable).set(parsed.data)
    .where(and(eq(littersTable.id, id), eq(littersTable.userId, userId)))
    .returning();
  if (!litter) { res.status(404).json({ error: "Litter not found" }); return; }
  res.json(await litterWithNames(litter));
});

router.delete("/litters/:litterId", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseId(req.params.litterId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid litterId" }); return; }
  const puppies = await db.select({ id: puppiesTable.id }).from(puppiesTable)
    .where(eq(puppiesTable.litterId, id));
  for (const p of puppies) {
    await db.delete(weightEntriesTable).where(eq(weightEntriesTable.puppyId, p.id));
    await db.delete(puppyWormingTable).where(eq(puppyWormingTable.puppyId, p.id));
    await db.delete(puppyVaccinationsTable).where(eq(puppyVaccinationsTable.puppyId, p.id));
    await db.delete(puppyDocumentsTable).where(eq(puppyDocumentsTable.puppyId, p.id));
  }
  await db.delete(puppiesTable).where(eq(puppiesTable.litterId, id));
  await db.delete(whelpingRecordsTable).where(eq(whelpingRecordsTable.litterId, id));
  await db.delete(whelpingDocumentsTable).where(eq(whelpingDocumentsTable.litterId, id));
  await db.delete(expensesTable).where(eq(expensesTable.litterId, id));
  await db.delete(littersTable).where(and(eq(littersTable.id, id), eq(littersTable.userId, userId)));
  res.status(204).send();
});

// ─── Whelping ─────────────────────────────────────────────────────────────────
router.get("/litters/:litterId/whelping", async (req, res): Promise<void> => {
  const id = parseId(req.params.litterId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid litterId" }); return; }
  const [record] = await db.select().from(whelpingRecordsTable).where(eq(whelpingRecordsTable.litterId, id));
  if (!record) { res.status(404).json({ error: "Whelping record not found" }); return; }
  res.json({ ...record, createdAt: record.createdAt.toISOString() });
});

router.post("/litters/:litterId/whelping", async (req, res): Promise<void> => {
  const litterId = parseId(req.params.litterId);
  if (isNaN(litterId)) { res.status(400).json({ error: "Invalid litterId" }); return; }
  const parsed = CreateWhelpingRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [record] = await db.insert(whelpingRecordsTable).values({ ...parsed.data, litterId }).returning();
  await db.update(littersTable).set({ status: "whelped" }).where(eq(littersTable.id, litterId));
  res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
});

// ─── Puppies ──────────────────────────────────────────────────────────────────
router.get("/litters/:litterId/puppies", async (req, res): Promise<void> => {
  const id = parseId(req.params.litterId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid litterId" }); return; }
  const puppies = await db.select().from(puppiesTable).where(eq(puppiesTable.litterId, id));
  const enriched = await Promise.all(puppies.map(async p => {
    let buyerName: string | null = null;
    if (p.buyerId) {
      const [buyer] = await db.select().from(buyersTable).where(eq(buyersTable.id, p.buyerId));
      buyerName = buyer ? `${buyer.firstName} ${buyer.lastName}` : null;
    }
    return formatPuppy(p, buyerName);
  }));
  res.json(enriched);
});

router.post("/litters/:litterId/puppies", async (req, res): Promise<void> => {
  const litterId = parseId(req.params.litterId);
  if (isNaN(litterId)) { res.status(400).json({ error: "Invalid litterId" }); return; }
  const parsed = CreatePuppyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const existing = await db.select().from(puppiesTable).where(eq(puppiesTable.litterId, litterId));
  const [puppy] = await db.insert(puppiesTable).values({
    litterId,
    name: `#${existing.length + 1}`,
    callName: (parsed.data as any).callName ?? null,
    registeredName: (parsed.data as any).registeredName ?? null,
    sex: parsed.data.sex,
    alive: String(parsed.data.alive),
    collarColour: parsed.data.collarColour ?? null,
    colour: parsed.data.colour ?? null,
    markings: parsed.data.markings ?? null,
    birthWeight: parsed.data.birthWeight ?? null,
    birthTime: parsed.data.birthTime ?? null,
    placentaPresent: parsed.data.placentaPresent != null ? String(parsed.data.placentaPresent) : null,
    notes: parsed.data.notes ?? null,
  }).returning();
  res.status(201).json(formatPuppy(puppy, null));
});

// ─── Puppies by buyer ──────────────────────────────────────────────────────────
router.get("/puppies", async (req, res): Promise<void> => {
  const parsed = ListPuppiesByBuyerQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const puppies = await db.select().from(puppiesTable).where(eq(puppiesTable.buyerId, parsed.data.buyerId));
  const [buyer] = await db.select().from(buyersTable).where(eq(buyersTable.id, parsed.data.buyerId));
  const buyerName = buyer ? `${buyer.firstName} ${buyer.lastName}` : null;
  res.json(puppies.map(p => formatPuppy(p, buyerName)));
});

// ─── Puppy by ID ──────────────────────────────────────────────────────────────
router.get("/puppies/:puppyId", async (req, res): Promise<void> => {
  const id = parseId(req.params.puppyId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid puppyId" }); return; }
  const [puppy] = await db.select().from(puppiesTable).where(eq(puppiesTable.id, id));
  if (!puppy) { res.status(404).json({ error: "Puppy not found" }); return; }
  let buyerName: string | null = null;
  if (puppy.buyerId) {
    const [buyer] = await db.select().from(buyersTable).where(eq(buyersTable.id, puppy.buyerId));
    buyerName = buyer ? `${buyer.firstName} ${buyer.lastName}` : null;
  }
  res.json(formatPuppy(puppy, buyerName));
});

router.patch("/puppies/:puppyId", async (req, res): Promise<void> => {
  const id = parseId(req.params.puppyId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid puppyId" }); return; }
  const parsed = UpdatePuppyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Record<string, any> = { ...parsed.data };
  if (parsed.data.alive !== undefined) updateData.alive = String(parsed.data.alive);
  if (parsed.data.placentaPresent !== undefined) updateData.placentaPresent = parsed.data.placentaPresent != null ? String(parsed.data.placentaPresent) : null;
  if (parsed.data.depositPaid !== undefined) updateData.depositPaid = String(parsed.data.depositPaid);
  if (parsed.data.balancePaid !== undefined) updateData.balancePaid = String(parsed.data.balancePaid);
  const [puppy] = await db.update(puppiesTable).set(updateData).where(eq(puppiesTable.id, id)).returning();
  if (!puppy) { res.status(404).json({ error: "Puppy not found" }); return; }
  let buyerName: string | null = null;
  if (puppy.buyerId) {
    const [buyer] = await db.select().from(buyersTable).where(eq(buyersTable.id, puppy.buyerId));
    buyerName = buyer ? `${buyer.firstName} ${buyer.lastName}` : null;
  }
  res.json(formatPuppy(puppy, buyerName));
});

router.delete("/puppies/:puppyId", async (req, res): Promise<void> => {
  const id = parseId(req.params.puppyId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid puppyId" }); return; }
  await db.delete(weightEntriesTable).where(eq(weightEntriesTable.puppyId, id));
  await db.delete(puppyWormingTable).where(eq(puppyWormingTable.puppyId, id));
  await db.delete(puppyVaccinationsTable).where(eq(puppyVaccinationsTable.puppyId, id));
  await db.delete(puppyDocumentsTable).where(eq(puppyDocumentsTable.puppyId, id));
  await db.delete(puppiesTable).where(eq(puppiesTable.id, id));
  res.status(204).send();
});

// ─── Weights ──────────────────────────────────────────────────────────────────
router.get("/puppies/:puppyId/weights", async (req, res): Promise<void> => {
  const id = parseId(req.params.puppyId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid puppyId" }); return; }
  const weights = await db.select().from(weightEntriesTable)
    .where(eq(weightEntriesTable.puppyId, id))
    .orderBy(weightEntriesTable.date);
  res.json(weights.map(w => ({
    ...w,
    alertTriggered: w.alertTriggered === "true",
    createdAt: w.createdAt.toISOString(),
  })));
});

router.post("/puppies/:puppyId/weights", async (req, res): Promise<void> => {
  const puppyId = parseId(req.params.puppyId);
  if (isNaN(puppyId)) { res.status(400).json({ error: "Invalid puppyId" }); return; }
  const parsed = CreateWeightBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const prevWeights = await db.select().from(weightEntriesTable)
    .where(eq(weightEntriesTable.puppyId, puppyId))
    .orderBy(weightEntriesTable.date);
  const lastWeight = prevWeights[prevWeights.length - 1];
  const alertTriggered = lastWeight && parsed.data.weightGrams < lastWeight.weightGrams;
  const [entry] = await db.insert(weightEntriesTable).values({
    puppyId,
    date: parsed.data.date,
    weightGrams: parsed.data.weightGrams,
    notes: parsed.data.notes ?? null,
    alertTriggered: String(!!alertTriggered),
    overrideReason: parsed.data.overrideReason ?? null,
  }).returning();
  res.status(201).json({
    ...entry,
    alertTriggered: entry.alertTriggered === "true",
    createdAt: entry.createdAt.toISOString(),
  });
});

// ─── Worming ──────────────────────────────────────────────────────────────────
router.get("/puppies/:puppyId/worming", async (req, res): Promise<void> => {
  const id = parseId(req.params.puppyId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid puppyId" }); return; }
  const rows = await db.select().from(puppyWormingTable).where(eq(puppyWormingTable.puppyId, id)).orderBy(puppyWormingTable.date);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/puppies/:puppyId/worming", async (req, res): Promise<void> => {
  const id = parseId(req.params.puppyId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid puppyId" }); return; }
  const { date, product, dose, notes } = req.body;
  if (!date || !product) { res.status(400).json({ error: "date and product are required" }); return; }
  const [row] = await db.insert(puppyWormingTable).values({ puppyId: id, date, product, dose: dose ?? null, notes: notes ?? null }).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/puppies/:puppyId/worming/:wormingId", async (req, res): Promise<void> => {
  const puppyId = parseId(req.params.puppyId);
  const wormingId = parseId(req.params.wormingId);
  await db.delete(puppyWormingTable).where(and(eq(puppyWormingTable.id, wormingId), eq(puppyWormingTable.puppyId, puppyId)));
  res.status(204).send();
});

// ─── Vaccinations ─────────────────────────────────────────────────────────────
router.get("/puppies/:puppyId/vaccinations", async (req, res): Promise<void> => {
  const id = parseId(req.params.puppyId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid puppyId" }); return; }
  const rows = await db.select().from(puppyVaccinationsTable).where(eq(puppyVaccinationsTable.puppyId, id)).orderBy(puppyVaccinationsTable.date);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/puppies/:puppyId/vaccinations", async (req, res): Promise<void> => {
  const id = parseId(req.params.puppyId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid puppyId" }); return; }
  const { date, vaccineName, batchLot, vet, nextDueDate, notes } = req.body;
  if (!date || !vaccineName) { res.status(400).json({ error: "date and vaccineName are required" }); return; }
  const [row] = await db.insert(puppyVaccinationsTable).values({ puppyId: id, date, vaccineName, batchLot: batchLot ?? null, vet: vet ?? null, nextDueDate: nextDueDate ?? null, notes: notes ?? null }).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/puppies/:puppyId/vaccinations/:vaccinationId", async (req, res): Promise<void> => {
  const puppyId = parseId(req.params.puppyId);
  const vaccinationId = parseId(req.params.vaccinationId);
  await db.delete(puppyVaccinationsTable).where(and(eq(puppyVaccinationsTable.id, vaccinationId), eq(puppyVaccinationsTable.puppyId, puppyId)));
  res.status(204).send();
});

// ─── Puppy Documents ──────────────────────────────────────────────────────────
router.get("/puppies/:puppyId/documents", async (req, res): Promise<void> => {
  const id = parseId(req.params.puppyId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid puppyId" }); return; }
  const rows = await db.select().from(puppyDocumentsTable).where(eq(puppyDocumentsTable.puppyId, id)).orderBy(puppyDocumentsTable.createdAt);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/puppies/:puppyId/documents", async (req, res): Promise<void> => {
  const id = parseId(req.params.puppyId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid puppyId" }); return; }
  const { docType, name, fileUrl } = req.body;
  if (!docType || !name || !fileUrl) { res.status(400).json({ error: "docType, name, and fileUrl are required" }); return; }
  const [row] = await db.insert(puppyDocumentsTable).values({ puppyId: id, docType, name, fileUrl }).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/puppies/:puppyId/documents/:docId", async (req, res): Promise<void> => {
  const puppyId = parseId(req.params.puppyId);
  const docId = parseId(req.params.docId);
  await db.delete(puppyDocumentsTable).where(and(eq(puppyDocumentsTable.id, docId), eq(puppyDocumentsTable.puppyId, puppyId)));
  res.status(204).send();
});

// ─── Whelping Documents ───────────────────────────────────────────────────────
router.get("/litters/:litterId/documents", async (req, res): Promise<void> => {
  const id = parseId(req.params.litterId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid litterId" }); return; }
  const rows = await db.select().from(whelpingDocumentsTable).where(eq(whelpingDocumentsTable.litterId, id)).orderBy(whelpingDocumentsTable.createdAt);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/litters/:litterId/documents", async (req, res): Promise<void> => {
  const id = parseId(req.params.litterId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid litterId" }); return; }
  const { name, fileUrl } = req.body;
  if (!name || !fileUrl) { res.status(400).json({ error: "name and fileUrl are required" }); return; }
  const [row] = await db.insert(whelpingDocumentsTable).values({ litterId: id, name, fileUrl }).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/litters/:litterId/documents/:docId", async (req, res): Promise<void> => {
  const litterId = parseId(req.params.litterId);
  const docId = parseId(req.params.docId);
  await db.delete(whelpingDocumentsTable).where(and(eq(whelpingDocumentsTable.id, docId), eq(whelpingDocumentsTable.litterId, litterId)));
  res.status(204).send();
});

// ─── Buyer assignment ─────────────────────────────────────────────────────────
router.put("/puppies/:puppyId/buyer", async (req, res): Promise<void> => {
  const id = parseId(req.params.puppyId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid puppyId" }); return; }
  const { buyerId, collectionDate } = req.body;
  const [puppy] = await db.update(puppiesTable)
    .set({ buyerId: buyerId ?? null, collectionDate: collectionDate ?? null })
    .where(eq(puppiesTable.id, id))
    .returning();
  if (!puppy) { res.status(404).json({ error: "Puppy not found" }); return; }
  let buyerName: string | null = null;
  if (puppy.buyerId) {
    const [buyer] = await db.select().from(buyersTable).where(eq(buyersTable.id, puppy.buyerId));
    buyerName = buyer ? `${buyer.firstName} ${buyer.lastName}` : null;
  }
  res.json(formatPuppy(puppy, buyerName));
});

export default router;
