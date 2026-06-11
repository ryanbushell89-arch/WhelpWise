import { Router, type IRouter } from "express";
import { db, dogsTable, breedsTable, healthTestResultsTable, heatCyclesTable, progesteroneReadingsTable } from "@workspace/db";
import { eq, ilike, and, or, ne, sql } from "drizzle-orm";
import {
  ListDogsQueryParams,
  CreateDogBody,
  GetDogParams,
  UpdateDogParams,
  UpdateDogBody,
  DeleteDogParams,
  GetDogPedigreeParams,
  ListDogHealthTestsParams,
  CreateHealthTestParams,
  CreateHealthTestBody,
  UpdateHealthTestParams,
  UpdateHealthTestBody,
  DeleteHealthTestParams,
  ListHeatCyclesParams,
  CreateHeatCycleParams,
  CreateHeatCycleBody,
  UpdateHeatCycleParams,
  UpdateHeatCycleBody,
  ListProgesteroneReadingsParams,
  CreateProgesteroneReadingParams,
  CreateProgesteroneReadingBody,
  LookupDogsQueryParams,
  SavePedigreeBody,
} from "@workspace/api-zod";
import { type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request } from "express";

const router: IRouter = Router();

function uid(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

// ─── Helper: resolve dog with breed name and sire/dam names ──────────────────
async function dogWithNames(dog: typeof dogsTable.$inferSelect) {
  let breedName: string | null = null;
  if (dog.breedId) {
    const [breed] = await db.select().from(breedsTable).where(eq(breedsTable.id, dog.breedId));
    breedName = breed?.name ?? null;
  }

  let sireName: string | null = null;
  if (dog.sireId) {
    const [sire] = await db.select().from(dogsTable).where(eq(dogsTable.id, dog.sireId));
    sireName = sire?.registeredName ?? null;
  }

  let damName: string | null = null;
  if (dog.damId) {
    const [dam] = await db.select().from(dogsTable).where(eq(dogsTable.id, dog.damId));
    damName = dam?.registeredName ?? null;
  }

  return {
    id: dog.id,
    registeredName: dog.registeredName,
    callName: dog.callName,
    breedId: dog.breedId,
    breedName,
    sex: dog.sex,
    dob: dog.dob,
    colour: dog.colour,
    microchip: dog.microchip,
    registrationNumber: dog.registrationNumber,
    sireId: dog.sireId,
    sireName,
    damId: dog.damId,
    damName,
    visibility: dog.visibility,
    photoUrl: dog.photoUrl,
    status: dog.status,
    isExternal: dog.isExternal === "true",
    createdAt: dog.createdAt.toISOString(),
  };
}

// ─── Helper: promote external stubs when a real dog with same reg number is added
async function promoteStubs(regNumber: string, realDogId: number): Promise<void> {
  const stubs = await db.select().from(dogsTable)
    .where(and(eq(dogsTable.registrationNumber, regNumber), eq(dogsTable.isExternal, "true")));
  for (const stub of stubs) {
    if (stub.id === realDogId) continue;
    await db.update(dogsTable).set({ sireId: realDogId }).where(eq(dogsTable.sireId, stub.id));
    await db.update(dogsTable).set({ damId: realDogId }).where(eq(dogsTable.damId, stub.id));
    await db.delete(dogsTable).where(eq(dogsTable.id, stub.id));
  }
}

interface ParentDetails {
  registeredName?: string | null;
  registrationNumber?: string | null;
  microchip?: string | null;
  sex?: string | null;
  dob?: string | null;
  colour?: string | null;
  breedId?: number | null;
}

// ─── Helper: find or create an external stub ancestor ────────────────────────
// If registrationNumber matches an existing dog → return its id and enrich
// any missing fields on external stubs. Otherwise create a full stub.
async function findOrCreateAncestor(
  data: ParentDetails,
  defaultSex: "male" | "female",
): Promise<number | null> {
  const name = data.registeredName?.trim();
  const regNum = data.registrationNumber?.trim();
  if (!name && !regNum) return null;

  if (regNum) {
    const [existing] = await db.select().from(dogsTable)
      .where(eq(dogsTable.registrationNumber, regNum))
      .limit(1);
    if (existing) {
      if (existing.isExternal === "true") {
        const patch: Record<string, unknown> = {};
        if (name && existing.registeredName !== name) { patch.registeredName = name; patch.callName = name; }
        if (data.microchip?.trim() && !existing.microchip) patch.microchip = data.microchip.trim();
        if (data.dob && !existing.dob) patch.dob = data.dob;
        if (data.colour?.trim() && !existing.colour) patch.colour = data.colour.trim();
        if (data.breedId && !existing.breedId) patch.breedId = data.breedId;
        if (Object.keys(patch).length > 0) {
          await db.update(dogsTable).set(patch as any).where(eq(dogsTable.id, existing.id));
        }
      }
      return existing.id;
    }
  }

  const resolvedSex = (data.sex === "male" || data.sex === "female") ? data.sex : defaultSex;
  const [stub] = await db.insert(dogsTable).values({
    registeredName: name || regNum || "Unknown",
    callName: name || regNum || "Unknown",
    sex: resolvedSex,
    isExternal: "true",
    registrationNumber: regNum || null,
    microchip: data.microchip?.trim() || null,
    dob: data.dob || null,
    colour: data.colour?.trim() || null,
    breedId: data.breedId ?? null,
    visibility: "private",
    status: "active",
  }).returning();
  return stub.id;
}

// ─── Dogs CRUD ───────────────────────────────────────────────────────────────
router.get("/dogs", async (req, res): Promise<void> => {
  const userId = uid(req);
  const parsed = ListDogsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { breed, sex, status, search } = parsed.data;

  const conditions = [
    eq(dogsTable.userId, userId),
    ne(dogsTable.isExternal, "true"),
  ];
  if (sex) conditions.push(eq(dogsTable.sex, sex));
  if (status) conditions.push(eq(dogsTable.status, status));
  if (search) {
    conditions.push(or(
      ilike(dogsTable.registeredName, `%${search}%`),
      ilike(dogsTable.callName, `%${search}%`),
    )!);
  }
  if (breed) {
    const [breedRow] = await db.select().from(breedsTable).where(ilike(breedsTable.name, `%${breed}%`));
    if (!breedRow) { res.json([]); return; }
    conditions.push(eq(dogsTable.breedId, breedRow.id));
  }

  const dogs = await db.select().from(dogsTable)
    .where(and(...conditions))
    .orderBy(dogsTable.registeredName);

  const enriched = await Promise.all(dogs.map(dogWithNames));
  res.json(enriched);
});

router.post("/dogs", async (req, res): Promise<void> => {
  const userId = uid(req);
  const parsed = CreateDogBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data = parsed.data;

  // Resolve sire — explicit sireId wins; fall back to sire object for auto-resolution
  let sireId: number | null = data.sireId ?? null;
  if (!sireId && (data as any).sire) {
    sireId = await findOrCreateAncestor((data as any).sire, "male");
  }

  // Resolve dam
  let damId: number | null = data.damId ?? null;
  if (!damId && (data as any).dam) {
    damId = await findOrCreateAncestor((data as any).dam, "female");
  }

  const [dog] = await db.insert(dogsTable).values({
    registeredName: data.registeredName,
    callName: data.callName,
    sex: data.sex,
    breedId: data.breedId ?? null,
    dob: data.dob ?? null,
    colour: data.colour ?? null,
    microchip: data.microchip ?? null,
    registrationNumber: data.registrationNumber ?? null,
    sireId,
    damId,
    visibility: data.visibility,
    photoUrl: data.photoUrl ?? null,
    userId,
  }).returning();
  if (dog.registrationNumber) await promoteStubs(dog.registrationNumber, dog.id);
  res.status(201).json(await dogWithNames(dog));
});

// ─── Lookup — SQL ILIKE, no full-table JS filter ──────────────────────────────
router.get("/dogs/lookup", async (req, res): Promise<void> => {
  const userId = uid(req);
  const parsed = LookupDogsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "q is required" }); return; }
  const q = parsed.data.q.trim();
  if (!q) { res.json([]); return; }

  const matches = await db.select().from(dogsTable)
    .where(and(
      or(eq(dogsTable.userId, userId), eq(dogsTable.isExternal, "true")),
      or(
        ilike(dogsTable.registeredName, `%${q}%`),
        ilike(dogsTable.callName, `%${q}%`),
        ilike(dogsTable.registrationNumber, `%${q}%`),
      ),
    ))
    .orderBy(dogsTable.registeredName)
    .limit(10);

  const enriched = await Promise.all(matches.map(dogWithNames));
  res.json(enriched);
});

