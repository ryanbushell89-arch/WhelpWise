import { Router, type IRouter } from "express";
import PDFDocument from "pdfkit";
import {
  db,
  dogsTable,
  breedsTable,
  littersTable,
  puppiesTable,
  weightEntriesTable,
  healthTestResultsTable,
  buyersTable,
  whelpingRecordsTable,
  breedingsTable,
  expensesTable,
} from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { GetBudgetSummaryQueryParams } from "@workspace/api-zod";
import { GREEN, GREEN_LIGHT, MUTED, TEXT, LINE, RED, heading1, heading2, field, twoColField, pageHeader, pageFooter, money } from "../lib/pdfHelpers";
import { computeBudgetSummary, computeLitterFinancials } from "./expenses";
import { type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request } from "express";

const router: IRouter = Router();

const CATEGORY_LABELS: Record<string, string> = {
  stud_fee: "Stud Fee",
  vet_health: "Vet / Health",
  food: "Food",
  supplies: "Supplies",
  advertising: "Advertising",
  registration: "Registration",
  travel: "Travel",
  other: "Other",
};

function uid(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

// ─── Litter Report ────────────────────────────────────────────────────────────
router.get("/litters/:litterId/report", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.litterId) ? req.params.litterId[0] : req.params.litterId;
  const litterId = parseInt(raw, 10);
  if (isNaN(litterId)) { res.status(400).json({ error: "Invalid litterId" }); return; }

  const [litter] = await db.select().from(littersTable).where(eq(littersTable.id, litterId));
  if (!litter) { res.status(404).json({ error: "Litter not found" }); return; }

  const [sire] = litter.sireId ? await db.select().from(dogsTable).where(eq(dogsTable.id, litter.sireId)) : [undefined];
  const [dam] = litter.damId ? await db.select().from(dogsTable).where(eq(dogsTable.id, litter.damId)) : [undefined];
  const puppies = await db.select().from(puppiesTable).where(eq(puppiesTable.litterId, litterId));
  const [whelpingRecord] = await db.select().from(whelpingRecordsTable).where(eq(whelpingRecordsTable.litterId, litterId));

  // Fetch buyer names and latest weights
  const puppyData = await Promise.all(puppies.map(async (p) => {
    const [buyer] = p.buyerId ? await db.select().from(buyersTable).where(eq(buyersTable.id, p.buyerId)) : [undefined];
    const weights = await db.select().from(weightEntriesTable).where(eq(weightEntriesTable.puppyId, p.id));
    const latestWeight = weights.length > 0 ? weights[weights.length - 1] : null;
    return { ...p, buyerName: buyer ? `${buyer.firstName} ${buyer.lastName}` : null, latestWeight };
  }));

  // ── Build PDF ──────────────────────────────────────────────────────────────
  const doc = new PDFDocument({ size: "LETTER", margins: { top: 60, bottom: 60, left: 60, right: 60 }, autoFirstPage: true });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="litter-${litterId}-report.pdf"`);
  doc.pipe(res);

  // Page 1 — Cover
  pageHeader(doc, "Litter Report");

  heading1(doc, "Litter Report", 70);
  const litterName = `${dam?.registeredName ?? "Unknown Dam"} × ${sire?.registeredName ?? "Unknown Sire"}`;
  doc
    .font("Helvetica")
    .fontSize(14)
    .fillColor(MUTED)
    .text(litterName, 60, doc.y + 4)
    .moveDown(0.5);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(MUTED)
    .text(`Date of Birth: ${litter.dob ? new Date(litter.dob).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "TBD"}  ·  Status: ${litter.status?.toUpperCase()}`, 60);
  doc.moveDown(2);

  // Stats strip
  const stats = [
    { label: "Total Born", value: String(litter.totalBorn ?? "—") },
    { label: "Live Males", value: String(litter.liveMales ?? "—") },
    { label: "Live Females", value: String(litter.liveFemales ?? "—") },
    { label: "Stillborn", value: String(litter.stillborn ?? "0") },
  ];
  const boxW = 105;
  const boxH = 56;
  const startX = 60;
  const startY = doc.y;
  stats.forEach((s, i) => {
    const x = startX + i * (boxW + 10);
    doc.rect(x, startY, boxW, boxH).fillColor("#f0fdf4").fill();
    doc.rect(x, startY, boxW, boxH).strokeColor(GREEN_LIGHT).lineWidth(1).stroke();
    doc.font("Helvetica-Bold").fontSize(22).fillColor(GREEN).text(s.value, x, startY + 8, { width: boxW, align: "center" });
    doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(s.label, x, startY + 34, { width: boxW, align: "center" });
  });
  doc.y = startY + boxH + 20;

  // Dam & Sire
  heading2(doc, "Parents");
  twoColField(doc, "Dam", dam?.registeredName, "Sire", sire?.registeredName);
  twoColField(doc, "Dam Call Name", dam?.callName, "Sire Call Name", sire?.callName);
  twoColField(doc, "Dam DOB", dam?.dob ? new Date(dam.dob).toLocaleDateString("en-GB") : null, "Sire DOB", sire?.dob ? new Date(sire.dob).toLocaleDateString("en-GB") : null);
  twoColField(doc, "Dam Chip", dam?.microchip, "Sire Chip", sire?.microchip);
  twoColField(doc, "Dam Reg.", dam?.registrationNumber, "Sire Reg.", sire?.registrationNumber);

  if (whelpingRecord) {
    heading2(doc, "Whelping Details");
    twoColField(doc, "Whelping Start", whelpingRecord.startTime ?? null, "End", whelpingRecord.endTime ?? null);
    twoColField(doc, "Complications", whelpingRecord.complications ?? null, "Notes", null);
    if (whelpingRecord.complications) field(doc, "Complications", whelpingRecord.complications);
    if (whelpingRecord.notes) field(doc, "Notes", whelpingRecord.notes);
  }

  if (litter.notes) {
    heading2(doc, "Litter Notes");
    doc.font("Helvetica").fontSize(10).fillColor(TEXT).text(litter.notes, 60, doc.y, { width: 480 });
  }

  // Page 2 — Puppy Table
  doc.addPage();
  pageHeader(doc, "Litter Report — Puppy Details");
  heading1(doc, "Puppy Details");
  doc.moveDown(0.8);

  const colX = { collar: 60, sex: 130, colour: 185, birth: 270, latest: 355, status: 430 };
  const tableTop = doc.y;

  // Table header
  doc.rect(60, tableTop, 480, 20).fill("#f0fdf4");
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(GREEN);
  doc.text("Collar", colX.collar, tableTop + 5, { width: 65 });
  doc.text("Sex", colX.sex, tableTop + 5, { width: 50 });
  doc.text("Colour", colX.colour, tableTop + 5, { width: 80 });
  doc.text("Birth Wt", colX.birth, tableTop + 5, { width: 80 });
  doc.text("Latest Wt", colX.latest, tableTop + 5, { width: 70 });
  doc.text("Buyer / Status", colX.status, tableTop + 5, { width: 100 });

  let rowY = tableTop + 22;
  puppyData.forEach((p, i) => {
    if (rowY > 680) {
      pageFooter(doc);
      doc.addPage();
      pageHeader(doc, "Litter Report — Puppy Details (cont.)");
      rowY = doc.y + 10;
    }
    if (i % 2 === 0) {
      doc.rect(60, rowY - 2, 480, 18).fill("#fafafa");
    }
    doc.font("Helvetica").fontSize(9).fillColor(TEXT);
    doc.text(p.collarColour ?? "—", colX.collar, rowY, { width: 65 });
    doc.text(p.sex ?? "—", colX.sex, rowY, { width: 50 });
    doc.text(p.colour ?? "—", colX.colour, rowY, { width: 80 });
    doc.text(p.birthWeight ? `${p.birthWeight}g` : "—", colX.birth, rowY, { width: 80 });
    doc.text(p.latestWeight ? `${p.latestWeight.weightGrams}g` : "—", colX.latest, rowY, { width: 70 });
    const buyerStatus = p.buyerName ?? (p.alive === "true" ? "Available" : "Deceased");
    doc.text(buyerStatus, colX.status, rowY, { width: 110 });
    rowY += 18;
  });

  doc.moveDown(2);

  // Weight summary per puppy
  heading2(doc, "Weight Gain Summary");
  puppyData.forEach((p) => {
    if (p.latestWeight && p.birthWeight) {
      const gain = p.latestWeight.weightGrams - p.birthWeight;
      const pct = ((gain / p.birthWeight) * 100).toFixed(1);
      const label = `${p.collarColour ?? "Pup #" + p.id} (${p.sex})`;
      twoColField(doc, label, `${p.birthWeight}g → ${p.latestWeight.weightGrams}g`, "Gain", `+${gain}g (${pct}%)`);
    }
  });

  pageFooter(doc);
  doc.end();
});

// ─── Pedigree Certificate ─────────────────────────────────────────────────────
router.get("/dogs/:dogId/pedigree-certificate", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.dogId) ? req.params.dogId[0] : req.params.dogId;
  const dogId = parseInt(raw, 10);
  if (isNaN(dogId)) { res.status(400).json({ error: "Invalid dogId" }); return; }

  const [dog] = await db.select().from(dogsTable).where(eq(dogsTable.id, dogId));
  if (!dog) { res.status(404).json({ error: "Dog not found" }); return; }

  const [breed] = dog.breedId ? await db.select().from(breedsTable).where(eq(breedsTable.id, dog.breedId)) : [undefined];
  const healthTests = await db.select().from(healthTestResultsTable).where(eq(healthTestResultsTable.dogId, dogId));

  // Build pedigree tree (3 generations)
  async function fetchAncestor(id: number | null | undefined): Promise<any> {
    if (!id) return null;
    const [d] = await db.select().from(dogsTable).where(eq(dogsTable.id, id));
    if (!d) return null;
    const [b] = d.breedId ? await db.select().from(breedsTable).where(eq(breedsTable.id, d.breedId)) : [undefined];
    return { ...d, breedName: b?.name ?? null };
  }

  const sire = await fetchAncestor(dog.sireId);
  const dam = await fetchAncestor(dog.damId);
  const sireSire = sire ? await fetchAncestor(sire.sireId) : null;
  const sireDam = sire ? await fetchAncestor(sire.damId) : null;
  const damSire = dam ? await fetchAncestor(dam.sireId) : null;
  const damDam = dam ? await fetchAncestor(dam.damId) : null;
  const ggSireSireSire = sireSire ? await fetchAncestor(sireSire.sireId) : null;
  const ggSireSireDam = sireSire ? await fetchAncestor(sireSire.damId) : null;
  const ggSireDamSire = sireDam ? await fetchAncestor(sireDam.sireId) : null;
  const ggSireDamDam = sireDam ? await fetchAncestor(sireDam.damId) : null;
  const ggDamSireSire = damSire ? await fetchAncestor(damSire.sireId) : null;
  const ggDamSireDam = damSire ? await fetchAncestor(damSire.damId) : null;
  const ggDamDamSire = damDam ? await fetchAncestor(damDam.sireId) : null;
  const ggDamDamDam = damDam ? await fetchAncestor(damDam.damId) : null;

  // ── Build PDF ──────────────────────────────────────────────────────────────
  const doc = new PDFDocument({ size: "LETTER", layout: "landscape", margins: { top: 50, bottom: 50, left: 50, right: 50 }, autoFirstPage: true });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="pedigree-${dog.registeredName.replace(/\s+/g, "-")}.pdf"`);
  doc.pipe(res);

  // Top green bar
  doc.rect(0, 0, 792, 8).fill(GREEN);

  // Header
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(GREEN)
    .text("WHELPWISE", 50, 18, { continued: true })
    .font("Helvetica")
    .fillColor(MUTED)
    .text("  ·  Pedigree Certificate");
  doc
    .moveTo(50, 36)
    .lineTo(742, 36)
    .strokeColor(LINE)
    .lineWidth(0.5)
    .stroke();

  // Dog name + details
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(TEXT)
    .text(dog.registeredName, 50, 46);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(MUTED)
    .text(
      [
        breed?.name,
        dog.sex?.toUpperCase(),
        dog.dob ? `DOB: ${new Date(dog.dob).toLocaleDateString("en-GB")}` : null,
        dog.registrationNumber ? `Reg: ${dog.registrationNumber}` : null,
        dog.microchip ? `Chip: ${dog.microchip}` : null,
      ].filter(Boolean).join("  ·  "),
      50,
      doc.y + 2
    );
  doc.y += 4;

  doc
    .moveTo(50, doc.y + 4)
    .lineTo(742, doc.y + 4)
    .strokeColor(LINE)
    .lineWidth(0.5)
    .stroke();

  // ── 4-generation pedigree grid ─────────────────────────────────────────────
  const pedigreeTop = doc.y + 14;
  const pageH = 612;
  const colW = [130, 150, 165, 185]; // col widths per gen
  const gutterX = 6;
  const colStart = [50, 50 + colW[0] + gutterX, 50 + colW[0] + gutterX + colW[1] + gutterX, 50 + colW[0] + gutterX + colW[1] + gutterX + colW[2] + gutterX];
  const availH = pageH - pedigreeTop - 60;

  // Ancestors: [subject], [sire, dam], [ss, sd, ds, dd], [sss, ssd, sds, sdd, dss, dsd, dds, ddd]
  const col0 = [{ ...dog, breedName: breed?.name ?? null }];
  const col1 = [sire, dam];
  const col2 = [sireSire, sireDam, damSire, damDam];
  const col3 = [ggSireSireSire, ggSireSireDam, ggSireDamSire, ggSireDamDam, ggDamSireSire, ggDamSireDam, ggDamDamSire, ggDamDamDam];

  function drawAncestorBox(doc: InstanceType<typeof PDFDocument>, ancestor: any, x: number, y: number, w: number, h: number, highlight = false) {
    const fillColor = highlight ? "#f0fdf4" : "#f9fafb";
    const borderColor = highlight ? GREEN_LIGHT : LINE;
    doc.rect(x, y, w - 4, h - 4).fillColor(fillColor).fill();
    doc.rect(x, y, w - 4, h - 4).strokeColor(borderColor).lineWidth(0.7).stroke();

    if (!ancestor) {
      doc.font("Helvetica").fontSize(7).fillColor("#d1d5db").text("Unknown", x + 4, y + (h - 4) / 2 - 4, { width: w - 12, align: "center" });
      return;
    }

    const nameLines = ancestor.registeredName.length > 22 ? 2 : 1;
    const innerY = y + 5;
    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor(TEXT)
      .text(ancestor.registeredName, x + 5, innerY, { width: w - 14, lineGap: 1 });
    const afterName = doc.y;
    if (ancestor.breedName) {
      doc.font("Helvetica").fontSize(6.5).fillColor(MUTED).text(ancestor.breedName, x + 5, afterName + 1, { width: w - 14 });
    }
    if (ancestor.sex) {
      const sexLabel = ancestor.sex === "male" ? "♂" : "♀";
      const sexColor = ancestor.sex === "male" ? "#3b82f6" : "#ec4899";
      doc.font("Helvetica-Bold").fontSize(7).fillColor(sexColor).text(sexLabel, x + w - 16, y + 4);
    }
    if (ancestor.registrationNumber) {
      doc.font("Helvetica").fontSize(6).fillColor(MUTED).text(ancestor.registrationNumber, x + 5, y + h - 14, { width: w - 14 });
    }
  }

  const colsData = [col0, col1, col2, col3];
  colsData.forEach((col, ci) => {
    const rowH = availH / col.length;
    col.forEach((ancestor, ri) => {
      const x = colStart[ci];
      const y = pedigreeTop + ri * rowH;
      drawAncestorBox(doc, ancestor, x, y, colW[ci], rowH, ci === 0);
    });
  });

  // ── Health Tests Section ───────────────────────────────────────────────────
  if (healthTests.length > 0) {
    const healthX = colStart[3] + colW[3] + 10;
    const healthW = 742 - healthX;
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(GREEN)
      .text("Health Test Results", healthX, pedigreeTop, { width: healthW });
    doc
      .moveTo(healthX, pedigreeTop + 14)
      .lineTo(healthX + healthW - 4, pedigreeTop + 14)
      .strokeColor(GREEN_LIGHT)
      .lineWidth(0.8)
      .stroke();

    let htY = pedigreeTop + 20;
    healthTests.forEach((t) => {
      if (htY > pageH - 80) return;
      doc.rect(healthX, htY, healthW - 4, 28).fillColor("#f0fdf4").fill();
      doc.rect(healthX, htY, healthW - 4, 28).strokeColor(LINE).lineWidth(0.5).stroke();
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(TEXT).text(t.testName, healthX + 5, htY + 4, { width: healthW - 14 });
      const resultColor = ["Clear", "Normal", "Excellent", "Good"].includes(t.result ?? "") ? "#16a34a" : "#d97706";
      doc.font("Helvetica-Bold").fontSize(8).fillColor(resultColor).text(t.result ?? "—", healthX + 5, htY + 15, { width: healthW - 14 });
      if (t.date) {
        doc.font("Helvetica").fontSize(6.5).fillColor(MUTED).text(new Date(t.date).toLocaleDateString("en-GB"), healthX + 5, htY + 15, { align: "right", width: healthW - 14 });
      }
      htY += 32;
    });
  }

  // Footer
  const bottom = pageH - 30;
  doc
    .moveTo(50, bottom)
    .lineTo(742, bottom)
    .strokeColor(LINE)
    .lineWidth(0.5)
    .stroke();
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor(MUTED)
    .text(
      `Generated by WhelpWise · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · This certificate is produced for reference purposes.`,
      50,
      bottom + 6,
      { align: "center", width: 692 }
    );

  doc.end();
});

