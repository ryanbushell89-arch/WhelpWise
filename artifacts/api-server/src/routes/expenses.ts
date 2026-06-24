import { Router, type IRouter } from "express";
import { db, expensesTable, littersTable, puppiesTable, dogsTable, openingBalancesTable } from "@workspace/db";
import { eq, and, gte, lte, lt, isNull } from "drizzle-orm";
import {
  CreateExpenseBody, UpdateExpenseBody, ListExpensesQueryParams, GetBudgetSummaryQueryParams,
  GetOpeningBalanceQueryParams, SetOpeningBalanceBody,
} from "@workspace/api-zod";
import { type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request } from "express";

const router: IRouter = Router();

function uid(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function formatOpeningBalance(year: number, row?: typeof openingBalancesTable.$inferSelect) {
  return {
    id: row?.id ?? null,
    year,
    income: row?.income ?? 0,
    expenses: row?.expenses ?? 0,
    notes: row?.notes ?? null,
  };
}

async function getOpeningBalanceRow(userId: string, year: number) {
  const [row] = await db.select().from(openingBalancesTable)
    .where(and(eq(openingBalancesTable.userId, userId), eq(openingBalancesTable.year, year)));
  return row;
}

// Cumulative net profit from all activity strictly before `year` — litters,
// general expenses, and opening balances alike — so it can be carried
// forward as the current year's starting position.
async function computeRetainedEarnings(userId: string, year: number) {
  const cutoff = `${year}-01-01`;

  const priorLitters = await db.select().from(littersTable)
    .where(and(eq(littersTable.userId, userId), lt(littersTable.dob, cutoff)));
  let income = 0;
  for (const litter of priorLitters) {
    const puppies = await db.select().from(puppiesTable).where(eq(puppiesTable.litterId, litter.id));
    for (const puppy of puppies) {
      if (!puppy.buyerId) continue;
      if (puppy.depositPaid === "true") income += puppy.depositAmount ?? 0;
      if (puppy.balancePaid === "true") income += puppy.balanceAmount ?? 0;
    }
  }

  const priorExpenseRows = await db.select().from(expensesTable)
    .where(and(eq(expensesTable.userId, userId), lt(expensesTable.date, cutoff)));
  const expenses = priorExpenseRows.reduce((sum, e) => sum + e.amount, 0);

  const priorOpeningBalances = await db.select().from(openingBalancesTable)
    .where(and(eq(openingBalancesTable.userId, userId), lt(openingBalancesTable.year, year)));
  const obIncome = priorOpeningBalances.reduce((sum, o) => sum + o.income, 0);
  const obExpenses = priorOpeningBalances.reduce((sum, o) => sum + o.expenses, 0);

  return { totalIncome: income + obIncome, totalExpenses: expenses + obExpenses };
}

function formatExpense(e: typeof expensesTable.$inferSelect) {
  return {
    id: e.id,
    litterId: e.litterId,
    category: e.category,
    description: e.description,
    amount: e.amount,
    date: e.date,
    createdAt: e.createdAt.toISOString(),
  };
}

// Shared by the JSON budget summary and both PDF reports so income/expense
// numbers can never drift between them.
export async function computeLitterFinancials(userId: string, litter: typeof littersTable.$inferSelect) {
  const litterExpenses = await db.select().from(expensesTable)
    .where(and(eq(expensesTable.userId, userId), eq(expensesTable.litterId, litter.id)));
  const totalExpenses = litterExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Income is summed per-puppy (not per-buyer) so a buyer taking multiple
  // puppies from the same litter doesn't get their payment counted twice.
  const puppies = await db.select().from(puppiesTable).where(eq(puppiesTable.litterId, litter.id));
  let totalIncome = 0;
  let totalPledged = 0;
  for (const puppy of puppies) {
    if (!puppy.buyerId) continue;
    totalPledged += puppy.salePrice ?? ((puppy.depositAmount ?? 0) + (puppy.balanceAmount ?? 0));
    if (puppy.depositPaid === "true") totalIncome += puppy.depositAmount ?? 0;
    if (puppy.balancePaid === "true") totalIncome += puppy.balanceAmount ?? 0;
  }

  const [sire] = litter.sireId ? await db.select().from(dogsTable).where(eq(dogsTable.id, litter.sireId)) : [undefined];
  const [dam] = litter.damId ? await db.select().from(dogsTable).where(eq(dogsTable.id, litter.damId)) : [undefined];
  const label = `${dam?.registeredName ?? "Unknown Dam"} × ${sire?.registeredName ?? "Unknown Sire"}`;

  return {
    litterId: litter.id,
    label,
    damName: dam?.registeredName ?? null,
    sireName: sire?.registeredName ?? null,
    dob: litter.dob,
    status: litter.status,
    totalExpenses,
    totalIncome,
    totalPledged,
    profit: totalIncome - totalExpenses,
    puppyCount: puppies.length,
    expenses: litterExpenses,
    puppies,
  };
}

// ─── Expenses ───────────────────────────────────────────────────────────────
router.get("/expenses", async (req, res): Promise<void> => {
  const userId = uid(req);
  const parsed = ListExpensesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const conditions = [eq(expensesTable.userId, userId)];
  if (parsed.data.litterId !== undefined) conditions.push(eq(expensesTable.litterId, parsed.data.litterId));
  if (parsed.data.year !== undefined) {
    conditions.push(gte(expensesTable.date, `${parsed.data.year}-01-01`));
    conditions.push(lte(expensesTable.date, `${parsed.data.year}-12-31`));
  }
  const expenses = await db.select().from(expensesTable)
    .where(and(...conditions))
    .orderBy(expensesTable.date);
  res.json(expenses.map(formatExpense));
});

router.post("/expenses", async (req, res): Promise<void> => {
  const userId = uid(req);
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [expense] = await db.insert(expensesTable).values({
    ...parsed.data,
    userId,
    litterId: parsed.data.litterId ?? null,
    description: parsed.data.description ?? null,
  }).returning();
  res.status(201).json(formatExpense(expense));
});

router.patch("/expenses/:expenseId", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseId(req.params.expenseId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid expenseId" }); return; }
  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [expense] = await db.update(expensesTable).set(parsed.data)
    .where(and(eq(expensesTable.id, id), eq(expensesTable.userId, userId)))
    .returning();
  if (!expense) { res.status(404).json({ error: "Expense not found" }); return; }
  res.json(formatExpense(expense));
});

router.delete("/expenses/:expenseId", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseId(req.params.expenseId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid expenseId" }); return; }
  await db.delete(expensesTable).where(and(eq(expensesTable.id, id), eq(expensesTable.userId, userId)));
  res.status(204).send();
});

// Shared by the JSON budget summary and the annual PDF report.
export async function computeBudgetSummary(userId: string, year: number) {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const litters = await db.select().from(littersTable)
    .where(and(
      eq(littersTable.userId, userId),
      gte(littersTable.dob, yearStart),
      lte(littersTable.dob, yearEnd),
    ));

  const litterSummaries = await Promise.all(litters.map(async (litter) => {
    const { expenses, puppies, ...summary } = await computeLitterFinancials(userId, litter);
    return summary;
  }));

  const generalExpensesRows = await db.select().from(expensesTable)
    .where(and(
      eq(expensesTable.userId, userId),
      isNull(expensesTable.litterId),
      gte(expensesTable.date, yearStart),
      lte(expensesTable.date, yearEnd),
    ));
  const generalExpenses = generalExpensesRows.reduce((sum, e) => sum + e.amount, 0);

  const openingBalanceRow = await getOpeningBalanceRow(userId, year);
  const openingBalance = formatOpeningBalance(year, openingBalanceRow);

  const totalExpenses = litterSummaries.reduce((sum, l) => sum + l.totalExpenses, 0) + generalExpenses + openingBalance.expenses;
  const totalIncome = litterSummaries.reduce((sum, l) => sum + l.totalIncome, 0) + openingBalance.income;
  const totalPledged = litterSummaries.reduce((sum, l) => sum + l.totalPledged, 0) + openingBalance.income;
  const totalProfit = totalIncome - totalExpenses;

  const retained = await computeRetainedEarnings(userId, year);
  const retainedEarnings = retained.totalIncome - retained.totalExpenses;
  const cumulativeIncome = retained.totalIncome + totalIncome;
  const cumulativeExpenses = retained.totalExpenses + totalExpenses;

  return {
    year,
    litters: litterSummaries,
    generalExpenses,
    totalExpenses,
    totalIncome,
    totalPledged,
    totalProfit,
    openingBalance,
    retainedEarnings,
    cumulativeIncome,
    cumulativeExpenses,
    cumulativeProfit: cumulativeIncome - cumulativeExpenses,
  };
}

// ─── Budget Summary ───────────────────────────────────────────────────────────
router.get("/budget/summary", async (req, res): Promise<void> => {
  const userId = uid(req);
  const parsed = GetBudgetSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const year = parsed.data.year ?? new Date().getFullYear();
  res.json(await computeBudgetSummary(userId, year));
});

// ─── Fiscal Years ───────────────────────────────────────────────────────────────
router.get("/budget/years", async (req, res): Promise<void> => {
  const userId = uid(req);
  const years = new Set<number>([new Date().getFullYear()]);

  const litters = await db.select({ dob: littersTable.dob }).from(littersTable).where(eq(littersTable.userId, userId));
  for (const l of litters) if (l.dob) years.add(new Date(l.dob).getFullYear());

  const expenseDates = await db.select({ date: expensesTable.date }).from(expensesTable).where(eq(expensesTable.userId, userId));
  for (const e of expenseDates) years.add(new Date(e.date).getFullYear());

  const balances = await db.select({ year: openingBalancesTable.year }).from(openingBalancesTable).where(eq(openingBalancesTable.userId, userId));
  for (const o of balances) years.add(o.year);

  res.json(Array.from(years).sort((a, b) => b - a));
});

// ─── Opening Balance / Manual Adjustment ───────────────────────────────────────
router.get("/budget/opening-balance", async (req, res): Promise<void> => {
  const userId = uid(req);
  const parsed = GetOpeningBalanceQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const row = await getOpeningBalanceRow(userId, parsed.data.year);
  res.json(formatOpeningBalance(parsed.data.year, row));
});

router.put("/budget/opening-balance", async (req, res): Promise<void> => {
  const userId = uid(req);
  const parsed = SetOpeningBalanceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { year, income, expenses, notes } = parsed.data;
  const existing = await getOpeningBalanceRow(userId, year);
  const [row] = existing
    ? await db.update(openingBalancesTable).set({ income, expenses, notes: notes ?? null })
        .where(eq(openingBalancesTable.id, existing.id)).returning()
    : await db.insert(openingBalancesTable).values({ userId, year, income, expenses, notes: notes ?? null }).returning();
  res.json(formatOpeningBalance(year, row));
});

export default router;