// ─── Exact reg-number lookup — ParentPicker uses this to link known dogs ──────
router.get("/dogs/lookup-by-reg", async (req, res): Promise<void> => {
  const userId = uid(req);
  const reg = typeof req.query.reg === "string" ? req.query.reg.trim() : null;
  if (!reg) { res.status(400).json({ error: "reg is required" }); return; }

  const [dog] = await db.select().from(dogsTable)
    .where(and(
      eq(dogsTable.registrationNumber, reg),
      or(eq(dogsTable.userId, userId), eq(dogsTable.isExternal, "true")),
    ))
    .limit(1);

  if (!dog) { res.status(404).json({ error: "Not found" }); return; }

  // Count known ancestors up to 3 generations so the UI can show
  // "pedigree will auto-populate N ancestors".
  const pedigreeResult = await db.execute(sql`
    WITH RECURSIVE pedigree_cte AS (
      SELECT id, sire_id, dam_id, 0 AS depth FROM dogs WHERE id = ${dog.id}
      UNION ALL
      SELECT d.id, d.sire_id, d.dam_id, p.depth + 1
      FROM dogs d
      INNER JOIN pedigree_cte p ON (d.id = p.sire_id OR d.id = p.dam_id) AND p.depth < 3
    )
    SELECT COUNT(DISTINCT id) AS cnt FROM pedigree_cte WHERE depth > 0
  `);
  const ancestorCount = Number((pedigreeResult.rows[0] as any)?.cnt ?? 0);

  res.json({
    id: dog.id,
    registeredName: dog.registeredName,
    callName: dog.callName,
    sex: dog.sex,
    dob: dog.dob,
    colour: dog.colour,
    microchip: dog.microchip,
    registrationNumber: dog.registrationNumber,
    isExternal: dog.isExternal === "true",
    ancestorCount,
  });
});

