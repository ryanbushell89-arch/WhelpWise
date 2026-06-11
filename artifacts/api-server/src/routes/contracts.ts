import { Router } from "express";
import { db } from "@workspace/db";
import { contractsTable, waitingListTable, puppiesTable, studListingsTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

const router = Router();

async function enrichContract(c: typeof contractsTable.$inferSelect) {
  let puppyName: string | null = null;
  let studName: string | null = null;

  if (c.puppyId) {
    const [p] = await db.select().from(puppiesTable).where(eq(puppiesTable.id, c.puppyId));
    puppyName = p ? (p.callName ?? `Puppy #${p.id}`) : null;
  }
  if (c.studListingId) {
    const [s] = await db.select().from(studListingsTable).where(eq(studListingsTable.id, c.studListingId));
    studName = s ? `Stud #${s.id}` : null;
  }

  return { ...c, puppyName, studName };
}

// ── List ───────────────────────────────────────────────────────────────────────
router.get("/contracts", async (req, res) => {
  const contracts = await db.select().from(contractsTable).orderBy(asc(contractsTable.createdAt));
  const enriched = await Promise.all(contracts.map(enrichContract));
  res.json(enriched);
});

// ── Create ─────────────────────────────────────────────────────────────────────
router.post("/contracts", async (req, res) => {
  const {
    type, status, puppyId, studListingId, waitingListId,
    buyerName, buyerEmail, buyerPhone, buyerAddress,
    bitchOwnerName, bitchOwnerEmail, bitchOwnerPhone, bitchOwnerAddress,
    bitchName, bitchRegNumber, bitchBreed,
    salePrice, depositAmount, balanceDue, balanceDueDate,
    studFee, studFeePaymentTerms,
    specialConditions, returnPolicy, healthGuarantee,
    templateUrl, signedContractUrl, notes, contractDate,
  } = req.body;

  if (!type) { res.status(400).json({ error: "type is required" }); return; }

  const [contract] = await db.insert(contractsTable).values({
    type,
    status: status ?? "draft",
    puppyId: puppyId ? parseInt(puppyId) : null,
    studListingId: studListingId ? parseInt(studListingId) : null,
    waitingListId: waitingListId ? parseInt(waitingListId) : null,
    buyerName: buyerName ?? null,
    buyerEmail: buyerEmail ?? null,
    buyerPhone: buyerPhone ?? null,
    buyerAddress: buyerAddress ?? null,
    bitchOwnerName: bitchOwnerName ?? null,
    bitchOwnerEmail: bitchOwnerEmail ?? null,
    bitchOwnerPhone: bitchOwnerPhone ?? null,
    bitchOwnerAddress: bitchOwnerAddress ?? null,
    bitchName: bitchName ?? null,
    bitchRegNumber: bitchRegNumber ?? null,
    bitchBreed: bitchBreed ?? null,
    salePrice: salePrice ?? null,
    depositAmount: depositAmount ?? null,
    balanceDue: balanceDue ?? null,
    balanceDueDate: balanceDueDate ?? null,
    studFee: studFee ?? null,
    studFeePaymentTerms: studFeePaymentTerms ?? null,
    specialConditions: specialConditions ?? null,
    returnPolicy: returnPolicy ?? null,
    healthGuarantee: healthGuarantee ?? null,
    templateUrl: templateUrl ?? null,
    signedContractUrl: signedContractUrl ?? null,
    notes: notes ?? null,
    contractDate: contractDate ?? null,
  }).returning();

  res.status(201).json(await enrichContract(contract));
});

// ── Get ────────────────────────────────────────────────────────────────────────
router.get("/contracts/:contractId", async (req, res) => {
  const contractId = parseInt(req.params.contractId);
  if (isNaN(contractId)) { res.status(400).json({ error: "invalid contractId" }); return; }

  const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.id, contractId));
  if (!contract) { res.status(404).json({ error: "not found" }); return; }

  res.json(await enrichContract(contract));
});

// ── Update ─────────────────────────────────────────────────────────────────────
router.put("/contracts/:contractId", async (req, res) => {
  const contractId = parseInt(req.params.contractId);
  if (isNaN(contractId)) { res.status(400).json({ error: "invalid contractId" }); return; }

  const {
    type, status, puppyId, studListingId, waitingListId,
    buyerName, buyerEmail, buyerPhone, buyerAddress,
    bitchOwnerName, bitchOwnerEmail, bitchOwnerPhone, bitchOwnerAddress,
    bitchName, bitchRegNumber, bitchBreed,
    salePrice, depositAmount, balanceDue, balanceDueDate,
    studFee, studFeePaymentTerms,
    specialConditions, returnPolicy, healthGuarantee,
    templateUrl, signedContractUrl, notes, contractDate,
  } = req.body;

  const [contract] = await db.update(contractsTable).set({
    type,
    status,
    puppyId: puppyId ? parseInt(puppyId) : null,
    studListingId: studListingId ? parseInt(studListingId) : null,
    waitingListId: waitingListId ? parseInt(waitingListId) : null,
    buyerName: buyerName ?? null,
    buyerEmail: buyerEmail ?? null,
    buyerPhone: buyerPhone ?? null,
    buyerAddress: buyerAddress ?? null,
    bitchOwnerName: bitchOwnerName ?? null,
    bitchOwnerEmail: bitchOwnerEmail ?? null,
    bitchOwnerPhone: bitchOwnerPhone ?? null,
    bitchOwnerAddress: bitchOwnerAddress ?? null,
    bitchName: bitchName ?? null,
    bitchRegNumber: bitchRegNumber ?? null,
    bitchBreed: bitchBreed ?? null,
    salePrice: salePrice ?? null,
    depositAmount: depositAmount ?? null,
    balanceDue: balanceDue ?? null,
    balanceDueDate: balanceDueDate ?? null,
    studFee: studFee ?? null,
    studFeePaymentTerms: studFeePaymentTerms ?? null,
    specialConditions: specialConditions ?? null,
    returnPolicy: returnPolicy ?? null,
    healthGuarantee: healthGuarantee ?? null,
    templateUrl: templateUrl ?? null,
    signedContractUrl: signedContractUrl ?? null,
    notes: notes ?? null,
    contractDate: contractDate ?? null,
  }).where(eq(contractsTable.id, contractId)).returning();

  if (!contract) { res.status(404).json({ error: "not found" }); return; }
  res.json(await enrichContract(contract));
});

// ── Delete ─────────────────────────────────────────────────────────────────────
router.delete("/contracts/:contractId", async (req, res) => {
  const contractId = parseInt(req.params.contractId);
  if (isNaN(contractId)) { res.status(400).json({ error: "invalid contractId" }); return; }
  await db.delete(contractsTable).where(eq(contractsTable.id, contractId));
  res.status(204).send();
});

export default router;
