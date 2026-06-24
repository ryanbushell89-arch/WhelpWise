import { useState } from "react";
import { useListBuyers, useDeleteBuyer } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, CheckCircle2, XCircle, Mail, Phone, Trash2, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function BuyersDirectory() {
  const { data: buyers, isLoading, refetch } = useListBuyers();
  const deleteBuyer = useDeleteBuyer();
  const { toast } = useToast();
  const [confirmId, setConfirmId] = useState<number | null>(null);

  async function handleDelete(id: number) {
    try {
      await deleteBuyer.mutateAsync({ buyerId: id });
      await refetch();
      setConfirmId(null);
      toast({ title: "Buyer deleted" });
    } catch {
      toast({ title: "Error deleting buyer", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif">Buyers</h1>
          <p className="text-muted-foreground mt-1">Manage puppy buyers, deposits, and contracts.</p>
        </div>
        <Button asChild>
          <Link href="/buyers/new"><Plus className="h-4 w-4 mr-2" /> Add Buyer</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : !buyers || buyers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No buyers yet</p>
          <p className="text-sm mt-1">Add buyers and assign puppies to them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(buyers as any[]).map((buyer) => (
            <div key={buyer.id}>
              <Card className={`transition-colors ${confirmId === buyer.id ? "border-destructive/60 bg-destructive/5" : "hover:border-primary/50"}`}>
                <CardContent className="flex items-center justify-between p-5 gap-3">
                  <Link href={`/buyers/${buyer.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg font-serif flex-shrink-0">
                      {buyer.firstName[0]}{buyer.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{buyer.firstName} {buyer.lastName}</div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        {buyer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{buyer.email}</span>}
                        {buyer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{buyer.phone}</span>}
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="hidden sm:flex gap-2">
                      <Badge variant={buyer.contractSigned ? "default" : "outline"} className={`text-xs ${buyer.contractSigned ? "bg-green-600 text-white" : ""}`}>
                        {buyer.contractSigned ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        Contract
                      </Badge>
                    </div>

                    {confirmId === buyer.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-destructive font-medium hidden sm:inline">Delete?</span>
                        <Button size="sm" variant="destructive" className="h-7 text-xs px-2"
                          disabled={deleteBuyer.isPending}
                          onClick={() => handleDelete(buyer.id)}>
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
                        onClick={(e) => { e.preventDefault(); setConfirmId(buyer.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {confirmId === buyer.id && (
                <div className="flex items-start gap-2 px-4 py-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 border-t-0 rounded-b-xl">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>This will remove the buyer and unassign them from any puppies. Sale and contract records on those puppies are kept.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