router.get("/dogs/:dogId", async (req, res): Promise<void> => {
  const userId = uid(req);
  const dogId = parseInt(Array.isArray(req.params.dogId) ? req.params.dogId[0] : req.params.dogId, 10);
  if (isNaN(dogId)) { res.status(400).json({ error: "Invalid dogId" }); return; }
  const [dog] = await db.select().from(dogsTable)
    .where(and(eq(dogsTable.id, dogId), or(eq(dogsTable.userId, userId), eq(dogsTable.isExternal, "true"))));
  if (!dog) { res.status(404).json({ error: "Dog not found" }); return; }
  res.json(await dogWithNames(dog));
});

router.patch("/dogs/:dogId", async (req, res): Promise<void> => {
  const userId = uid(req);
  const dogId = parseInt(Array.isArray(req.params.dogId) ? req.params.dogId[0] : req.params.dogId, 10);
  if (isNaN(dogId)) { res.status(400).json({ error: "Invalid dogId" }); return; }
  const parsed = UpdateDogBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [dog] = await db.update(dogsTable).set(parsed.data)
    .where(and(eq(dogsTable.id, dogId), eq(dogsTable.userId, userId)))
    .returning();
  if (!dog) { res.status(404).json({ error: "Dog not found" }); return; }
  if (dog.registrationNumber) await promoteStubs(dog.registrationNumber, dog.id);
  res.json(await dogWithNames(dog));
});

