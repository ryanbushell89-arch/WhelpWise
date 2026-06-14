import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface SignedPdfParams {
  templatePdfBytes: Buffer;
  signaturePngBase64: string; // full data URL "data:image/png;base64,..."
  signerName: string | null;
  signerEmail: string | null;
  signedAt: Date;
  signerIp: string;
  contractType: string;
  contractId: number;
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  puppy_sale_limited: "Puppy Purchase Agreement (Limited / Pet AKC)",
  puppy_sale_main:    "Puppy Purchase Agreement (Full Registration)",
  stud:               "Stud Service Agreement",
  custom:             "Contract Agreement",
};

const GREEN  = rgb(0.176, 0.416, 0.31);  // #2d6a4f
const DARK   = rgb(0.07,  0.07,  0.07);
const GRAY   = rgb(0.42,  0.42,  0.42);
const WHITE  = rgb(1,     1,     1);
const BGFILL = rgb(0.965, 0.965, 0.965);

export async function generateSignedPdf(params: SignedPdfParams): Promise<Uint8Array> {
  const { templatePdfBytes, signaturePngBase64, signerName, signerEmail,
          signedAt, signerIp, contractType, contractId } = params;

  const pdfDoc = await PDFDocument.load(templatePdfBytes, { ignoreEncryption: true });
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 in points
  const W = 595;
  const H = 842;
  const M = 50; // margin
  const CW = W - M * 2; // content width

  const page = pdfDoc.addPage([W, H]);

  function text(t: string, x: number, y: number, size: number,
                f = font, color = DARK) {
    page.drawText(t, { x, y, size, font: f, color });
  }

  function hRule(y: number, color = rgb(0.82, 0.82, 0.82)) {
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color });
  }

  function box(y: number, h: number) {
    page.drawRectangle({ x: M, y: y - h, width: CW, height: h, color: BGFILL });
  }

  // ── Green header bar ──────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - 48, width: W, height: 48, color: GREEN });
  text("WhelpWise", M, H - 31, 16, boldFont, WHITE);
  text("Certificate of Electronic Signature", W - M - 200, H - 31, 9, font, WHITE);

  let y = H - 70;

  // ── Page title ────────────────────────────────────────────────────────────────
  text("CERTIFICATE OF ELECTRONIC SIGNATURE", M, y, 13, boldFont);
  y -= 5;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1.5, color: GREEN });
  y -= 22;

  // ── Document details box ──────────────────────────────────────────────────────
  const docBoxH = 82;
  box(y, docBoxH);
  text("DOCUMENT DETAILS", M + 12, y - 14, 7.5, boldFont, GREEN);
  const docLabel = CONTRACT_TYPE_LABELS[contractType] ?? "Contract Agreement";

  const col2 = M + 104;
  text("Document:",     M + 12, y - 30, 8.5, boldFont, GRAY);
  text(docLabel,        col2,   y - 30, 8.5, font, DARK);
  text("Contract No.:", M + 12, y - 46, 8.5, boldFont, GRAY);
  text(`#${contractId}`, col2, y - 46, 8.5, font, DARK);
  text("Signed:",        M + 12, y - 62, 8.5, boldFont, GRAY);
  text(signedAt.toUTCString(), col2, y - 62, 8.5, font, DARK);
  y -= docBoxH + 14;

  // ── Signer details box ────────────────────────────────────────────────────────
  const signerRows = signerEmail ? 3 : 2;
  const signerBoxH = 20 + signerRows * 16 + 12;
  box(y, signerBoxH);
  text("SIGNER DETAILS", M + 12, y - 14, 7.5, boldFont, GREEN);
  text("Full Name:", M + 12, y - 30, 8.5, boldFont, GRAY);
  text(signerName ?? "Not provided", col2, y - 30, 8.5, font, DARK);
  if (signerEmail) {
    text("Email:",      M + 12, y - 46, 8.5, boldFont, GRAY);
    text(signerEmail,   col2,   y - 46, 8.5, font, DARK);
  }
  const ipRowY = signerEmail ? y - 62 : y - 46;
  text("IP Address:", M + 12, ipRowY, 8.5, boldFont, GRAY);
  text(signerIp,      col2,   ipRowY, 8.5, font, DARK);
  y -= signerBoxH + 14;

  // ── Signature image box ───────────────────────────────────────────────────────
  text("DIGITAL SIGNATURE", M, y - 3, 7.5, boldFont, GREEN);
  y -= 16;

  const sigBoxH = 110;
  page.drawRectangle({
    x: M, y: y - sigBoxH, width: CW, height: sigBoxH,
    color: WHITE, borderColor: rgb(0.82, 0.82, 0.82), borderWidth: 0.75,
  });

  try {
    const base64Data = signaturePngBase64.replace("data:image/png;base64,", "");
    const sigBytes = Uint8Array.from(Buffer.from(base64Data, "base64"));
    const sigImage = await pdfDoc.embedPng(sigBytes);
    const maxW = CW - 40;
    const maxH = sigBoxH - 20;
    const scale = Math.min(maxW / sigImage.width, maxH / sigImage.height, 1);
    const imgW = sigImage.width * scale;
    const imgH = sigImage.height * scale;
    page.drawImage(sigImage, {
      x: M + (CW - imgW) / 2,
      y: y - sigBoxH + (sigBoxH - imgH) / 2,
      width: imgW,
      height: imgH,
    });
  } catch {
    text("(signature image unavailable)", M + CW / 2 - 65, y - sigBoxH / 2 - 4, 9, font, GRAY);
  }

  y -= sigBoxH + 14;

  // ── Signature line ────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: M, y }, end: { x: M + CW * 0.55, y }, thickness: 0.75, color: rgb(0.3, 0.3, 0.3) });
  text(`× Signature of ${signerName ?? "Buyer"}`, M, y - 13, 8, font, GRAY);

  page.drawLine({ start: { x: M + CW * 0.62, y }, end: { x: W - M, y }, thickness: 0.75, color: rgb(0.3, 0.3, 0.3) });
  text(`Date: ${signedAt.toISOString().slice(0, 10)}`, M + CW * 0.62, y - 13, 8, font, GRAY);

  y -= 36;

  // ── Legal disclosure ──────────────────────────────────────────────────────────
  hRule(y);
  y -= 14;

  const legalLines = [
    "This certificate confirms that the above-named signer electronically executed the attached document.",
    "The signature, timestamp, and IP address constitute legally binding evidence of agreement under the U.S.",
    "Electronic Signatures in Global and National Commerce Act (ESIGN), the Uniform Electronic Transactions",
    "Act (UETA), and equivalent electronic signature legislation in applicable jurisdictions.",
  ];
  for (const line of legalLines) {
    text(line, M, y, 7.5, font, GRAY);
    y -= 11.5;
  }

  y -= 8;
  hRule(y);
  y -= 13;
  text("Powered by WhelpWise  ·  whelpwise.app", M, y, 7.5, font, rgb(0.6, 0.6, 0.6));
  text(`Generated: ${new Date().toUTCString()}`, W - M - 185, y, 7.5, font, rgb(0.6, 0.6, 0.6));

  return pdfDoc.save();
}
