import { useRoute, Link } from "wouter";
import { useGetBuyer } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, XCircle, Mail, Phone, MapPin, Edit } from "lucide-react";
import { format } from "date-fns";

export default function BuyerDetail() {
  const [, params] = useRoute("/buyers/:id");
  const buyerId = parseInt(params?.id ?? "0", 10);
  const { data: buyer, isLoading } = useGetBuyer(buyerId);

  if (isLoading) return <div className="p-8"><Skeleton className="h-48 w-full rounded-xl" /></div>;
  if (!buyer) return <div className="p-8 text-muted-foreground">Buyer not found.</div>;

  const StatusBadge = ({ done, label }: { done: boolean; label: string }) => (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-sm">{label}</span>
      {done
        ? <Badge className="bg-green-600 text-white text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>
        : <Badge variant="outline" className="text-xs text-muted-foreground"><XCircle className="h-3 w-3 mr-1" />Pending</Badge>}
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/buyers"><ArrowLeft className="h-4 w-4 mr-1" /> Buyers</Link>
      </Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl font-serif">
            {buyer.firstName[0]}{buyer.lastName[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif">{buyer.firstName} {buyer.lastName}</h1>
            {buyer.email && (
              <a href={`mailto:${buyer.email}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mt-1">
                <Mail className="h-3.5 w-3.5" />{buyer.email}
              </a>
            )}
            {buyer.phone && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <Phone className="h-3.5 w-3.5" />{buyer.phone}
              </div>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-1" /> Edit
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Contract & Payment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <StatusBadge done={buyer.contractSigned ?? false} label="Contract Signed" />
            <StatusBadge done={buyer.depositPaid ?? false} label={`Deposit (${buyer.depositAmount ? `$${buyer.depositAmount}` : "N/A"})`} />
            <StatusBadge done={buyer.balancePaid ?? false} label={`Balance (${buyer.balanceAmount ? `$${buyer.balanceAmount}` : "N/A"})`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contact Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {buyer.email && (
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <a href={`mailto:${buyer.email}`} className="hover:text-primary transition-colors">{buyer.email}</a>
              </div>
            )}
            {buyer.phone && (
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{buyer.phone}</span>
              </div>
            )}
            {buyer.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{buyer.address}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {buyer.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{buyer.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