router.delete("/dogs/:dogId", async (req, res): Promise<void> => {
  const userId = uid(req);
  const dogId = parseInt(Array.isArray(req.params.dogId) ? req.params.dogId[0] : req.params.dogId, 10);
  if (isNaN(dogId)) { res.status(400).json({ error: "Invalid dogId" }); return; }
  const [dog] = await db.delete(dogsTable)
    .where(and(eq(dogsTable.id, dogId), eq(dogsTable.userId, userId)))
    .returning();
  if (!dog) { res.status(404).json({ error: "Dog not found" }); return; }
  res.sendStatus(204);
});

// ─── Pedigree — single recursive CTE instead of N sequential queries ──────────
interface PedigreeRow {
  id: number;
  registered_name: string;
  call_name: string;
  registration_number: string | null;
  sex: string;
  sire_id: number | null;
  dam_id: number | null;
  photo_url: string | null;
  is_external: string;
  breed_name: string | null;
}

function buildTreeFromFlat(
  dogId: number,
  byId: Map<number, PedigreeRow>,
  depth: number,
  maxDepth: number,
  seen: Set<string>,
): any {
  const key = `${dogId}:${depth}`;
  if (seen.has(key)) return null;
  seen.add(key);

  const row = byId.get(dogId);
  if (!row) return null;

  const node: any = {
    id: row.id,
    registeredName: row.registered_name,
    callName: row.call_name,
    registrationNumber: row.registration_number,
    sex: row.sex,
    breedName: row.breed_name ?? null,
    photoUrl: row.photo_url,
    isExternal: row.is_external === "true",
  };

  if (depth < maxDepth) {
    node.sire = row.sire_id ? buildTreeFromFlat(row.sire_id, byId, depth + 1, maxDepth, seen) : null;
    node.dam = row.dam_id ? buildTreeFromFlat(row.dam_id, byId, depth + 1, maxDepth, seen) : null;
  }

  return node;
}

function collectIds(node: any, seen: Map<number, number>): void {
  if (!node) return;
  if (node.id) seen.set(node.id, (seen.get(node.id) ?? 0) + 1);
  collectIds(node.sire, seen);
  collectIds(node.dam, seen);
}

router.get("/dogs/:dogId/pedigree/:generations", async (req, res): Promise<void> => {
  const dogId = parseInt(Array.isArray(req.params.dogId) ? req.params.dogId[0] : req.params.dogId, 10);
  const generations = parseInt(Array.isArray(req.params.generations) ? req.params.generations[0] : req.params.generations, 10);
  if (isNaN(dogId) || isNaN(generations)) { res.status(400).json({ error: "Invalid params" }); return; }

  // One CTE query fetches the root + all ancestors at once
  const result = await db.execute(sql`
    WITH RECURSIVE pedigree_cte AS (
      SELECT d.id, d.registered_name, d.call_name, d.registration_number, d.sex,
             d.breed_id, d.sire_id, d.dam_id, d.photo_url, d.is_external, 0 AS depth
      FROM dogs d WHERE d.id = ${dogId}
      UNION ALL
      SELECT d.id, d.registered_name, d.call_name, d.registration_number, d.sex,
             d.breed_id, d.sire_id, d.dam_id, d.photo_url, d.is_external, p.depth + 1
      FROM dogs d
      INNER JOIN pedigree_cte p ON (d.id = p.sire_id OR d.id = p.dam_id) AND p.depth < ${generations}
    )
    SELECT DISTINCT ON (pc.id) pc.id, pc.registered_name, pc.call_name, pc.registration_number,
           pc.sex, pc.sire_id, pc.dam_id, pc.photo_url, pc.is_external, b.name AS breed_name
    FROM pedigree_cte pc
    LEFT JOIN breeds b ON b.id = pc.breed_id
    ORDER BY pc.id
  `);

  const rows = result.rows as unknown as PedigreeRow[];
  if (rows.length === 0) { res.status(404).json({ error: "Dog not found" }); return; }

  const byId = new Map(rows.map(r => [r.id, r]));
  const root = buildTreeFromFlat(dogId, byId, 0, generations, new Set());
  if (!root) { res.status(404).json({ error: "Dog not found" }); return; }

  const ancestorCounts = new Map<number, number>();
  if (root.sire) collectIds(root.sire, ancestorCounts);
  if (root.dam) collectIds(root.dam, ancestorCounts);

  const duplicateNames = Array.from(ancestorCounts.entries())
    .filter(([, cnt]) => cnt > 1)
    .map(([id]) => byId.get(id)?.registered_name)
    .filter(Boolean) as string[];

  res.json({ dog: root, generations, coi: null, duplicateAncestors: duplicateNames });
});

