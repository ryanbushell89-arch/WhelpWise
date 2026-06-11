import { useState } from "react";
import { Link } from "wouter";
import { useListContracts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, ChevronRight } from "lucide-react";
import { format } from "date-fns";

type FilterType = "all" | "puppy_sale_limited" | "puppy_sale_main" | "stud";

const TYPE_LABELS: Record<string, string> = {
  puppy_sale_limited: "Limited AKC",
  puppy_sale_main: "Full / Main",
  stud: "Stud",
};
const TYPE_COLORS: Record<string, string> = {
  puppy_sale_limited: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  puppy_sale_main: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  stud: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  signed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  void: "bg-destructive/20 text-destructive",
};

export default function ContractsDirectory() {
  const [filter, setFilter] = useState<FilterType>("all");
  const { data, isLoading } = useListContracts();
  const contracts = (data as any[] | undefined) ?? [];
  const filtered = filter === "all" ? contracts : contracts.filter((c: any) => c.type === filter);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif">Contracts</h1>
          <p className="text-muted-foreground mt-1">Puppy sale and stud service agreements.</p>
        </div>
        <Button asChild>
          <Link href="/contracts/new"><Plus className="mr-2 h-4 w-4" />New Contract</Link>
        </Button>
      </div>

      {/* Type filter */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {(["all", "puppy_sale_limited", "puppy_sale_main", "stud"] as FilterType[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${filter === f ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? "All" : TYPE_LABELS[f]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border rounded-lg border-dashed">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-3" />
          <h3 className="text-lg font-medium">No contracts yet</h3>
          <Button className="mt-4" asChild><Link href="/contracts/new">Create First Contract</Link></Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c: any) => {
            const partyName = c.type === "stud" ? c.bitchOwnerName : c.buyerName;
            const subject = c.type === "stud" ? (c.bitchName ?? c.studName ?? "Stud Service") : c.puppyName;
            return (
              <Link key={c.id} href={`/contracts/${c.id}`}
                className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-primary/50 hover:bg-muted/30 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[c.type] ?? "bg-muted text-muted-foreground"}`}>
                      {TYPE_LABELS[c.type] ?? c.type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[c.status] ?? "bg-muted text-muted-foreground"}`}>
                      {c.status ?? "draft"}
                    </span>
                  </div>
                  <div className="font-semibold mt-0.5">{partyName ?? "Unknown party"}{subject ? ` — ${subject}` : ""}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.contractDate ? format(new Date(c.contractDate), "d MMM yyyy") : "No date"}{c.salePrice ? ` · £${c.salePrice}` : ""}{c.studFee ? ` · Fee: £${c.studFee}` : ""}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
