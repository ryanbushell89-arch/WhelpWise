import { Router, type IRouter } from "express";
import { db, breedsTable, breedHealthTestsTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { GetBreedHealthTestsParams } from "@workspace/api-zod";
import { BREED_SEEDS } from "../data/breeds";

const router: IRouter = Router();

let seedDone = false;

async function seedBreedsIfEmpty(): Promise<void> {
  if (seedDone) return;
  seedDone = true;
  try {
    // Use ON CONFLICT DO NOTHING so we safely add missing breeds even if
    // some already exist, without failing on the unique name constraint.
    const dedupedNames = new Set<string>();
    const toInsert = BREED_SEEDS.filter(b => {
      if (dedupedNames.has(b.name)) return false;
      dedupedNames.add(b.name);
      return true;
    });

    for (let i = 0; i < toInsert.length; i += 50) {
      await db.insert(breedsTable)
        .values(toInsert.slice(i, i + 50))
        .onConflictDoNothing();
    }
  } catch {
    seedDone = false;
  }
}

router.get("/breeds", async (_req, res): Promise<void> => {
  await seedBreedsIfEmpty();
  const breeds = await db.select().from(breedsTable).orderBy(breedsTable.name);
  res.json(breeds.map(b => ({ id: b.id, name: b.name, group: b.group })));
});

router.get("/breeds/:breedId/health-tests", async (req, res): Promise<void> => {
  const parsed = GetBreedHealthTestsParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tests = await db.select().from(breedHealthTestsTable)
    .where(eq(breedHealthTestsTable.breedId, parsed.data.breedId));
  res.json(tests.map(t => ({
    id: t.id,
    breedId: t.breedId,
    testName: t.testName,
    required: t.required === "true",
    description: t.description,
  })));
});

export default router;
