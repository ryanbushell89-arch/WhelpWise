import { Router } from "express";
import { randomBytes } from "node:crypto";
import { db } from "@workspace/db";
import { contractsTable, waitingListTable, puppiesTable, studListingsTable, contractTemplatesTable, buyersTable, usersTable } from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { type AuthenticatedRequest } from "../middlewares/requireAuth";
import { sendContractSigningEmail } from "../lib/email";
import type { Request } from "express";

const router = Router();

function uid(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

function getBaseUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

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

// ── Create instance from template ─────────────────────────────────────────────
router.post("/contracts/from-template", async (req, res): Promise<void> => {
  const userId = uid(req);
  const { templateId, buyerId, puppyId, studListingId } = req.body;

  if (!templateId) { res.status(400).json({ error: "templateId is required" }); return; }
  if (!buyerId) { res.status(400).json({ error: "buyerId is required" }); return; }

  const [template] = await db
    .select()
    .from(contractTemplatesTable)
    .where(and(eq(contractTemplatesTable.id, parseInt(templateId)), eq(contractTemplatesTable.userId, userId)));
  if (!template) { res.status(404).json({ error: "Template not found" }); return; }

  const [buyer] = await db
    .select()
    .from(buyersTable)
    .where(and(eq(buyersTable.id, parseInt(buyerId)), eq(buyersTable.userId, userId)));
  if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }

  const [contract] = await db
    .insert(contractsTable)
    .values({
      userId,
      templateId: template.id,
      buyerId: buyer.id,
      type: template.category === "custom" ? "puppy_sale_limited" : template.category,
      status: "draft",
      templateUrl: template.fileUrl,
      buyerName: `${buyer.firstName} ${buyer.lastName}`,
      buyerEmail: buyer.email ?? null,
      buyerPhone: buyer.phone ?? null,
      buyerAddress: buyer.address ?? null,
      puppyId: puppyId ? parseInt(puppyId) : null,
      studListingId: studListingId ? parseInt(studListingId) : null,
      contractDate: new Date().toISOString().slice(0, 10),
    })
    .returning();

  res.status(201).json(contract);
});

// ── Send signing email ────────────────────────────────────────────────────────
router.post("/contracts/:contractId/send", async (req, res): Promise<void> => {
  const userId = uid(req);
  const contractId = parseInt(req.params.contractId);
  if (isNaN(contractId)) { res.status(400).json({ error: "invalid contractId" }); return; }

  const [contract] = await db
    .select()
    .from(contractsTable)
    .where(and(eq(contractsTable.id, contractId), eq(contractsTable.userId, userId)));
  if (!contract) { res.status(404).json({ error: "not found" }); return; }

  if (!contract.buyerEmail) {
    res.status(400).json({ error: "Buyer email is required to send a signing request" });
    return;
  }
  if (!contract.templateUrl) {
    res.status(400).json({ error: "Contract must have a document attached before sending" });
    return;
  }

  const token = randomBytes(32).toString("hex");
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30);

  const [updated] = await db
    .update(contractsTable)
    .set({ status: "sent", sentAt: new Date(), buyerAccessToken: token, tokenExpiresAt })
    .where(eq(contractsTable.id, contractId))
    .returning();

  const basePath = process.env.BASE_PATH ?? "";
  const signingUrl = `${getBaseUrl(req)}${basePath}/sign/${token}`;

  const [breeder] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  const breederName = breeder?.email?.split("@")[0] ?? "Your breeder";

  const emailSent = await sendContractSigningEmail({
    to: contract.buyerEmail,
    buyerName: contract.buyerName ?? "Buyer",
    breederName,
    signingUrl,
    contractType: contract.type,
  });

  req.log.info({ contractId, emailSent }, "Contract signing email sent");

  res.json({
    ...updated,
    signingUrl,
    emailSent,
    message: emailSent
      ? `Signing request emailed to ${contract.buyerEmail}`
      : `No email sent (RESEND_API_KEY not configured). Share this link manually: ${signingUrl}`,
  });
});

// ── List buyer's contracts ────────────────────────────────────────────────────
router.get("/buyers/:buyerId/contracts", async (req, res): Promise<void> => {
  const userId = uid(req);
  const buyerId = parseInt(req.params.buyerId);
  if (isNaN(buyerId)) { res.status(400).json({ error: "invalid buyerId" }); return; }

  const contracts = await db
    .select()
    .from(contractsTable)
    .where(and(eq(contractsTable.userId, userId), eq(contractsTable.buyerId, buyerId)))
    .orderBy(asc(contractsTable.createdAt));

  res.json(contracts);
});

export default router;
