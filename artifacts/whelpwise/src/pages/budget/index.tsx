import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useGetBudgetSummary, useListExpenses, useListLitters,
  useCreateExpense, useDeleteExpense,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PiggyBank, Plus, Trash2, TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronRight, Baby,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
const CATEGORIES = Object.keys(CATEGORY_LABELS);

function money(n: number) {
  return `£${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ProfitBadge({ amount }: { amount: number }) {
  const positive = amount >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
      {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {positive ? money(amount) : `-${money(Math.abs(amount))}`}
    </span>
  );
}

function ExpenseForm({
  litterOptions, lockedLitterId, onClose, onCreated,
}: {
  litterOptions: { id: number; label: string }[];
  lockedLitterId?: number;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { toast } = useToast();
  const createExpense = useCreateExpense();
  const [form, setForm] = useState({
    litterId: lockedLitterId ? String(lockedLitterId) : "general",
    category: "other",
    description: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    try {
      await createExpense.mutateAsync({
        data: {
          litterId: form.litterId === "general" ? null : parseInt(form.litterId, 10),
          category: form.category as any,
          description: form.description || null,
          amount,
          date: form.date,
        },
      });
      await onCreated();
      toast({ title: "Expense added" });
      onClose();
    } catch {
      toast({ title: "Error adding expense", variant: "destructive" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
      {lockedLitterId === undefined && (
        <div className="space-y-1">
          <Label className="text-xs">Litter</Label>
          <Select value={form.litterId} onValueChange={v => set("litterId", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General / Kennel (not litter-specific)</SelectItem>
              {litterOptions.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">Category</Label>
        <Select value={form.category} onValueChange={v => set("category", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Amount (£)</Label>
        <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => set("amount", e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Date</Label>
        <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} required />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label className="text-xs">Description (optional)</Label>
        <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="e.g. Vet check-up, microchipping" />
      </div>
      <div className="sm:col-span-2 flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={createExpense.isPending}>
          {createExpense.isPending ? "Saving…" : "Add Expense"}
        </Button>
      </div>
    </form>
  );
}

function ExpenseList({
  litterId, onDeleted,
}: {
  litterId: number;
  onDeleted: () => Promise<void>;
}) {
  const { data, isLoading, refetch } = useListExpenses({ litterId });
  const deleteExpense = useDeleteExpense();
  const { toast } = useToast();
  const expenses = (data as any[] | undefined) ?? [];

  async function handleDelete(id: number) {
    try {
      await deleteExpense.mutateAsync({ expenseId: id });
      await refetch();
      await onDeleted();
      toast({ title: "Expense deleted" });
    } catch {
      toast({ title: "Error deleting expense", variant: "destructive" });
    }
  }

  if (isLoading) return <Skeleton className="h-16 w-full rounded-lg" />;
  if (expenses.length === 0) return <p className="text-sm text-muted-foreground py-2">No expenses logged yet.</p>;

  return (
    <div className="space-y-1.5">
      {expenses.map((e: any) => (
        <div key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border bg-card text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className="text-xs whitespace-nowrap">{CATEGORY_LABELS[e.category] ?? e.category}</Badge>
            <span className="truncate text-muted-foreground">{e.description || "—"}</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-muted-foreground">{format(new Date(e.date), "d MMM yyyy")}</span>
            <span className="font-medium">{money(e.amount)}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(e.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function LitterBudgetCard({
  litter, expanded, onToggle, onDataChanged,
}: {
  litter: { litterId: number; label: string; dob: string | null; status: string; totalExpenses: number; totalIncome: number; profit: number; puppyCount: number };
  expanded: boolean;
  onToggle: () => void;
  onDataChanged: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <Card>
      <button onClick={onToggle} className="w-full text-left">
        <CardHeader className="flex flex-row items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {expanded ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
            <Baby className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{litter.label}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {litter.dob ? format(new Date(litter.dob), "d MMM yyyy") : "DOB TBD"} · {litter.puppyCount} puppies
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5 flex-shrink-0 text-right">
            <div>
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">{money(litter.totalIncome)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Costs</p>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{money(litter.totalExpenses)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Profit</p>
              <ProfitBadge amount={litter.profit} />
            </div>
          </div>
        </CardHeader>
      </button>
      {expanded && (
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <Link href={`/litters/${litter.litterId}`} className="text-xs text-primary hover:underline">View litter →</Link>
            <Button size="sm" variant="outline" onClick={() => setShowForm(s => !s)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Cost
            </Button>
          </div>
          {showForm && (
            <ExpenseForm
              litterOptions={[]}
              lockedLitterId={litter.litterId}
              onClose={() => setShowForm(false)}
              onCreated={onDataChanged}
            />
          )}
          <ExpenseList litterId={litter.litterId} onDeleted={onDataChanged} />
        </CardContent>
      )}
    </Card>
  );
}

export default function BudgetPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [expandedLitter, setExpandedLitter] = useState<number | null>(null);
  const [showGeneralForm, setShowGeneralForm] = useState(false);

  const { data: summary, isLoading, refetch: refetchSummary } = useGetBudgetSummary({ year });
  const { data: litters } = useListLitters();
  const generalExpensesQuery = useListExpenses({ year });

  async function refreshAll() {
    await refetchSummary();
    await generalExpensesQuery.refetch();
  }

  const litterOptions = useMemo(
    () => ((litters as any[] | undefined) ?? []).map(l => ({
      id: l.id,
      label: `${l.damName ?? "Unknown Dam"} × ${l.sireName ?? "Unknown Sire"}`,
    })),
    [litters]
  );

  const years = useMemo(() => {
    const set = new Set<number>([currentYear]);
    for (const l of summary?.litters ?? []) {
      if (l.dob) set.add(new Date(l.dob).getFullYear());
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [summary, currentYear]);

  const generalExpenses = ((generalExpensesQuery.data as any[] | undefined) ?? []).filter(e => e.litterId == null);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif flex items-center gap-2">
            <PiggyBank className="h-7 w-7 text-primary" /> Budgeting
          </h1>
          <p className="text-muted-foreground mt-1">Track costs and income for each litter, and your total for the year.</p>
        </div>
        <Select value={String(year)} onValueChange={v => setYear(parseInt(v, 10))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> Total Income</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{money(summary?.totalIncome ?? 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5"><TrendingDown className="h-4 w-4" /> Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{money(summary?.totalExpenses ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">incl. {money(summary?.generalExpenses ?? 0)} general/kennel</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Wallet className="h-4 w-4" /> Net Profit</p>
              <p className="text-2xl font-bold mt-1"><ProfitBadge amount={summary?.totalProfit ?? 0} /></p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Litters in {year}</h2>
        {isLoading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : (summary?.litters ?? []).length === 0 ? (
          <div className="py-10 text-center border rounded-lg border-dashed text-muted-foreground">
            No litters with a date of birth in {year}.
          </div>
        ) : (
          <div className="space-y-2">
            {(summary?.litters ?? []).map((l: any) => (
              <LitterBudgetCard
                key={l.litterId}
                litter={l}
                expanded={expandedLitter === l.litterId}
                onToggle={() => setExpandedLitter(expandedLitter === l.litterId ? null : l.litterId)}
                onDataChanged={refreshAll}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">General / Kennel Expenses</h2>
          <Button size="sm" variant="outline" onClick={() => setShowGeneralForm(s => !s)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Expense
          </Button>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">Costs not tied to a specific litter, e.g. kennel club membership, equipment.</p>
        {showGeneralForm && (
          <ExpenseForm
            litterOptions={litterOptions}
            onClose={() => setShowGeneralForm(false)}
            onCreated={refreshAll}
          />
        )}
        {generalExpensesQuery.isLoading ? (
          <Skeleton className="h-16 w-full rounded-lg" />
        ) : generalExpenses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No general expenses logged for {year}.</p>
        ) : (
          <div className="space-y-1.5">
            {generalExpenses.map((e: any) => (
              <GeneralExpenseRow key={e.id} expense={e} onDeleted={refreshAll} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GeneralExpenseRow({ expense, onDeleted }: { expense: any; onDeleted: () => Promise<void> }) {
  const deleteExpense = useDeleteExpense();
  const { toast } = useToast();

  async function handleDelete() {
    try {
      await deleteExpense.mutateAsync({ expenseId: expense.id });
      await onDeleted();
      toast({ title: "Expense deleted" });
    } catch {
      toast({ title: "Error deleting expense", variant: "destructive" });
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border bg-card text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="outline" className="text-xs whitespace-nowrap">{CATEGORY_LABELS[expense.category] ?? expense.category}</Badge>
        <span className="truncate text-muted-foreground">{expense.description || "—"}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-muted-foreground">{format(new Date(expense.date), "d MMM yyyy")}</span>
        <span className="font-medium">{money(expense.amount)}</span>
        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
