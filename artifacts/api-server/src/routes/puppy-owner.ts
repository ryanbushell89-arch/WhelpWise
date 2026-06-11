import { Router } from "express";
import { db } from "@workspace/db";
import {
  puppiesTable,
  littersTable,
  weightEntriesTable,
  puppyVaccinationsTable,
  puppyWormingTable,
  puppyDocumentsTable,
  buyersTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requirePuppyOwner, type PuppyOwnerRequest } from "../middlewares/requirePuppyOwner";
import type { Request } from "express";

const router = Router();

router.use(requireAuth, requirePuppyOwner);

// GET /puppy-owner/me — account + puppy profile
router.get("/puppy-owner/me", async (req, res): Promise<void> => {
  const { puppyOwnerAccount } = req as PuppyOwnerRequest;
  const puppyId = puppyOwnerAccount.puppyId;

  const [puppyRow] = await db
    .select({
      id: puppiesTable.id,
      name: puppiesTable.name,
      callName: puppiesTable.callName,
      registeredName: puppiesTable.registeredName,
      sex: puppiesTable.sex,
      colour: puppiesTable.colour,
      markings: puppiesTable.markings,
      collarColour: puppiesTable.collarColour,
      photoUrl: puppiesTable.photoUrl,
      birthWeight: puppiesTable.birthWeight,
      birthTime: puppiesTable.birthTime,
      notes: puppiesTable.notes,
      createdAt: puppiesTable.createdAt,
      litterDob: littersTable.dob,
      breederUserId: littersTable.userId,
      buyerFirstName: buyersTable.firstName,
      buyerLastName: buyersTable.lastName,
    })
    .from(puppiesTable)
    .leftJoin(littersTable, eq(puppiesTable.litterId, littersTable.id))
    .leftJoin(buyersTable, eq(puppiesTable.buyerId, buyersTable.id))
    .where(eq(puppiesTable.id, puppyId));

  if (!puppyRow) {
    res.status(404).json({ error: "Puppy not found" });
    return;
  }

  res.json({
    account: puppyOwnerAccount,
    puppy: puppyRow,
  });
});

// GET /puppy-owner/weights — weight history
router.get("/puppy-owner/weights", async (req, res): Promise<void> => {
  const { puppyOwnerAccount } = req as PuppyOwnerRequest;

  const weights = await db
    .select()
    .from(weightEntriesTable)
    .where(eq(weightEntriesTable.puppyId, puppyOwnerAccount.puppyId))
    .orderBy(weightEntriesTable.date);

  res.json(weights);
});

// GET /puppy-owner/vaccinations — vaccination records
router.get("/puppy-owner/vaccinations", async (req, res): Promise<void> => {
  const { puppyOwnerAccount } = req as PuppyOwnerRequest;

  const vaccinations = await db
    .select()
    .from(puppyVaccinationsTable)
    .where(eq(puppyVaccinationsTable.puppyId, puppyOwnerAccount.puppyId))
    .orderBy(desc(puppyVaccinationsTable.date));

  res.json(vaccinations);
});

// GET /puppy-owner/worming — worming records
router.get("/puppy-owner/worming", async (req, res): Promise<void> => {
  const { puppyOwnerAccount } = req as PuppyOwnerRequest;

  const worming = await db
    .select()
    .from(puppyWormingTable)
    .where(eq(puppyWormingTable.puppyId, puppyOwnerAccount.puppyId))
    .orderBy(desc(puppyWormingTable.date));

  res.json(worming);
});

// GET /puppy-owner/documents — documents
router.get("/puppy-owner/documents", async (req, res): Promise<void> => {
  const { puppyOwnerAccount } = req as PuppyOwnerRequest;

  const documents = await db
    .select()
    .from(puppyDocumentsTable)
    .where(eq(puppyDocumentsTable.puppyId, puppyOwnerAccount.puppyId))
    .orderBy(desc(puppyDocumentsTable.createdAt));

  res.json(documents);
});

// GET /puppy-owner/health-reminders — overdue vaccines + worming alerts
router.get("/puppy-owner/health-reminders", async (req, res): Promise<void> => {
  const { puppyOwnerAccount } = req as PuppyOwnerRequest;
  const puppyId = puppyOwnerAccount.puppyId;
  const today = new Date().toISOString().split("T")[0];

  const overdueVaccines = await db
    .select()
    .from(puppyVaccinationsTable)
    .where(eq(puppyVaccinationsTable.puppyId, puppyId));

  const overdueVaccineAlerts = overdueVaccines
    .filter((v) => v.nextDueDate && v.nextDueDate <= today)
    .map((v) => ({
      type: "vaccine" as const,
      vaccineName: v.vaccineName,
      dueDate: v.nextDueDate,
      overdueDays: Math.floor(
        (Date.now() - new Date(v.nextDueDate!).getTime()) / (1000 * 60 * 60 * 24),
      ),
    }));

  const allWorming = await db
    .select()
    .from(puppyWormingTable)
    .where(eq(puppyWormingTable.puppyId, puppyId))
    .orderBy(desc(puppyWormingTable.date))
    .limit(1);

  const wormingAlerts: Array<{ type: "worming"; lastDate: string | null; daysSinceLast: number }> = [];
  const WORMING_INTERVAL_DAYS = 14;

  if (allWorming.length === 0) {
    wormingAlerts.push({ type: "worming", lastDate: null, daysSinceLast: 999 });
  } else {
    const lastWormingDate = new Date(allWorming[0].date);
    const daysSince = Math.floor((Date.now() - lastWormingDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= WORMING_INTERVAL_DAYS) {
      wormingAlerts.push({ type: "worming", lastDate: allWorming[0].date, daysSinceLast: daysSince });
    }
  }

  res.json({
    overdueVaccines: overdueVaccineAlerts,
    wormingAlerts,
    total: overdueVaccineAlerts.length + wormingAlerts.length,
  });
});

export default router;