// ─── Save pedigree (PUT /dogs/:dogId/pedigree) ────────────────────────────────
router.put("/dogs/:dogId/pedigree", async (req, res): Promise<void> => {
  const dogId = parseInt(Array.isArray(req.params.dogId) ? req.params.dogId[0] : req.params.dogId, 10);
  if (isNaN(dogId)) { res.status(400).json({ error: "Invalid dogId" }); return; }
  const [dog] = await db.select().from(dogsTable).where(eq(dogsTable.id, dogId));
  if (!dog) { res.status(404).json({ error: "Dog not found" }); return; }

  const parsed = SavePedigreeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const inp = parsed.data;

  const sireId = await findOrCreateAncestor(inp.sire ?? {}, "male");
  const damId = await findOrCreateAncestor(inp.dam ?? {}, "female");
  const sireSireId = await findOrCreateAncestor(inp.sireSire ?? {}, "male");
  const sireDamId = await findOrCreateAncestor(inp.sireDam ?? {}, "female");
  const damSireId = await findOrCreateAncestor(inp.damSire ?? {}, "male");
  const damDamId = await findOrCreateAncestor(inp.damDam ?? {}, "female");
  const sireSireSireId = await findOrCreateAncestor(inp.sireSireSire ?? {}, "male");
  const sireSireDamId = await findOrCreateAncestor(inp.sireSireDam ?? {}, "female");
  const sireDamSireId = await findOrCreateAncestor(inp.sireDamSire ?? {}, "male");
  const sireDamDamId = await findOrCreateAncestor(inp.sireDamDam ?? {}, "female");
  const damSireSireId = await findOrCreateAncestor(inp.damSireSire ?? {}, "male");
  const damSireDamId = await findOrCreateAncestor(inp.damSireDam ?? {}, "female");
  const damDamSireId = await findOrCreateAncestor(inp.damDamSire ?? {}, "male");
  const damDamDamId = await findOrCreateAncestor(inp.damDamDam ?? {}, "female");

  async function wireParents(childId: number | null, newSireId: number | null, newDamId: number | null) {
    if (!childId) return;
    const [child] = await db.select().from(dogsTable).where(eq(dogsTable.id, childId));
    if (!child || child.isExternal !== "true") return;
    await db.update(dogsTable).set({ sireId: newSireId, damId: newDamId }).where(eq(dogsTable.id, childId));
  }

  await wireParents(sireId, sireSireId, sireDamId);
  await wireParents(damId, damSireId, damDamId);
  await wireParents(sireSireId, sireSireSireId, sireSireDamId);
  await wireParents(sireDamId, sireDamSireId, sireDamDamId);
  await wireParents(damSireId, damSireSireId, damSireDamId);
  await wireParents(damDamId, damDamSireId, damDamDamId);

  await db.update(dogsTable).set({ sireId, damId }).where(eq(dogsTable.id, dogId));

  // Return updated pedigree using the CTE
  const result = await db.execute(sql`
    WITH RECURSIVE pedigree_cte AS (
      SELECT d.id, d.registered_name, d.call_name, d.registration_number, d.sex,
             d.breed_id, d.sire_id, d.dam_id, d.photo_url, d.is_external, 0 AS depth
      FROM dogs d WHERE d.id = ${dogId}
      UNION ALL
      SELECT d.id, d.registered_name, d.call_name, d.registration_number, d.sex,
             d.breed_id, d.sire_id, d.dam_id, d.photo_url, d.is_external, p.depth + 1
      FROM dogs d
      INNER JOIN pedigree_cte p ON (d.id = p.sire_id OR d.id = p.dam_id) AND p.depth < 3
    )
    SELECT DISTINCT ON (pc.id) pc.id, pc.registered_name, pc.call_name, pc.registration_number,
           pc.sex, pc.sire_id, pc.dam_id, pc.photo_url, pc.is_external, b.name AS breed_name
    FROM pedigree_cte pc
    LEFT JOIN breeds b ON b.id = pc.breed_id
    ORDER BY pc.id
  `);

  const rows = result.rows as unknown as PedigreeRow[];
  const byId = new Map(rows.map(r => [r.id, r]));
  const root = buildTreeFromFlat(dogId, byId, 0, 3, new Set());
  res.json({ dog: root, generations: 3, coi: null, duplicateAncestors: [] });
});

