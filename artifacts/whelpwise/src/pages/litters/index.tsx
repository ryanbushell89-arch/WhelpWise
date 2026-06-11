import { useState } from "react";
import { useListLitters, useDeleteLitter } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Baby, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  expected: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  whelped: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  completed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function LittersDirectory() {
  const { data: litters, isLoading, refetch } = useListLitters();
  const deleteLitter = useDeleteLitter();
  const { toast } = useToast();
  const [confirmId, setConfirmId] = useState<number | null>(null);

  async function handleDelete(id: number) {
    try {
      await deleteLitter.mutateAsync({ litterId: id });
      await refetch();
      setConfirmId(null);
      toast({ title: "Litter deleted" });
    } catch {
      toast({ title: "Error deleting litter", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif">Litters</h1>
          <p className="text-muted-foreground mt-1">Track all litters and whelping events.</p>
        </div>
        <Button asChild>
          <Link href="/litters/new"><Plus className="h-4 w-4 mr-2" /> New Litter</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : !litters || litters.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
          <Baby className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No litters yet</p>
          <p className="text-sm mt-1">Record a new litter to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(litters as any[]).map((litter) => (
            <div key={litter.id}>
              <Card className={`transition-colors ${confirmId === litter.id ? "border-destructive/60 bg-destructive/5" : "hover:border-primary/50"}`}>
                <CardContent className="flex items-center justify-between p-5 gap-3">
                  <Link href={`/litters/${litter.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <Baby className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {litter.damName ?? "Unknown Dam"} × {litter.sireName ?? "Unknown Sire"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {litter.dob ? format(new Date(litter.dob), "d MMM yyyy") : "Due date TBD"}
                        {litter.totalBorn != null && ` · ${litter.totalBorn} pups`}
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {litter.liveMales != null && (
                      <div className="text-center hidden sm:block">
                        <div className="text-sm font-medium">{litter.liveMales}♂ {litter.liveFemales}♀</div>
                        <div className="text-xs text-muted-foreground">Live</div>
                      </div>
                    )}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[litter.status] ?? statusColors.completed}`}>
                      {litter.status}
                    </span>

                    {confirmId === litter.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-destructive font-medium hidden sm:inline">Delete?</span>
                        <Button size="sm" variant="destructive" className="h-7 text-xs px-2"
                          disabled={deleteLitter.isPending}
                          onClick={() => handleDelete(litter.id)}>
                          Yes, delete
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2"
                          onClick={() => setConfirmId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button size="icon" variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.preventDefault(); setConfirmId(litter.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {confirmId === litter.id && (
                <div className="flex items-start gap-2 px-4 py-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 border-t-0 rounded-b-xl">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>This will permanently delete the litter and all its puppies, weights, worming, vaccination, and document records.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
