import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useGetContract, useDeleteContract } from "@workspace/api-client-react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Edit, Trash2, Printer, Download, FileText, Loader2,
  CheckCircle2, Clock, Eye, Send, Link2, RefreshCw, ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const TYPE_LABELS: Record<string, string> = {
  puppy_sale_limited: "Puppy Sale — Limited / Pet",
  puppy_sale_main: "Puppy Sale — Full / Main Registration",
  stud: "Stud Service Agreement",
};
const TYPE_COLORS: Record<string, string> = {
  puppy_sale_limited: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  puppy_sale_main: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  stud: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};
const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-muted text-muted-foreground",
  sent:      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  viewed:    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  signed:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected:  "bg-destructive/20 text-destructive",
  void:      "bg-destructive/20 text-destructive",
};

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <span className="text-xs text-muted-foreground w-36 flex-shrink-0">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function PrintView({ c }: { c: any }) {
  const isStud = c.type === "stud";
  return (
    <div id="print-area" className="p-8 bg-white text-black rounded-lg border space-y-6 font-serif text-sm leading-relaxed">
      {/* Header */}
      <div className="text-center space-y-1 border-b pb-6">
        <h1 className="text-2xl font-bold">{TYPE_LABELS[c.type] ?? c.type}</h1>
        <p className="text-muted-foreground text-sm">
          {c.contractDate ? format(new Date(c.contractDate), "d MMMM yyyy") : "Date: __________"}
        </p>
      </div>

      {/* Parties */}
      <section>
        <h2 className="font-bold text-base mb-3">PARTIES</h2>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="font-semibold mb-1">Breeder / Seller</p>
            <p className="text-muted-foreground">Name: _______________________</p>
            <p className="text-muted-foreground">Address: _______________________</p>
            <p className="text-muted-foreground">Phone: _______________________</p>
          </div>
          <div>
            <p className="font-semibold mb-1">{isStud ? "Bitch Owner" : "Buyer"}</p>
            {isStud ? (
              <>
                <p>{c.bitchOwnerName || "_______________________"}</p>
                <p className="text-xs whitespace-pre-wrap">{c.bitchOwnerAddress || "_______________________"}</p>
                <p>{c.bitchOwnerPhone || ""}{c.bitchOwnerEmail ? ` / ${c.bitchOwnerEmail}` : ""}</p>
              </>
            ) : (
              <>
                <p>{c.buyerName || "_______________________"}</p>
                <p className="text-xs whitespace-pre-wrap">{c.buyerAddress || "_______________________"}</p>
                <p>{c.buyerPhone || ""}{c.buyerEmail ? ` / ${c.buyerEmail}` : ""}</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Subject */}
      {isStud ? (
        <section>
          <h2 className="font-bold text-base mb-3">BITCH DETAILS</h2>
          <div className="grid grid-cols-3 gap-4">
            <Row label="Name" value={c.bitchName} />
            <Row label="Breed" value={c.bitchBreed} />
            <Row label="Reg. Number" value={c.bitchRegNumber} />
          </div>
        </section>
      ) : (
        <section>
          <h2 className="font-bold text-base mb-3">PUPPY DETAILS</h2>
          {c.puppyName ? <p>The following puppy: <strong>{c.puppyName}</strong></p> : <p>The puppy described below:</p>}
        </section>
      )}

      {/* Financial */}
      <section>
        <h2 className="font-bold text-base mb-3">FINANCIAL TERMS</h2>
        <div className="space-y-1">
          {isStud ? (
            <>
              <Row label="Stud Fee" value={c.studFee ? `£${c.studFee}` : undefined} />
              <Row label="Payment Terms" value={c.studFeePaymentTerms} />
            </>
          ) : (
            <>
              <Row label="Sale Price" value={c.salePrice ? `£${c.salePrice}` : undefined} />
              <Row label="Deposit Paid" value={c.depositAmount ? `£${c.depositAmount}` : undefined} />
              <Row label="Balance Due" value={c.balanceDue ? `£${c.balanceDue}` : undefined} />
              <Row label="Balance Due Date" value={c.balanceDueDate ? format(new Date(c.balanceDueDate), "d MMMM yyyy") : undefined} />
            </>
          )}
        </div>
      </section>

      {/* Terms */}
      {(c.healthGuarantee || c.returnPolicy || c.specialConditions) && (
        <section className="space-y-4">
          <h2 className="font-bold text-base">TERMS & CONDITIONS</h2>
          {c.healthGuarantee && (
            <div>
              <p className="font-semibold">Health Guarantee</p>
              <p className="whitespace-pre-wrap">{c.healthGuarantee}</p>
            </div>
          )}
          {c.returnPolicy && (
            <div>
              <p className="font-semibold">Return Policy</p>
              <p className="whitespace-pre-wrap">{c.returnPolicy}</p>
            </div>
          )}
          {c.specialConditions && (
            <div>
              <p className="font-semibold">Special Conditions</p>
              <p className="whitespace-pre-wrap">{c.specialConditions}</p>
            </div>
          )}
        </section>
      )}

      {/* Signatures */}
      <section className="pt-4 border-t">
        <h2 className="font-bold text-base mb-6">SIGNATURES</h2>
        <div className="grid grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="border-b border-black pb-1 h-12" />
            <p>Breeder / Seller</p>
            <p>Date: __________________</p>
          </div>
          <div className="space-y-6">
            <div className="border-b border-black pb-1 h-12" />
            <p>{isStud ? "Bitch Owner" : "Buyer"}</p>
            <p>Date: __________________</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function TimelineStep({
  icon, label, date, done, active,
}: {
  icon: React.ReactNode; label: string; date?: string | null; done: boolean; active: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
        done    ? "border-green-500 bg-green-50 text-green-600 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400"
        : active ? "border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:border-amber-500 dark:text-amber-400"
        :          "border-border bg-muted text-muted-foreground"
      }`}>
        {icon}
      </div>
      <div>
        <p className={`text-sm font-medium leading-tight ${done ? "text-foreground" : active ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
          {label}
        </p>
        {date && <p className="text-xs text-muted-foreground mt-0.5">{date}</p>}
        {!date && active && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Awaiting…</p>}
      </div>
    </div>
  );
}

function SigningStatusPanel({ c, contractId }: { c: any; contractId: number }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const isSent     = ["sent", "viewed", "signed", "completed"].includes(c.status);
  const isViewed   = ["viewed", "signed", "completed"].includes(c.status);
  const isSigned   = ["signed", "completed"].includes(c.status);
  const hasWorkflow = c.buyerAccessToken || isSent;

  const resend = useMutation({
    mutationFn: () =>
      fetch(`/api/contracts/${contractId}/send`, { method: "POST" }).then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
      }),
    onSuccess: () => toast({ title: "Signing link resent" }),
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  function copyLink() {
    if (!c.buyerAccessToken) return;
    const url = `${window.location.origin}/sign/${c.buyerAccessToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!hasWorkflow) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Signing Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline */}
        <div className="space-y-3 pl-1">
          <TimelineStep
            icon={<Send className="h-3.5 w-3.5" />}
            label="Link sent"
            date={c.sentAt ? format(new Date(c.sentAt), "d MMM yyyy, HH:mm") : undefined}
            done={isSent}
            active={isSent && !isViewed}
          />
          <TimelineStep
            icon={<Eye className="h-3.5 w-3.5" />}
            label="Document viewed"
            date={c.viewedAt ? format(new Date(c.viewedAt), "d MMM yyyy, HH:mm") : undefined}
            done={isViewed}
            active={isSent && !isViewed}
          />
          <TimelineStep
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Signed"
            date={c.signedAt ? format(new Date(c.signedAt), "d MMM yyyy, HH:mm") : undefined}
            done={isSigned}
            active={isViewed && !isSigned}
          />
        </div>

        {/* Audit trail (signed only) */}
        {isSigned && (c.signerIp || c.signerUserAgent) && (
          <div className="border rounded-lg p-3 space-y-1.5 text-xs text-muted-foreground bg-muted/30">
            {c.signerIp && (
              <div className="flex gap-2">
                <span className="font-medium w-20 flex-shrink-0">IP address</span>
                <span className="font-mono">{c.signerIp}</span>
              </div>
            )}
            {c.signerUserAgent && (
              <div className="flex gap-2">
                <span className="font-medium w-20 flex-shrink-0">User agent</span>
                <span className="truncate max-w-xs" title={c.signerUserAgent}>{c.signerUserAgent}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {c.buyerAccessToken && !isSigned && (
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
              {copied ? "Copied!" : "Copy link"}
            </Button>
          )}
          {isSent && !isSigned && (
            <Button
              variant="outline" size="sm"
              onClick={() => resend.mutate()}
              disabled={resend.isPending}
            >
              {resend.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Resend
            </Button>
          )}
          {isSigned && c.signedContractUrl && (
            <Button variant="default" size="sm" asChild>
              <a href={c.signedContractUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-3.5 w-3.5 mr-1.5" />Download signed PDF
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const contractId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data, isLoading } = useGetContract(contractId);
  const del = useDeleteContract();

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (!data) return <div className="p-8 text-muted-foreground">Contract not found.</div>;
  const c = data as any;
  const isStud = c.type === "stud";

  async function handleDelete() {
    try {
      await del.mutateAsync({ contractId });
      toast({ title: "Contract deleted" });
      navigate("/contracts");
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <style>{`@media print { body * { visibility: hidden; } #print-area, #print-area * { visibility: visible; } #print-area { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>

      <Button variant="ghost" size="sm" asChild>
        <Link href="/contracts"><ArrowLeft className="h-4 w-4 mr-1" />Contracts</Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[c.type] ?? "bg-muted text-muted-foreground"}`}>
              {TYPE_LABELS[c.type] ?? c.type}
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[c.status] ?? "bg-muted text-muted-foreground"}`}>
              {c.status ?? "draft"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif">
            {isStud ? (c.bitchOwnerName ?? "Stud Agreement") : (c.buyerName ?? "Sale Contract")}
          </h1>
          {c.contractDate && (
            <p className="text-sm text-muted-foreground">{format(new Date(c.contractDate), "d MMMM yyyy")}</p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />Print
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/contracts/${contractId}/edit`}><Edit className="h-4 w-4 mr-1" />Edit</Link>
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="print">Print Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          {/* Party */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isStud ? "Bitch Owner" : "Buyer"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isStud ? (
                <>
                  <Row label="Name" value={c.bitchOwnerName} />
                  <Row label="Email" value={c.bitchOwnerEmail} />
                  <Row label="Phone" value={c.bitchOwnerPhone} />
                  <Row label="Address" value={c.bitchOwnerAddress} />
                </>
              ) : (
                <>
                  <Row label="Name" value={c.buyerName} />
                  <Row label="Email" value={c.buyerEmail} />
                  <Row label="Phone" value={c.buyerPhone} />
                  <Row label="Address" value={c.buyerAddress} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Subject */}
          {isStud && (c.bitchName || c.bitchBreed || c.bitchRegNumber) && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Bitch Details</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Row label="Name" value={c.bitchName} />
                <Row label="Breed" value={c.bitchBreed} />
                <Row label="Reg. Number" value={c.bitchRegNumber} />
              </CardContent>
            </Card>
          )}

          {/* Linked */}
          {(c.puppyId || c.puppyName || c.studListingId || c.waitingListId) && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Linked Records</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {c.puppyId && (
                  <div className="flex flex-col sm:flex-row sm:gap-4">
                    <span className="text-xs text-muted-foreground w-36">Puppy</span>
                    <Link href={`/puppies/${c.puppyId}`} className="text-sm text-primary hover:underline">
                      {c.puppyName ?? `Puppy #${c.puppyId}`}
                    </Link>
                  </div>
                )}
                {c.studListingId && <Row label="Stud Listing" value={`#${c.studListingId}`} />}
                {c.waitingListId && (
                  <div className="flex flex-col sm:flex-row sm:gap-4">
                    <span className="text-xs text-muted-foreground w-36">Waiting List</span>
                    <Link href={`/waiting-list/${c.waitingListId}`} className="text-sm text-primary hover:underline">
                      Entry #{c.waitingListId}
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Financial */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Financial Terms</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {isStud ? (
                <>
                  <Row label="Stud Fee" value={c.studFee ? `£${c.studFee}` : undefined} />
                  <Row label="Payment Terms" value={c.studFeePaymentTerms} />
                </>
              ) : (
                <>
                  <Row label="Sale Price" value={c.salePrice ? `£${c.salePrice}` : undefined} />
                  <Row label="Deposit" value={c.depositAmount ? `£${c.depositAmount}` : undefined} />
                  <Row label="Balance Due" value={c.balanceDue ? `£${c.balanceDue}` : undefined} />
                  <Row label="Balance Due Date" value={c.balanceDueDate ? format(new Date(c.balanceDueDate), "d MMMM yyyy") : undefined} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Terms */}
          {(c.healthGuarantee || c.returnPolicy || c.specialConditions) && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Terms & Conditions</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {c.healthGuarantee && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Health Guarantee</p>
                    <p className="text-sm whitespace-pre-wrap">{c.healthGuarantee}</p>
                  </div>
                )}
                {c.returnPolicy && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Return Policy</p>
                    <p className="text-sm whitespace-pre-wrap">{c.returnPolicy}</p>
                  </div>
                )}
                {c.specialConditions && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Special Conditions</p>
                    <p className="text-sm whitespace-pre-wrap">{c.specialConditions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {(c.templateUrl || c.signedContractUrl) && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Documents</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {c.templateUrl && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Contract Template</span>
                    <Button variant="outline" size="sm" asChild>
                      <a href={c.templateUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3.5 w-3.5 mr-1" />Download
                      </a>
                    </Button>
                  </div>
                )}
                {c.signedContractUrl && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Signed Contract</span>
                    <Button variant="outline" size="sm" asChild>
                      <a href={c.signedContractUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3.5 w-3.5 mr-1" />Download
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <SigningStatusPanel c={c} contractId={contractId} />

          {c.notes && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap text-muted-foreground">{c.notes}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="print" className="mt-4">
          <div className="mb-3 flex justify-end">
            <Button onClick={() => window.print()} variant="outline">
              <Printer className="h-4 w-4 mr-2" />Print Contract
            </Button>
          </div>
          <PrintView c={c} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contract?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this contract. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