// ─── Health Tests ─────────────────────────────────────────────────────────────
router.get("/dogs/:dogId/health-tests", async (req, res): Promise<void> => {
  const dogId = parseInt(Array.isArray(req.params.dogId) ? req.params.dogId[0] : req.params.dogId, 10);
  if (isNaN(dogId)) { res.status(400).json({ error: "Invalid dogId" }); return; }
  const tests = await db.select().from(healthTestResultsTable)
    .where(eq(healthTestResultsTable.dogId, dogId))
    .orderBy(healthTestResultsTable.date);
  res.json(tests.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })));
});

router.post("/dogs/:dogId/health-tests", async (req, res): Promise<void> => {
  const dogId = parseInt(Array.isArray(req.params.dogId) ? req.params.dogId[0] : req.params.dogId, 10);
  if (isNaN(dogId)) { res.status(400).json({ error: "Invalid dogId" }); return; }
  const parsed = CreateHealthTestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [test] = await db.insert(healthTestResultsTable).values({ ...parsed.data, dogId }).returning();
  res.status(201).json({ ...test, createdAt: test.createdAt.toISOString() });
});

router.patch("/dogs/:dogId/health-tests/:testId", async (req, res): Promise<void> => {
  const testId = parseInt(Array.isArray(req.params.testId) ? req.params.testId[0] : req.params.testId, 10);
  if (isNaN(testId)) { res.status(400).json({ error: "Invalid testId" }); return; }
  const parsed = UpdateHealthTestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [test] = await db.update(healthTestResultsTable).set(parsed.data)
    .where(eq(healthTestResultsTable.id, testId)).returning();
  if (!test) { res.status(404).json({ error: "Test not found" }); return; }
  res.json({ ...test, createdAt: test.createdAt.toISOString() });
});

router.delete("/dogs/:dogId/health-tests/:testId", async (req, res): Promise<void> => {
  const testId = parseInt(Array.isArray(req.params.testId) ? req.params.testId[0] : req.params.testId, 10);
  if (isNaN(testId)) { res.status(400).json({ error: "Invalid testId" }); return; }
  await db.delete(healthTestResultsTable).where(eq(healthTestResultsTable.id, testId));
  res.sendStatus(204);
});