// ─── Stat boxes shared by both financial reports ─────────────────────────────
function statBoxes(doc: InstanceType<typeof PDFDocument>, stats: { label: string; value: string; color: string }[]) {
  const boxW = 150;
  const boxH = 60;
  const startX = 60;
  const startY = doc.y + 6;
  stats.forEach((s, i) => {
    const x = startX + i * (boxW + 15);
    doc.rect(x, startY, boxW, boxH).fillColor("#f9fafb").fill();
    doc.rect(x, startY, boxW, boxH).strokeColor(LINE).lineWidth(1).stroke();
    doc.font("Helvetica-Bold").fontSize(18).fillColor(s.color).text(s.value, x, startY + 12, { width: boxW, align: "center" });
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(s.label, x, startY + 36, { width: boxW, align: "center" });
  });
  doc.y = startY + boxH + 20;
}

function expenseAllocation(litterId: number | null, litterLabelById: Map<number, string>): string {
  if (litterId == null) return "General Kennel Expense";
  return litterLabelById.get(litterId) ?? `Litter #${litterId}`;
}

// ─── Annual Financial Statement ───────────────────────────────────────────────
router.get("/budget/report", async (req, res): Promise<void> => {
  const userId = uid(req);
  const parsed = GetBudgetSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const year = parsed.data.year ?? new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const summary = await computeBudgetSummary(userId, year);

  const allExpenses = await db.select().from(expensesTable)
    .where(and(eq(expensesTable.userId, userId), gte(expensesTable.date, yearStart), lte(expensesTable.date, yearEnd)))
    .orderBy(expensesTable.date);

  // Resolve allocation labels from ALL of the user's litters (not just litters
  // born in this year) — an expense logged this year can belong to a litter
  // whose DOB falls in a different year.
  const allLitters = await db.select().from(littersTable).where(eq(littersTable.userId, userId));
  const dogIds = new Set<number>();
  allLitters.forEach(l => { if (l.sireId) dogIds.add(l.sireId); if (l.damId) dogIds.add(l.damId); });
  const dogNameById = new Map<number, string>();
  for (const id of dogIds) {
    const [d] = await db.select().from(dogsTable).where(eq(dogsTable.id, id));
    if (d) dogNameById.set(id, d.registeredName);
  }
  const litterLabelById = new Map<number, string>();
  allLitters.forEach(l => {
    const dam = l.damId ? dogNameById.get(l.damId) : null;
    const sire = l.sireId ? dogNameById.get(l.sireId) : null;
    litterLabelById.set(l.id, `${dam ?? "Unknown Dam"} × ${sire ?? "Unknown Sire"}`);
  });

  const doc = new PDFDocument({ size: "LETTER", margins: { top: 60, bottom: 60, left: 60, right: 60 }, autoFirstPage: true });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="annual-financial-statement-${year}.pdf"`);
  doc.pipe(res);

  // Page 1 — Summary
  pageHeader(doc, `Annual Financial Statement — ${year}`);
  heading1(doc, "Annual Financial Statement", 70);
  doc.font("Helvetica").fontSize(14).fillColor(MUTED).text(`Calendar Year ${year}`, 60, doc.y + 4);
  doc.moveDown(1.5);

  statBoxes(doc, [
    { label: "Total Income", value: money(summary.totalIncome), color: GREEN },
    { label: "Total Expenses", value: money(summary.totalExpenses), color: RED },
    { label: "Net Profit", value: money(summary.totalProfit), color: summary.totalProfit >= 0 ? GREEN : RED },
  ]);

  heading2(doc, `Litters in ${year}`);
  if (summary.litters.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(`No litters with a date of birth in ${year}.`, 60);
    doc.moveDown(1);
  } else {
    const colX = { litter: 60, dob: 235, income: 320, expenses: 400, profit: 480 };
    const tableTop = doc.y;
    doc.rect(60, tableTop, 480, 20).fill("#f0fdf4");
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(GREEN);
    doc.text("Litter", colX.litter, tableTop + 5, { width: 170 });
    doc.text("DOB", colX.dob, tableTop + 5, { width: 80 });
    doc.text("Income", colX.income, tableTop + 5, { width: 75 });
    doc.text("Expenses", colX.expenses, tableTop + 5, { width: 75 });
    doc.text("Profit", colX.profit, tableTop + 5, { width: 60 });

    let rowY = tableTop + 22;
    doc.font("Helvetica").fontSize(9);
    summary.litters.forEach((l, i) => {
      const rowH = Math.max(18, doc.heightOfString(l.label, { width: 170 }) + 6);
      if (i % 2 === 0) doc.rect(60, rowY - 2, 480, rowH).fill("#fafafa");
      doc.font("Helvetica").fontSize(9).fillColor(TEXT);
      doc.text(l.label, colX.litter, rowY, { width: 170 });
      doc.text(l.dob ? new Date(l.dob).toLocaleDateString("en-AU") : "TBD", colX.dob, rowY, { width: 80 });
      doc.fillColor(GREEN).text(money(l.totalIncome), colX.income, rowY, { width: 75 });
      doc.fillColor(RED).text(money(l.totalExpenses), colX.expenses, rowY, { width: 75 });
      doc.fillColor(l.profit >= 0 ? GREEN : RED).text(money(l.profit), colX.profit, rowY, { width: 65 });
      rowY += rowH;
    });
    doc.y = rowY + 10;
  }

  if (summary.generalExpenses > 0) {
    field(doc, "General / Kennel Expenses", money(summary.generalExpenses));
  }

  // Page 2+ — Master Expense List
  doc.addPage();
  pageHeader(doc, `Annual Financial Statement ${year} — Expense Ledger`);
  heading1(doc, "Master Expense List");
  doc.moveDown(0.8);

  const colX2 = { date: 60, desc: 130, category: 300, allocation: 380, amount: 495 };
  function drawExpenseHeader(y: number) {
    doc.rect(60, y, 480, 20).fill("#f0fdf4");
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(GREEN);
    doc.text("Date", colX2.date, y + 5, { width: 65 });
    doc.text("Description", colX2.desc, y + 5, { width: 165 });
    doc.text("Category", colX2.category, y + 5, { width: 75 });
    doc.text("Allocation", colX2.allocation, y + 5, { width: 110 });
    doc.text("Amount", colX2.amount, y + 5, { width: 45, align: "right" });
  }

  let tableTop2 = doc.y;
  drawExpenseHeader(tableTop2);
  let rowY2 = tableTop2 + 22;

  if (allExpenses.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(`No expenses logged for ${year}.`, 60, rowY2);
  } else {
    allExpenses.forEach((e, i) => {
      if (rowY2 > 670) {
        pageFooter(doc);
        doc.addPage();
        pageHeader(doc, `Annual Financial Statement ${year} — Expense Ledger (cont.)`);
        tableTop2 = doc.y;
        drawExpenseHeader(tableTop2);
        rowY2 = tableTop2 + 22;
      }
      const allocation = expenseAllocation(e.litterId, litterLabelById);
      doc.font("Helvetica").fontSize(8.5);
      const rowH = Math.max(18, doc.heightOfString(allocation, { width: 110 }) + 6, doc.heightOfString(e.description || "—", { width: 165 }) + 6);
      if (i % 2 === 0) doc.rect(60, rowY2 - 2, 480, rowH).fill("#fafafa");
      doc.font("Helvetica").fontSize(8.5).fillColor(TEXT);
      doc.text(new Date(e.date).toLocaleDateString("en-AU"), colX2.date, rowY2, { width: 65 });
      doc.text(e.description || "—", colX2.desc, rowY2, { width: 165 });
      doc.text(CATEGORY_LABELS[e.category] ?? e.category, colX2.category, rowY2, { width: 75 });
      doc.text(allocation, colX2.allocation, rowY2, { width: 110 });
      doc.text(money(e.amount), colX2.amount, rowY2, { width: 45, align: "right" });
      rowY2 += rowH;
    });
  }

  pageFooter(doc);
  doc.end();
});

// ─── Individual Litter Financial Statement ────────────────────────────────────
router.get("/litters/:litterId/financial-report", async (req, res): Promise<void> => {
  const userId = uid(req);
  const litterId = parseId(req.params.litterId);
  if (isNaN(litterId)) { res.status(400).json({ error: "Invalid litterId" }); return; }

  const [litter] = await db.select().from(littersTable)
    .where(and(eq(littersTable.id, litterId), eq(littersTable.userId, userId)));
  if (!litter) { res.status(404).json({ error: "Litter not found" }); return; }

  const financials = await computeLitterFinancials(userId, litter);
  const { expenses, puppies } = financials;
  const soldPuppies = puppies.filter(p => p.buyerId != null);

  const buyerIds = soldPuppies.map(p => p.buyerId!).filter((id, i, arr) => arr.indexOf(id) === i);
  const buyerNameById = new Map<number, string>();
  for (const id of buyerIds) {
    const [b] = await db.select().from(buyersTable).where(eq(buyersTable.id, id));
    if (b) buyerNameById.set(id, `${b.firstName} ${b.lastName}`);
  }

  const doc = new PDFDocument({ size: "LETTER", margins: { top: 60, bottom: 60, left: 60, right: 60 }, autoFirstPage: true });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="litter-${litterId}-financial-report.pdf"`);
  doc.pipe(res);

  pageHeader(doc, "Litter Financial Statement");
  heading1(doc, "Litter Financial Statement", 70);
  doc.font("Helvetica").fontSize(14).fillColor(MUTED).text(financials.label, 60, doc.y + 4);
  doc.moveDown(0.3);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(MUTED)
    .text(
      `Date of Birth: ${litter.dob ? new Date(litter.dob).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : "TBD"}  ·  Status: ${litter.status?.toUpperCase()}`,
      60
    );
  doc.moveDown(1.5);

  statBoxes(doc, [
    { label: "Total Income", value: money(financials.totalIncome), color: GREEN },
    { label: "Total Expenses", value: money(financials.totalExpenses), color: RED },
    { label: "Net Profit", value: money(financials.profit), color: financials.profit >= 0 ? GREEN : RED },
  ]);

  // Puppy Sales
  heading2(doc, "Puppy Sales");
  if (soldPuppies.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor(MUTED).text("No puppies sold yet.", 60);
    doc.moveDown(1);
  } else {
    const colX = { puppy: 60, buyer: 165, price: 300, deposit: 380, balance: 460 };
    const tableTop = doc.y;
    doc.rect(60, tableTop, 480, 20).fill("#f0fdf4");
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(GREEN);
    doc.text("Puppy", colX.puppy, tableTop + 5, { width: 100 });
    doc.text("Buyer", colX.buyer, tableTop + 5, { width: 130 });
    doc.text("Sale Price", colX.price, tableTop + 5, { width: 75 });
    doc.text("Deposit", colX.deposit, tableTop + 5, { width: 75 });
    doc.text("Balance", colX.balance, tableTop + 5, { width: 60 });

    let rowY = tableTop + 22;
    soldPuppies.forEach((p, i) => {
      if (i % 2 === 0) doc.rect(60, rowY - 2, 480, 18).fill("#fafafa");
      doc.font("Helvetica").fontSize(9).fillColor(TEXT);
      doc.text(p.callName ?? p.name ?? `Puppy #${p.id}`, colX.puppy, rowY, { width: 100 });
      doc.text(p.buyerId ? buyerNameById.get(p.buyerId) ?? "—" : "—", colX.buyer, rowY, { width: 130 });
      doc.text(p.salePrice != null ? money(p.salePrice) : "—", colX.price, rowY, { width: 75 });
      doc.text(p.depositAmount != null ? `${money(p.depositAmount)} ${p.depositPaid === "true" ? "(paid)" : "(pending)"}` : "—", colX.deposit, rowY, { width: 75 });
      doc.text(p.balanceAmount != null ? `${money(p.balanceAmount)} ${p.balancePaid === "true" ? "(paid)" : "(pending)"}` : "—", colX.balance, rowY, { width: 70 });
      rowY += 18;
    });
    doc.y = rowY + 10;
  }

  // Expenses
  heading2(doc, "Expenses");
  if (expenses.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor(MUTED).text("No expenses logged for this litter.", 60);
  } else {
    const colX2 = { date: 60, desc: 150, category: 350, amount: 480 };
    function drawHeader(y: number) {
      doc.rect(60, y, 480, 20).fill("#f0fdf4");
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(GREEN);
      doc.text("Date", colX2.date, y + 5, { width: 85 });
      doc.text("Description", colX2.desc, y + 5, { width: 195 });
      doc.text("Category", colX2.category, y + 5, { width: 125 });
      doc.text("Amount", colX2.amount, y + 5, { width: 60, align: "right" });
    }
    let tableTop2 = doc.y;
    drawHeader(tableTop2);
    let rowY2 = tableTop2 + 22;
    expenses.forEach((e, i) => {
      if (rowY2 > 690) {
        pageFooter(doc);
        doc.addPage();
        pageHeader(doc, "Litter Financial Statement (cont.)");
        tableTop2 = doc.y;
        drawHeader(tableTop2);
        rowY2 = tableTop2 + 22;
      }
      doc.font("Helvetica").fontSize(9);
      const rowH = Math.max(18, doc.heightOfString(e.description || "—", { width: 195 }) + 6);
      if (i % 2 === 0) doc.rect(60, rowY2 - 2, 480, rowH).fill("#fafafa");
      doc.font("Helvetica").fontSize(9).fillColor(TEXT);
      doc.text(new Date(e.date).toLocaleDateString("en-AU"), colX2.date, rowY2, { width: 85 });
      doc.text(e.description || "—", colX2.desc, rowY2, { width: 195 });
      doc.text(CATEGORY_LABELS[e.category] ?? e.category, colX2.category, rowY2, { width: 125 });
      doc.text(money(e.amount), colX2.amount, rowY2, { width: 60, align: "right" });
      rowY2 += rowH;
    });
    doc.y = rowY2 + 10;
  }

  pageFooter(doc);
  doc.end();
});

export default router;
