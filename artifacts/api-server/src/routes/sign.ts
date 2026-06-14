import { Router } from "express";
import { Readable } from "stream";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { contractsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { generateSignedPdf } from "../lib/signedPdf";
import { sendBuyerSigningConfirmation, sendBreederSigningNotification } from "../lib/email";
import type { Request, Response } from "express";

const router = Router();
const objectStorageService = new ObjectStorageService();

function getBaseUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

async function resolveContract(token: string) {
  const [contract] = await db
    .select()
    .from(contractsTable)
    .where(eq(contractsTable.buyerAccessToken, token));

  if (!contract) return { contract: null, error: "not found" as const };
  if (!contract.tokenExpiresAt || new Date() > new Date(contract.tokenExpiresAt)) {
    return { contract: null, error: "expired" as const };
  }
  return { contract, error: null };
}

// ── GET /contracts/sign/:token — return contract metadata, mark as viewed ──────
router.get("/contracts/sign/:token", async (req: Request, res: Response): Promise<void> => {
  const { contract, error } = await resolveContract(String(req.params.token));

  if (error === "not found") { res.status(404).json({ error: "Link not found" }); return; }
  if (error === "expired") { res.status(410).json({ error: "This signing link has expired. Please contact your breeder for a new link." }); return; }
  if (!contract) { res.status(404).json({ error: "not found" }); return; }

  // Mark as viewed on first open
  if (!contract.viewedAt && contract.status === "sent") {
    await db
      .update(contractsTable)
      .set({ status: "viewed", viewedAt: new Date() })
      .where(eq(contractsTable.id, contract.id));
  }

  // Get breeder name for display
  const [breeder] = contract.userId
    ? await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, contract.userId))
    : [];

  const pdfUrl = contract.templateUrl
    ? `${getBaseUrl(req)}/api/contracts/sign/${String(req.params.token)}/pdf`
    : null;

  res.json({
    id: contract.id,
    type: contract.type,
    status: contract.status,
    buyerName: contract.buyerName,
    buyerEmail: contract.buyerEmail,
    breederName: breeder?.email?.split("@")[0] ?? "Your breeder",
    contractDate: contract.contractDate,
    pdfUrl,
    alreadySigned: contract.status === "signed" || contract.status === "completed",
    signedAt: contract.signedAt?.toISOString() ?? null,
  });
});

// ── GET /contracts/sign/:token/pdf — stream PDF file to browser ────────────────
router.get("/contracts/sign/:token/pdf", async (req: Request, res: Response): Promise<void> => {
  const { contract, error } = await resolveContract(String(req.params.token));

  if (error || !contract) {
    res.status(error === "expired" ? 410 : 404).json({ error: error ?? "not found" });
    return;
  }

  if (!contract.templateUrl) {
    res.status(404).json({ error: "No document attached to this contract" });
    return;
  }

  try {
    // templateUrl stored as "/api/storage/objects/..." — strip prefix to get entity path
    const objectPath = contract.templateUrl.replace(/^\/api\/storage/, "").replace(/^\/storage/, "");
    const file = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(file, 0);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=\"contract.pdf\"");
    res.setHeader("Cache-Control", "private, no-store");

    if (response.headers.get("content-length")) {
      res.setHeader("Content-Length", response.headers.get("content-length")!);
    }

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Document file not found" });
    } else {
      res.status(500).json({ error: "Failed to serve document" });
    }
  }
});

// ── POST /contracts/sign/:token — submit signature ────────────────────────────
router.post("/contracts/sign/:token", async (req: Request, res: Response): Promise<void> => {
  const { contract, error } = await resolveContract(String(req.params.token));

  if (error === "not found") { res.status(404).json({ error: "Link not found" }); return; }
  if (error === "expired") { res.status(410).json({ error: "This signing link has expired." }); return; }
  if (!contract) { res.status(404).json({ error: "not found" }); return; }

  if (contract.status === "signed" || contract.status === "completed") {
    res.status(409).json({ error: "This contract has already been signed." });
    return;
  }

  const { signatureData } = req.body as { signatureData?: string };
  if (!signatureData?.startsWith("data:image/png;base64,")) {
    res.status(400).json({ error: "signatureData is required (PNG data URL)" });
    return;
  }

  const signerIp =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown";
  const signerUserAgent = req.headers["user-agent"] ?? "unknown";

  // Upload signature PNG server-side (base64 → Buffer → GCS)
  let signatureImageUrl: string | null = null;
  try {
    const base64Data = signatureData.replace("data:image/png;base64,", "");
    const sigBuffer = Buffer.from(base64Data, "base64");
    const objectPath = await objectStorageService.uploadBuffer(sigBuffer, "image/png", "signatures");
    signatureImageUrl = `/api/storage${objectPath}`;
  } catch {
    // Signature upload failure is non-fatal — we still record the signing event
  }

  const now = new Date();
  await db
    .update(contractsTable)
    .set({
      status: "signed",
      signedAt: now,
      viewedAt: contract.viewedAt ?? now,
      signerIp,
      signerUserAgent,
      signatureImageUrl,
    })
    .where(eq(contractsTable.id, contract.id));

  // Generate signed PDF (non-fatal — signing already recorded above)
  let signedContractUrl: string | null = null;
  try {
    if (contract.templateUrl) {
      const objectPath = contract.templateUrl
        .replace(/^\/api\/storage/, "")
        .replace(/^\/storage/, "");
      const templateFile = await objectStorageService.getObjectEntityFile(objectPath);
      const [templateBuffer] = await templateFile.download() as [Buffer];

      const signedPdfBytes = await generateSignedPdf({
        templatePdfBytes: templateBuffer,
        signaturePngBase64: signatureData,
        signerName: contract.buyerName ?? null,
        signerEmail: contract.buyerEmail ?? null,
        signedAt: now,
        signerIp,
        contractType: contract.type ?? "custom",
        contractId: contract.id,
      });

      const signedObjectPath = await objectStorageService.uploadBuffer(
        Buffer.from(signedPdfBytes),
        "application/pdf",
        "signed-contracts",
      );
      signedContractUrl = `/api/storage${signedObjectPath}`;
      await db
        .update(contractsTable)
        .set({ signedContractUrl })
        .where(eq(contractsTable.id, contract.id));
    }
  } catch {
    // PDF generation failure — contract is still recorded as signed
  }

  // Email notifications (non-fatal)
  const base = getBaseUrl(req);
  const absSignedUrl = signedContractUrl ? `${base}${signedContractUrl}` : null;

  if (contract.buyerEmail) {
    sendBuyerSigningConfirmation({
      to: contract.buyerEmail,
      buyerName: contract.buyerName ?? "Buyer",
      signedContractUrl: absSignedUrl,
    }).catch(() => undefined);
  }

  if (contract.userId) {
    db.select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, contract.userId))
      .then(([breeder]) => {
        if (breeder?.email) {
          sendBreederSigningNotification({
            to: breeder.email,
            buyerName: contract.buyerName ?? "A buyer",
            contractId: contract.id,
            dashboardUrl: `${base}/contracts/${contract.id}`,
            signedContractUrl: absSignedUrl,
          }).catch(() => undefined);
        }
      })
      .catch(() => undefined);
  }

  res.json({
    success: true,
    signedAt: now.toISOString(),
    signedContractUrl,
    message: "Your signature has been recorded. Thank you!",
  });
});

export default router;
