import { useState } from "react";
import { Link } from "wouter";
import { useListWaitingList } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CheckCircle2, Circle, ChevronRight, ClipboardList } from "lucide-react";

const STATUS_TABS = ["all", "waiting", "assigned", "completed", "cancelled"] as const;
type StatusFilter = typeof STATUS_TABS[number];

const STATUS_COLORS: Record<string, string> = {
  waiting: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  assigned: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-muted text-muted-foreground",
};

export default function WaitingListDirectory() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const { data, isLoading } = useListWaitingList();
  const entries = (data as any[] | undefined) ?? [];
  const filtered = filter === "all" ? entries : entries.filter(e => e.status === filter);

  const counts: Record<string, number> = {};
  for (const e of entries) counts[e.status] = (counts[e.status] ?? 0) + 1;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif">Waiting List</h1>
          <p className="text-muted-foreground mt-1">Manage people waiting for a puppy from your kennel.</p>
        </div>
        <Button asChild>
          <Link href="/waiting-list/new"><Plus className="mr-2 h-4 w-4" />Add Person</Link>
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap capitalize transition-colors ${filter === s ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {s === "all" ? "All" : s}
            {s !== "all" && counts[s] ? <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">{counts[s]}</span> : null}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border rounded-lg border-dashed">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-3" />
          <h3 className="text-lg font-medium">No entries{filter !== "all" ? ` with status "${filter}"` : ""}</h3>
          {filter === "all" && (
            <Button className="mt-4" asChild><Link href="/waiting-list/new">Add First Person</Link></Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e: any) => (
            <Link key={e.id} href={`/waiting-list/${e.id}`}
              className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-primary/50 hover:bg-muted/30 transition-colors group">
              {/* Priority badge */}
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-sm font-bold text-muted-foreground">
                {e.priority ?? "—"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{e.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[e.status] ?? ""}`}>{e.status}</span>
                  {e.depositPaid && (
                    <span className="text-xs flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" /> Deposit paid
                    </span>
                  )}
                  {!e.depositPaid && (
                    <span className="text-xs flex items-center gap-1 text-muted-foreground">
                      <Circle className="h-3 w-3" /> No deposit
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
                  {e.phone && <span>{e.phone}</span>}
                  {e.email && <span className="hidden sm:inline truncate max-w-[200px]">{e.email}</span>}
                  {e.sexPreference && e.sexPreference !== "either" && <span className="capitalize">{e.sexPreference} puppy</span>}
                  {e.colourPreference && <span>{e.colourPreference}</span>}
                  {e.breedPreference && <span>{e.breedPreference}</span>}
                  {e.puppyName && <span className="text-amber-600 dark:text-amber-400 font-medium">→ {e.puppyName}</span>}
                </div>
              </div>

              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
