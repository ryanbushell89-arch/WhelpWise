import { useListBuyers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, CheckCircle2, XCircle, Mail, Phone } from "lucide-react";
import { Link } from "wouter";

export default function BuyersDirectory() {
  const { data: buyers, isLoading } = useListBuyers();

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
            <Link key={buyer.id} href={`/buyers/${buyer.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg font-serif">
                      {buyer.firstName[0]}{buyer.lastName[0]}
                    </div>
                    <div>
                      <div className="font-semibold">{buyer.firstName} {buyer.lastName}</div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        {buyer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{buyer.email}</span>}
                        {buyer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{buyer.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="hidden sm:flex gap-2">
                      <Badge variant={buyer.contractSigned ? "default" : "outline"} className={`text-xs ${buyer.contractSigned ? "bg-green-600 text-white" : ""}`}>
                        {buyer.contractSigned ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        Contract
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
