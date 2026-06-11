import { Router } from "express";
import { db } from "@workspace/db";
import {
  familyPetsTable, petVaccinationsTable, petVetVisitsTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// ── List pets ──────────────────────────────────────────────────────────────────
router.get("/pets", async (req, res) => {
  const pets = await db.select().from(familyPetsTable).orderBy(familyPetsTable.name);
  res.json(pets);
});

// ── Create pet ─────────────────────────────────────────────────────────────────
router.post("/pets", async (req, res) => {
  const { name, species, breed, sex, dob, colour, microchip, vetName, vetPhone, notes, photoUrl, status } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }

  const [pet] = await db.insert(familyPetsTable).values({
    name: name.trim(),
    species: species ?? "dog",
    breed: breed ?? null,
    sex: sex ?? null,
    dob: dob ?? null,
    colour: colour ?? null,
    microchip: microchip ?? null,
    vetName: vetName ?? null,
    vetPhone: vetPhone ?? null,
    notes: notes ?? null,
    photoUrl: photoUrl ?? null,
    status: status ?? "alive",
  }).returning();

  res.status(201).json(pet);
});

// ── Get pet ────────────────────────────────────────────────────────────────────
router.get("/pets/:petId", async (req, res) => {
  const petId = parseInt(req.params.petId);
  if (isNaN(petId)) { res.status(400).json({ error: "invalid petId" }); return; }

  const [pet] = await db.select().from(familyPetsTable).where(eq(familyPetsTable.id, petId));
  if (!pet) { res.status(404).json({ error: "not found" }); return; }
  res.json(pet);
});

// ── Update pet ─────────────────────────────────────────────────────────────────
router.put("/pets/:petId", async (req, res) => {
  const petId = parseInt(req.params.petId);
  if (isNaN(petId)) { res.status(400).json({ error: "invalid petId" }); return; }

  const { name, species, breed, sex, dob, colour, microchip, vetName, vetPhone, notes, photoUrl, status } = req.body;
  const [pet] = await db.update(familyPetsTable).set({
    name: name?.trim(),
    species,
    breed: breed ?? null,
    sex: sex ?? null,
    dob: dob ?? null,
    colour: colour ?? null,
    microchip: microchip ?? null,
    vetName: vetName ?? null,
    vetPhone: vetPhone ?? null,
    notes: notes ?? null,
    photoUrl: photoUrl ?? null,
    status: status ?? "alive",
  }).where(eq(familyPetsTable.id, petId)).returning();

  if (!pet) { res.status(404).json({ error: "not found" }); return; }
  res.json(pet);
});

// ── Delete pet ─────────────────────────────────────────────────────────────────
router.delete("/pets/:petId", async (req, res) => {
  const petId = parseInt(req.params.petId);
  if (isNaN(petId)) { res.status(400).json({ error: "invalid petId" }); return; }
  await db.delete(familyPetsTable).where(eq(familyPetsTable.id, petId));
  res.status(204).send();
});

// ── Vaccinations ───────────────────────────────────────────────────────────────
router.get("/pets/:petId/vaccinations", async (req, res) => {
  const petId = parseInt(req.params.petId);
  if (isNaN(petId)) { res.status(400).json({ error: "invalid petId" }); return; }
  const rows = await db.select().from(petVaccinationsTable)
    .where(eq(petVaccinationsTable.petId, petId))
    .orderBy(petVaccinationsTable.dateGiven);
  res.json(rows);
});

router.post("/pets/:petId/vaccinations", async (req, res) => {
  const petId = parseInt(req.params.petId);
  if (isNaN(petId)) { res.status(400).json({ error: "invalid petId" }); return; }
  const { vaccine, dateGiven, nextDueDate, vet, notes } = req.body;
  if (!vaccine?.trim()) { res.status(400).json({ error: "vaccine is required" }); return; }

  const [row] = await db.insert(petVaccinationsTable).values({
    petId,
    vaccine: vaccine.trim(),
    dateGiven: dateGiven ?? null,
    nextDueDate: nextDueDate ?? null,
    vet: vet ?? null,
    notes: notes ?? null,
  }).returning();
  res.status(201).json(row);
});

router.delete("/pets/:petId/vaccinations/:vaccinationId", async (req, res) => {
  const vaccinationId = parseInt(req.params.vaccinationId);
  if (isNaN(vaccinationId)) { res.status(400).json({ error: "invalid vaccinationId" }); return; }
  await db.delete(petVaccinationsTable).where(eq(petVaccinationsTable.id, vaccinationId));
  res.status(204).send();
});

// ── Vet Visits ─────────────────────────────────────────────────────────────────
router.get("/pets/:petId/vet-visits", async (req, res) => {
  const petId = parseInt(req.params.petId);
  if (isNaN(petId)) { res.status(400).json({ error: "invalid petId" }); return; }
  const rows = await db.select().from(petVetVisitsTable)
    .where(eq(petVetVisitsTable.petId, petId))
    .orderBy(petVetVisitsTable.date);
  res.json(rows);
});

router.post("/pets/:petId/vet-visits", async (req, res) => {
  const petId = parseInt(req.params.petId);
  if (isNaN(petId)) { res.status(400).json({ error: "invalid petId" }); return; }
  const { date, reason, vet, notes, cost } = req.body;
  if (!date || !reason?.trim()) { res.status(400).json({ error: "date and reason are required" }); return; }

  const [row] = await db.insert(petVetVisitsTable).values({
    petId,
    date,
    reason: reason.trim(),
    vet: vet ?? null,
    notes: notes ?? null,
    cost: cost ?? null,
  }).returning();
  res.status(201).json(row);
});

router.delete("/pets/:petId/vet-visits/:visitId", async (req, res) => {
  const visitId = parseInt(req.params.visitId);
  if (isNaN(visitId)) { res.status(400).json({ error: "invalid visitId" }); return; }
  await db.delete(petVetVisitsTable).where(eq(petVetVisitsTable.id, visitId));
  res.status(204).send();
});

export default router;
