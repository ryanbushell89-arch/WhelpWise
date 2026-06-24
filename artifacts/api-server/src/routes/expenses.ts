import { Router, type IRouter } from "express";
import { db, expensesTable, littersTable, puppiesTable, dogsTable } from "@workspace/db";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
import { CreateExpenseBody, UpdateExpenseBody, ListExpensesQueryParams, GetBudgetSummaryQueryParams } from "@workspace/api-zod";
import { type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request } from "express";

const router: IRouter = Router();

function uid(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
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

  const totalExpenses = litterSummaries.reduce((sum, l) => sum + l.totalExpenses, 0) + generalExpenses;
  const totalIncome = litterSummaries.reduce((sum, l) => sum + l.totalIncome, 0);
  const totalPledged = litterSummaries.reduce((sum, l) => sum + l.totalPledged, 0);

  return {
    year,
    litters: litterSummaries,
    generalExpenses,
    totalExpenses,
    totalIncome,
    totalPledged,
    totalProfit: totalIncome - totalExpenses,
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

export default router;
