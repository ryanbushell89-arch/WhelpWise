import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetBuyer } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, XCircle, Mail, Phone, MapPin, FileText, Send, Clock, Eye, Pen, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractTemplate {
  id: number;
  name: string;
  category: string;
  isActive: boolean;
}

interface BuyerContract {
  id: number;
  type: string;
  status: string;
  buyerName: string | null;
  contractDate: string | null;
  sentAt: string | null;
  signedAt: string | null;
  viewedAt: string | null;
  templateId: number | null;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: "Draft",     color: "bg-muted text-muted-foreground",                                              icon: FileText   },
  sent:      { label: "Sent",      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",           icon: Send       },
  viewed:    { label: "Viewed",    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",       icon: Eye        },
  signed:    { label: "Signed",    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",       icon: CheckCircle2 },
  rejected:  { label: "Rejected",  color: "bg-destructive/20 text-destructive",                                          icon: XCircle    },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",       icon: CheckCircle2 },
};

const TYPE_LABELS: Record<string, string> = {
  puppy_sale_limited: "Limited / Pet AKC",
  puppy_sale_main:    "Full Registration",
  stud:               "Stud Service",
  custom:             "Custom",
};

// ─── Send Contract Modal ───────────────────────────────────────────────────────

function SendContractModal({
  open,
  onClose,
  buyerId,
  buyerEmail,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  buyerId: number;
  buyerEmail: string | null | undefined;
  onSent: () => void;
}) {
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState<string>("");

  const { data: templates, isLoading: templatesLoading } = useQuery<ContractTemplate[]>({
    queryKey: ["contract-templates"],
    queryFn: () => apiFetch("/api/contract-templates"),
    enabled: open,
  });

  const activeTemplates = templates?.filter(t => t.isActive) ?? [];

  const send = useMutation({
    mutationFn: async () => {
      // Step 1: create contract instance from template
      const contract = await apiFetch<{ id: number }>("/api/contracts/from-template", {
        method: "POST",
        body: JSON.stringify({ templateId: parseInt(templateId), buyerId }),
      });
      // Step 2: send the signing email
      return apiFetch<{ signingUrl: string; emailSent: boolean; message: string }>(
        `/api/contracts/${contract.id}/send`,
        { method: "POST" },
      );
    },
    onSuccess: (result) => {
      if (result.emailSent) {
        toast({ title: "Contract sent", description: `Signing request emailed to ${buyerEmail}` });
      } else {
        toast({
          title: "Contract created (email not sent)",
          description: "RESEND_API_KEY not configured — copy the signing link from the contract detail page.",
        });
      }
      onSent();
      handleClose();
    },
    onError: (e: Error) => toast({ title: "Failed to send contract", description: e.message, variant: "destructive" }),
  });

  function handleClose() {
    setTemplateId("");
    onClose();
  }

  const noEmail = !buyerEmail;
  const noTemplates = !templatesLoading && activeTemplates.length === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Contract for Signing</DialogTitle>
          <DialogDescription>
            Choose a template from your library. A unique signing link will be emailed to the buyer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {noEmail && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This buyer has no email address — they won't receive a notification. Add an email to their profile first.
              </p>
            </div>
          )}

          {noTemplates ? (
            <div className="text-center py-6">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground opacity-30 mb-3" />
              <p className="text-sm text-muted-foreground">No contract templates in your library.</p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/settings/contracts">Upload a template</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Contract Template</Label>
              <Select value={templateId} onValueChange={setTemplateId} disabled={templatesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={templatesLoading ? "Loading…" : "Select a template"} />
                </SelectTrigger>
                <SelectContent>
                  {activeTemplates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            disabled={!templateId || send.isPending || noTemplates}
            onClick={() => send.mutate()}
          >
            {send.isPending ? "Sending…" : "Send for Signing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-sm">{label}</span>
      {done
        ? <Badge className="bg-green-600 text-white text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>
        : <Badge variant="outline" className="text-xs text-muted-foreground"><XCircle className="h-3 w-3 mr-1" />Pending</Badge>}
    </div>
  );
}

// ─── Contracts section ────────────────────────────────────────────────────────

function BuyerContracts({ buyerId, buyerEmail }: { buyerId: number; buyerEmail: string | null | undefined }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sendOpen, setSendOpen] = useState(false);

  const { data: contracts, isLoading } = useQuery<BuyerContract[]>({
    queryKey: ["buyer-contracts", buyerId],
    queryFn: () => apiFetch(`/api/buyers/${buyerId}/contracts`),
  });

  const resend = useMutation({
    mutationFn: (contractId: number) =>
      apiFetch<{ message: string; emailSent: boolean }>(`/api/contracts/${contractId}/send`, { method: "POST" }),
    onSuccess: (result, contractId) => {
      qc.invalidateQueries({ queryKey: ["buyer-contracts", buyerId] });
      toast({ title: result.emailSent ? "Signing link resent" : "Contract resent (no email)", description: result.message });
    },
    onError: (e: Error) => toast({ title: "Failed to resend", description: e.message, variant: "destructive" }),
  });

  const list = contracts ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base">Contracts</CardTitle>
          <Button size="sm" onClick={() => setSendOpen(true)}>
            <Send className="h-3.5 w-3.5 mr-1.5" />Send Contract
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-lg" />
        ) : list.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed rounded-xl">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground opacity-30 mb-2" />
            <p className="text-sm text-muted-foreground">No contracts sent yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((c) => {
              const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft;
              const Icon = cfg.icon;
              const canResend = c.status === "sent" || c.status === "viewed" || c.status === "draft";
              return (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        <Icon className="inline h-3 w-3 mr-1" />{cfg.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {TYPE_LABELS[c.type] ?? c.type}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.sentAt && `Sent ${format(new Date(c.sentAt), "d MMM yyyy")}`}
                      {c.viewedAt && ` · Viewed ${format(new Date(c.viewedAt), "d MMM yyyy")}`}
                      {c.signedAt && ` · Signed ${format(new Date(c.signedAt), "d MMM yyyy")}`}
                      {!c.sentAt && c.contractDate && `Created ${format(new Date(c.contractDate), "d MMM yyyy")}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canResend && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        disabled={resend.isPending}
                        onClick={() => resend.mutate(c.id)}
                      >
                        Resend
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                      <Link href={`/contracts/${c.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <SendContractModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        buyerId={buyerId}
        buyerEmail={buyerEmail}
        onSent={() => qc.invalidateQueries({ queryKey: ["buyer-contracts", buyerId] })}
      />
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BuyerDetail() {
  const [, params] = useRoute("/buyers/:id");
  const buyerId = parseInt(params?.id ?? "0", 10);
  const { data: buyer, isLoading } = useGetBuyer(buyerId);

  if (isLoading) return <div className="p-8"><Skeleton className="h-48 w-full rounded-xl" /></div>;
  if (!buyer) return <div className="p-8 text-muted-foreground">Buyer not found.</div>;

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
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Payment Status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
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
            {!buyer.email && !buyer.phone && !buyer.address && (
              <p className="text-muted-foreground text-xs">No contact details recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <BuyerContracts buyerId={buyerId} buyerEmail={buyer.email} />

      {buyer.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{buyer.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
