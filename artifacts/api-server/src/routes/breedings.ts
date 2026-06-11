import { Router, type IRouter } from "express";
import { db, breedingsTable, dogsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import {
  ListBreedingsQueryParams,
  CreateBreedingBody,
  UpdateBreedingBody,
} from "@workspace/api-zod";
import { type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request } from "express";

const router: IRouter = Router();

function uid(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

async function breedingWithNames(b: typeof breedingsTable.$inferSelect) {
  const [sire] = await db.select().from(dogsTable).where(eq(dogsTable.id, b.sireId));
  const [dam] = await db.select().from(dogsTable).where(eq(dogsTable.id, b.damId));
  return {
    id: b.id,
    sireId: b.sireId,
    sireName: sire?.registeredName ?? "Unknown",
    damId: b.damId,
    damName: dam?.registeredName ?? "Unknown",
    date: b.date,
    method: b.method,
    tieDuration: b.tieDuration,
    notes: b.notes,
    ultrasoundDate: b.ultrasoundDate ?? null,
    ultrasoundCompleted: b.ultrasoundCompleted === "true",
    ultrasoundNotes: b.ultrasoundNotes ?? null,
    xrayDate: b.xrayDate ?? null,
    xrayCompleted: b.xrayCompleted === "true",
    xrayPuppyCount: b.xrayPuppyCount ?? null,
    xrayNotes: b.xrayNotes ?? null,
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/breedings", async (req, res): Promise<void> => {
  const userId = uid(req);
  const parsed = ListBreedingsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const conditions: any[] = [eq(breedingsTable.userId, userId)];
  if (parsed.data.dogId) {
    conditions.push(or(
      eq(breedingsTable.sireId, parsed.data.dogId),
      eq(breedingsTable.damId, parsed.data.dogId),
    ));
  }

  const breedings = await db.select().from(breedingsTable)
    .where(and(...conditions))
    .orderBy(breedingsTable.date);

  const enriched = await Promise.all(breedings.map(breedingWithNames));
  res.json(enriched);
});

router.post("/breedings", async (req, res): Promise<void> => {
  const userId = uid(req);
  const parsed = CreateBreedingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const insertData: Record<string, unknown> = { ...parsed.data, userId };
  if (parsed.data.ultrasoundCompleted !== undefined) insertData.ultrasoundCompleted = String(parsed.data.ultrasoundCompleted);
  if (parsed.data.xrayCompleted !== undefined) insertData.xrayCompleted = String(parsed.data.xrayCompleted);
  const [breeding] = await db.insert(breedingsTable).values(insertData as any).returning();
  res.status(201).json(await breedingWithNames(breeding));
});

router.get("/breedings/:breedingId", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseInt(Array.isArray(req.params.breedingId) ? req.params.breedingId[0] : req.params.breedingId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid breedingId" }); return; }
  const [breeding] = await db.select().from(breedingsTable)
    .where(and(eq(breedingsTable.id, id), eq(breedingsTable.userId, userId)));
  if (!breeding) { res.status(404).json({ error: "Breeding not found" }); return; }
  res.json(await breedingWithNames(breeding));
});

router.patch("/breedings/:breedingId", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseInt(Array.isArray(req.params.breedingId) ? req.params.breedingId[0] : req.params.breedingId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid breedingId" }); return; }
  const parsed = UpdateBreedingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.ultrasoundCompleted !== undefined) updateData.ultrasoundCompleted = String(parsed.data.ultrasoundCompleted);
  if (parsed.data.xrayCompleted !== undefined) updateData.xrayCompleted = String(parsed.data.xrayCompleted);
  const [breeding] = await db.update(breedingsTable).set(updateData)
    .where(and(eq(breedingsTable.id, id), eq(breedingsTable.userId, userId)))
    .returning();
  if (!breeding) { res.status(404).json({ error: "Breeding not found" }); return; }
  res.json(await breedingWithNames(breeding));
});

// ─── Pregnancy ─────────────────────────────────────────────────────────────────
router.get("/breedings/:breedingId/pregnancy", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseInt(Array.isArray(req.params.breedingId) ? req.params.breedingId[0] : req.params.breedingId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid breedingId" }); return; }
  const [breeding] = await db.select().from(breedingsTable)
    .where(and(eq(breedingsTable.id, id), eq(breedingsTable.userId, userId)));
  if (!breeding) { res.status(404).json({ error: "Breeding not found" }); return; }

  const breedingDate = new Date(breeding.date);
  const expectedWhelpDate = new Date(breedingDate);
  expectedWhelpDate.setDate(expectedWhelpDate.getDate() + 63);

  const now = new Date();
  const daysPregnant = Math.floor((now.getTime() - breedingDate.getTime()) / (1000 * 60 * 60 * 24));

  const milestones = [
    { day: 21, label: "Ultrasound Recommended" },
    { day: 45, label: "X-ray Recommended" },
    { day: 58, label: "Prepare Whelping Box" },
    { day: 63, label: "Expected Whelp Date" },
  ].map(m => {
    const milestoneDate = new Date(breedingDate);
    milestoneDate.setDate(milestoneDate.getDate() + m.day);
    return {
      day: m.day,
      label: m.label,
      date: milestoneDate.toISOString().split("T")[0],
      completed: daysPregnant >= m.day,
    };
  });

  res.json({
    breedingId: breeding.id,
    breedingDate: breeding.date,
    expectedWhelpDate: expectedWhelpDate.toISOString().split("T")[0],
    daysPregnant: Math.max(0, daysPregnant),
    milestones,
  });
});

export default router;
