import { useListBreedings } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HeartPulse, Plus } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function BreedingsDirectory() {
  const { data: breedings, isLoading } = useListBreedings({});

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif">Breedings</h1>
          <p className="text-muted-foreground mt-1">Log and track all breeding events.</p>
        </div>
        <Button asChild>
          <Link href="/breedings/new"><Plus className="h-4 w-4 mr-2" /> Record Breeding</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : !breedings || breedings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
          <HeartPulse className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No breedings recorded</p>
          <p className="text-sm mt-1">Log your first breeding event to track pregnancies and litters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(breedings as any[]).map((b) => (
            <Link key={b.id} href={`/breedings/${b.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <HeartPulse className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{b.damName} × {b.sireName}</div>
                      <div className="text-sm text-muted-foreground">
                        {b.date ? format(new Date(b.date), "d MMM yyyy") : ""} · <span className="capitalize">{b.method}</span>
                        {b.tieDuration && ` · ${b.tieDuration} min tie`}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild onClick={e => e.preventDefault()}>
                    <Link href={`/breedings/${b.id}/pregnancy`}>Pregnancy →</Link>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