// ─── Heat Cycles ──────────────────────────────────────────────────────────────
router.get("/dogs/:dogId/heat-cycles", async (req, res): Promise<void> => {
  const dogId = parseInt(Array.isArray(req.params.dogId) ? req.params.dogId[0] : req.params.dogId, 10);
  if (isNaN(dogId)) { res.status(400).json({ error: "Invalid dogId" }); return; }
  const cycles = await db.select().from(heatCyclesTable)
    .where(eq(heatCyclesTable.dogId, dogId))
    .orderBy(heatCyclesTable.startDate);
  res.json(cycles.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

router.post("/dogs/:dogId/heat-cycles", async (req, res): Promise<void> => {
  const dogId = parseInt(Array.isArray(req.params.dogId) ? req.params.dogId[0] : req.params.dogId, 10);
  if (isNaN(dogId)) { res.status(400).json({ error: "Invalid dogId" }); return; }
  const parsed = CreateHeatCycleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [cycle] = await db.insert(heatCyclesTable).values({ ...parsed.data, dogId }).returning();
  res.status(201).json({ ...cycle, createdAt: cycle.createdAt.toISOString() });
});

router.patch("/dogs/:dogId/heat-cycles/:cycleId", async (req, res): Promise<void> => {
  const cycleId = parseInt(Array.isArray(req.params.cycleId) ? req.params.cycleId[0] : req.params.cycleId, 10);
  if (isNaN(cycleId)) { res.status(400).json({ error: "Invalid cycleId" }); return; }
  const parsed = UpdateHeatCycleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [cycle] = await db.update(heatCyclesTable).set(parsed.data)
    .where(eq(heatCyclesTable.id, cycleId)).returning();
  if (!cycle) { res.status(404).json({ error: "Cycle not found" }); return; }
  res.json({ ...cycle, createdAt: cycle.createdAt.toISOString() });
});

router.delete("/dogs/:dogId/heat-cycles/:cycleId", async (req, res): Promise<void> => {
  const cycleId = parseInt(Array.isArray(req.params.cycleId) ? req.params.cycleId[0] : req.params.cycleId, 10);
  if (isNaN(cycleId)) { res.status(400).json({ error: "Invalid cycleId" }); return; }
  await db.delete(heatCyclesTable).where(eq(heatCyclesTable.id, cycleId));
  res.status(204).send();
});

// ─── Progesterone ─────────────────────────────────────────────────────────────
router.get("/dogs/:dogId/progesterone", async (req, res): Promise<void> => {
  const dogId = parseInt(Array.isArray(req.params.dogId) ? req.params.dogId[0] : req.params.dogId, 10);
  if (isNaN(dogId)) { res.status(400).json({ error: "Invalid dogId" }); return; }
  const readings = await db.select().from(progesteroneReadingsTable)
    .where(eq(progesteroneReadingsTable.dogId, dogId))
    .orderBy(progesteroneReadingsTable.date);
  res.json(readings.map(r => ({
    ...r,
    value: parseFloat(r.value),
    ovulationPredicted: r.ovulationPredicted === "true" ? true : r.ovulationPredicted === "false" ? false : null,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/dogs/:dogId/progesterone", async (req, res): Promise<void> => {
  const dogId = parseInt(Array.isArray(req.params.dogId) ? req.params.dogId[0] : req.params.dogId, 10);
  if (isNaN(dogId)) { res.status(400).json({ error: "Invalid dogId" }); return; }
  const parsed = CreateProgesteroneReadingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const value = parsed.data.value;
  const units = parsed.data.units;
  let ovulationPredicted = false;
  let recommendation = "Continue monitoring";

  if (units === "nmol/L") {
    if (value >= 5 && value < 15) {
      ovulationPredicted = true;
      recommendation = "LH surge detected — ovulation imminent. Breed in 2-3 days.";
    } else if (value >= 15) {
      ovulationPredicted = true;
      recommendation = "Optimal breeding window. AI or natural mating recommended today.";
    }
  } else if (units === "ng/mL") {
    if (value >= 1.5 && value < 5) {
      ovulationPredicted = true;
      recommendation = "LH surge detected — ovulation imminent. Breed in 2-3 days.";
    } else if (value >= 5) {
      ovulationPredicted = true;
      recommendation = "Optimal breeding window. AI or natural mating recommended today.";
    }
  }

  const [reading] = await db.insert(progesteroneReadingsTable).values({
    ...parsed.data,
    value: String(parsed.data.value),
    dogId,
    ovulationPredicted: String(ovulationPredicted),
    recommendation,
  }).returning();
  res.status(201).json({
    ...reading,
    value: parseFloat(reading.value),
    ovulationPredicted,
    createdAt: reading.createdAt.toISOString(),
  });
});

export default router;
