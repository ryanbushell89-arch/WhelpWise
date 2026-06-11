import { Router, type IRouter } from "express";
import { db, dogsTable, littersTable, puppiesTable, studListingsTable, breedingsTable, weightEntriesTable } from "@workspace/db";
import { count, eq, and, gte, ne, isNull, sql } from "drizzle-orm";
import { type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request } from "express";

const router: IRouter = Router();

function uid(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const userId = uid(req);

  const [dogsResult] = await db.select({ total: count() }).from(dogsTable)
    .where(and(eq(dogsTable.userId, userId), ne(dogsTable.isExternal, "true")));

  const [littersResult] = await db.select({ total: count() }).from(littersTable)
    .where(and(eq(littersTable.userId, userId), sql`${littersTable.status} IN ('expected', 'whelped')`));

  const [puppiesResult] = await db.select({ total: count() }).from(puppiesTable)
    .innerJoin(littersTable, and(
      eq(puppiesTable.litterId, littersTable.id),
      eq(littersTable.userId, userId),
    ))
    .where(eq(puppiesTable.alive, "true"));

  const [studResult] = await db.select({ total: count() }).from(studListingsTable)
    .where(and(eq(studListingsTable.userId, userId), eq(studListingsTable.active, "true")));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [breedingsResult] = await db.select({ total: count() }).from(breedingsTable)
    .where(and(eq(breedingsTable.userId, userId), gte(breedingsTable.date, sevenDaysAgo)));

  const today = new Date().toISOString().split("T")[0];
  const [upcomingResult] = await db.select({ total: count() }).from(littersTable)
    .where(and(
      eq(littersTable.userId, userId),
      eq(littersTable.status, "expected"),
      gte(littersTable.dob, today),
    ));

  res.json({
    totalDogs: dogsResult?.total ?? 0,
    activeLitters: littersResult?.total ?? 0,
    totalPuppies: puppiesResult?.total ?? 0,
    studListings: studResult?.total ?? 0,
    upcomingWhelpings: upcomingResult?.total ?? 0,
    recentBreedings: breedingsResult?.total ?? 0,
  });
});

router.get("/dashboard/alerts", async (req, res): Promise<void> => {
  const userId = uid(req);
  const alerts: Array<{
    id: string;
    type: string;
    message: string;
    severity: "info" | "warning" | "urgent";
    relatedId?: number | null;
    relatedType?: string | null;
  }> = [];

  // ── Fix #1: Replace N+1 loop with a single LEFT JOIN query ────────────────
  // Find all alive puppies in whelped litters (owned by this user) that have
  // no weight entry in the past 24 hours.
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const puppiesNeedingWeights = await db
    .select({
      id: puppiesTable.id,
      collarColour: puppiesTable.collarColour,
      sex: puppiesTable.sex,
      recentWeightId: weightEntriesTable.id,
    })
    .from(puppiesTable)
    .innerJoin(littersTable, and(
      eq(puppiesTable.litterId, littersTable.id),
      eq(littersTable.status, "whelped"),
      eq(littersTable.userId, userId),
    ))
    .leftJoin(weightEntriesTable, and(
      eq(weightEntriesTable.puppyId, puppiesTable.id),
      gte(weightEntriesTable.date, yesterday),
    ))
    .where(and(
      eq(puppiesTable.alive, "true"),
      isNull(weightEntriesTable.id),
    ));

  for (const puppy of puppiesNeedingWeights) {
    alerts.push({
      id: `missing-weight-${puppy.id}`,
      type: "missing_weight",
      message: `Puppy #${puppy.id} (${puppy.collarColour ?? puppy.sex}) is missing today's weight entry`,
      severity: "warning",
      relatedId: puppy.id,
      relatedType: "puppy",
    });
  }

  // ── Due litters (owned by this user) ──────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const nearDueLitters = await db.select().from(littersTable)
    .where(and(
      eq(littersTable.userId, userId),
      eq(littersTable.status, "expected"),
      sql`${littersTable.dob} IS NOT NULL`,
      sql`${littersTable.dob} <= ${threeDaysLater}`,
      sql`${littersTable.dob} >= ${today}`,
    ));

  for (const litter of nearDueLitters) {
    alerts.push({
      id: `due-litter-${litter.id}`,
      type: "due_soon",
      message: `Litter #${litter.id} expected on ${litter.dob} — prepare whelping box`,
      severity: "urgent",
      relatedId: litter.id,
      relatedType: "litter",
    });
  }

  // ── Stud listings expiring soon (owned by this user) ──────────────────────
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const expiringListings = await db.select().from(studListingsTable)
    .where(and(
      eq(studListingsTable.userId, userId),
      eq(studListingsTable.active, "true"),
      sql`${studListingsTable.expiresAt} IS NOT NULL`,
      sql`${studListingsTable.expiresAt} <= ${sevenDaysLater}`,
    ));

  for (const listing of expiringListings) {
    alerts.push({
      id: `expiring-stud-${listing.id}`,
      type: "expiring_listing",
      message: `Stud listing #${listing.id} expires on ${listing.expiresAt}`,
      severity: "warning",
      relatedId: listing.id,
      relatedType: "stud_listing",
    });
  }

  res.json(alerts);
});

export default router;
