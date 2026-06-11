import { Router, type IRouter } from "express";
import { db, studListingsTable, dogsTable, breedsTable, healthTestResultsTable } from "@workspace/db";
import { eq, ilike, and } from "drizzle-orm";
import {
  ListStudListingsQueryParams,
  CreateStudListingBody,
  UpdateStudListingBody,
} from "@workspace/api-zod";
import { type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request } from "express";

const router: IRouter = Router();

function uid(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

async function studWithDetails(s: typeof studListingsTable.$inferSelect) {
  const [dog] = await db.select().from(dogsTable).where(eq(dogsTable.id, s.dogId));
  let breedName: string | null = null;
  if (dog?.breedId) {
    const [breed] = await db.select().from(breedsTable).where(eq(breedsTable.id, dog.breedId));
    breedName = breed?.name ?? null;
  }
  const healthTests = await db.select().from(healthTestResultsTable)
    .where(eq(healthTestResultsTable.dogId, s.dogId));
  const healthTested = healthTests.length > 0;

  return {
    id: s.id,
    dogId: s.dogId,
    dogName: dog?.registeredName ?? "Unknown",
    breedName,
    photoUrl: dog?.photoUrl ?? null,
    studFee: s.studFee,
    currency: s.currency,
    country: s.country,
    location: s.location,
    description: s.description,
    healthTested,
    active: s.active === "true",
    expiresAt: s.expiresAt,
    createdAt: s.createdAt.toISOString(),
  };
}

// GET — public directory: shows all active listings from all users
router.get("/stud-listings", async (req, res): Promise<void> => {
  const parsed = ListStudListingsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  let listings = await db.select().from(studListingsTable)
    .where(eq(studListingsTable.active, "true"))
    .orderBy(studListingsTable.createdAt);

  if (parsed.data.country) {
    listings = listings.filter(l => l.country?.toLowerCase().includes(parsed.data.country!.toLowerCase()));
  }

  const enriched = await Promise.all(listings.map(studWithDetails));

  let result = enriched;
  if (parsed.data.breed) {
    result = result.filter(s => s.breedName?.toLowerCase().includes(parsed.data.breed!.toLowerCase()));
  }
  if (parsed.data.healthStatus === "tested") {
    result = result.filter(s => s.healthTested);
  }

  res.json(result);
});

// POST — user-scoped: creates listing owned by the current user
router.post("/stud-listings", async (req, res): Promise<void> => {
  const userId = uid(req);
  const parsed = CreateStudListingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [listing] = await db.insert(studListingsTable).values({
    ...parsed.data,
    userId,
    healthTested: "false",
    active: "true",
  }).returning();
  res.status(201).json(await studWithDetails(listing));
});

router.get("/stud-listings/:listingId", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.listingId) ? req.params.listingId[0] : req.params.listingId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid listingId" }); return; }
  const [listing] = await db.select().from(studListingsTable).where(eq(studListingsTable.id, id));
  if (!listing) { res.status(404).json({ error: "Stud listing not found" }); return; }
  res.json(await studWithDetails(listing));
});

// PATCH / DELETE — ownership-verified: only the owning user can modify
router.patch("/stud-listings/:listingId", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseInt(Array.isArray(req.params.listingId) ? req.params.listingId[0] : req.params.listingId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid listingId" }); return; }
  const parsed = UpdateStudListingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Record<string, any> = { ...parsed.data };
  if (parsed.data.active !== undefined) updateData.active = String(parsed.data.active);
  const [listing] = await db.update(studListingsTable).set(updateData)
    .where(and(eq(studListingsTable.id, id), eq(studListingsTable.userId, userId)))
    .returning();
  if (!listing) { res.status(404).json({ error: "Stud listing not found" }); return; }
  res.json(await studWithDetails(listing));
});

router.delete("/stud-listings/:listingId", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseInt(Array.isArray(req.params.listingId) ? req.params.listingId[0] : req.params.listingId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid listingId" }); return; }
  await db.delete(studListingsTable)
    .where(and(eq(studListingsTable.id, id), eq(studListingsTable.userId, userId)));
  res.sendStatus(204);
});

export default router;
