import { Router } from "express";
import { db } from "@workspace/db";
import { waitingListTable, puppiesTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

const router = Router();

// ── List ───────────────────────────────────────────────────────────────────────
router.get("/waiting-list", async (req, res) => {
  const entries = await db.select().from(waitingListTable).orderBy(asc(waitingListTable.priority), asc(waitingListTable.createdAt));

  // Attach puppy name when assigned
  const result = await Promise.all(entries.map(async (e) => {
    let puppyName: string | null = null;
    if (e.puppyId) {
      const [p] = await db.select().from(puppiesTable).where(eq(puppiesTable.id, e.puppyId));
      puppyName = p ? (p.callName ?? `Puppy #${p.id}`) : null;
    }
    return { ...e, depositPaid: e.depositPaid === "true", puppyName };
  }));

  res.json(result);
});

// ── Create ─────────────────────────────────────────────────────────────────────
router.post("/waiting-list", async (req, res) => {
  const {
    name, email, phone, address,
    breedPreference, sexPreference, colourPreference, litterPreference, timeframe,
    depositPaid, depositAmount, priority, notes, status,
  } = req.body;

  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }

  const [entry] = await db.insert(waitingListTable).values({
    name: name.trim(),
    email: email ?? null,
    phone: phone ?? null,
    address: address ?? null,
    breedPreference: breedPreference ?? null,
    sexPreference: sexPreference ?? null,
    colourPreference: colourPreference ?? null,
    litterPreference: litterPreference ?? null,
    timeframe: timeframe ?? null,
    depositPaid: depositPaid ? "true" : "false",
    depositAmount: depositAmount ?? null,
    priority: priority ?? null,
    notes: notes ?? null,
    status: status ?? "waiting",
  }).returning();

  res.status(201).json({ ...entry, depositPaid: entry.depositPaid === "true" });
});

// ── Get ────────────────────────────────────────────────────────────────────────
router.get("/waiting-list/:entryId", async (req, res) => {
  const entryId = parseInt(req.params.entryId);
  if (isNaN(entryId)) { res.status(400).json({ error: "invalid entryId" }); return; }

  const [entry] = await db.select().from(waitingListTable).where(eq(waitingListTable.id, entryId));
  if (!entry) { res.status(404).json({ error: "not found" }); return; }

  let puppyName: string | null = null;
  if (entry.puppyId) {
    const [p] = await db.select().from(puppiesTable).where(eq(puppiesTable.id, entry.puppyId));
    puppyName = p ? (p.callName ?? `Puppy #${p.id}`) : null;
  }

  res.json({ ...entry, depositPaid: entry.depositPaid === "true", puppyName });
});

// ── Update ─────────────────────────────────────────────────────────────────────
router.put("/waiting-list/:entryId", async (req, res) => {
  const entryId = parseInt(req.params.entryId);
  if (isNaN(entryId)) { res.status(400).json({ error: "invalid entryId" }); return; }

  const {
    name, email, phone, address,
    breedPreference, sexPreference, colourPreference, litterPreference, timeframe,
    depositPaid, depositAmount, priority, notes, status,
  } = req.body;

  const [entry] = await db.update(waitingListTable).set({
    name: name?.trim(),
    email: email ?? null,
    phone: phone ?? null,
    address: address ?? null,
    breedPreference: breedPreference ?? null,
    sexPreference: sexPreference ?? null,
    colourPreference: colourPreference ?? null,
    litterPreference: litterPreference ?? null,
    timeframe: timeframe ?? null,
    depositPaid: depositPaid ? "true" : "false",
    depositAmount: depositAmount ?? null,
    priority: priority ?? null,
    notes: notes ?? null,
    status: status ?? "waiting",
  }).where(eq(waitingListTable.id, entryId)).returning();

  if (!entry) { res.status(404).json({ error: "not found" }); return; }
  res.json({ ...entry, depositPaid: entry.depositPaid === "true" });
});

// ── Assign to puppy ────────────────────────────────────────────────────────────
router.post("/waiting-list/:entryId/assign", async (req, res) => {
  const entryId = parseInt(req.params.entryId);
  if (isNaN(entryId)) { res.status(400).json({ error: "invalid entryId" }); return; }

  const { puppyId } = req.body;
  if (!puppyId) { res.status(400).json({ error: "puppyId is required" }); return; }

  const [entry] = await db.update(waitingListTable).set({
    puppyId: parseInt(puppyId),
    status: "assigned",
  }).where(eq(waitingListTable.id, entryId)).returning();

  if (!entry) { res.status(404).json({ error: "not found" }); return; }
  res.json({ ...entry, depositPaid: entry.depositPaid === "true" });
});

// ── Unassign ───────────────────────────────────────────────────────────────────
router.post("/waiting-list/:entryId/unassign", async (req, res) => {
  const entryId = parseInt(req.params.entryId);
  if (isNaN(entryId)) { res.status(400).json({ error: "invalid entryId" }); return; }

  const [entry] = await db.update(waitingListTable).set({
    puppyId: null,
    status: "waiting",
  }).where(eq(waitingListTable.id, entryId)).returning();

  if (!entry) { res.status(404).json({ error: "not found" }); return; }
  res.json({ ...entry, depositPaid: entry.depositPaid === "true" });
});

// ── Delete ─────────────────────────────────────────────────────────────────────
router.delete("/waiting-list/:entryId", async (req, res) => {
  const entryId = parseInt(req.params.entryId);
  if (isNaN(entryId)) { res.status(400).json({ error: "invalid entryId" }); return; }
  await db.delete(waitingListTable).where(eq(waitingListTable.id, entryId));
  res.status(204).send();
});

export default router;
