import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetWaitingListEntry, useDeleteWaitingListEntry,
  useAssignWaitingListEntry, useUnassignWaitingListEntry,
  useListLitters, useListPuppies,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Trash2, User, Phone, Mail, MapPin, Loader2, PawPrint, FileText, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  waiting: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  assigned: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-muted text-muted-foreground",
};

function AssignDialog({ entry, open, onClose }: { entry: any; open: boolean; onClose: () => void }) {
  const [selectedLitter, setSelectedLitter] = useState("");
  const [selectedPuppy, setSelectedPuppy] = useState("");
  const { toast } = useToast();
  const assign = useAssignWaitingListEntry();
  const { data: litters } = useListLitters();
  const { data: puppies } = useListPuppies(
    selectedLitter ? parseInt(selectedLitter) : 0,
    { query: { enabled: !!selectedLitter } } as any
  );

  const litterList = (litters as any[] | undefined) ?? [];
  const puppyList = (puppies as any[] | undefined) ?? [];

  async function handleAssign() {
    if (!selectedPuppy) { toast({ title: "Select a puppy first", variant: "destructive" }); return; }
    try {
      await assign.mutateAsync({ entryId: entry.id, data: { puppyId: parseInt(selectedPuppy) } });
      toast({ title: "Puppy assigned!" });
      onClose();
    } catch { toast({ title: "Failed to assign", variant: "destructive" }); }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign a Puppy</DialogTitle>
          <DialogDescription>Select the puppy to assign to {entry.name}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Select Litter</Label>
            <Select value={selectedLitter} onValueChange={v => { setSelectedLitter(v); setSelectedPuppy(""); }}>
              <SelectTrigger><SelectValue placeholder="Choose a litter…" /></SelectTrigger>
              <SelectContent>
                {litterList.map((l: any) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.damName ?? "Dam"} × {l.sireName ?? "Sire"}{l.expectedDate ? ` (${l.expectedDate})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedLitter && (
            <div className="space-y-1.5">
              <Label>Select Puppy</Label>
              <Select value={selectedPuppy} onValueChange={setSelectedPuppy}>
                <SelectTrigger><SelectValue placeholder="Choose a puppy…" /></SelectTrigger>
                <SelectContent>
                  {puppyList.length === 0
                    ? <SelectItem value="none" disabled>No puppies in this litter</SelectItem>
                    : puppyList.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name ?? `Puppy #${p.id}`}{p.sex ? ` (${p.sex})` : ""}{p.colour ? ` · ${p.colour}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedPuppy || assign.isPending}>
            {assign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign Puppy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WaitingListDetail() {
  const { id } = useParams<{ id: string }>();
  const entryId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data: entry, isLoading } = useGetWaitingListEntry(entryId);
  const del = useDeleteWaitingListEntry();
  const unassign = useUnassignWaitingListEntry();

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (!entry) return <div className="p-8 text-muted-foreground">Entry not found.</div>;

  const e = entry as any;

  async function handleDelete() {
    try {
      await del.mutateAsync({ entryId });
      toast({ title: "Entry removed from waiting list" });
      navigate("/waiting-list");
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  }

  async function handleUnassign() {
    try {
      await unassign.mutateAsync({ entryId });
      toast({ title: "Puppy unassigned" });
    } catch { toast({ title: "Failed to unassign", variant: "destructive" }); }
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/waiting-list"><ArrowLeft className="h-4 w-4 mr-1" />Waiting List</Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold font-serif">{e.name}</h1>
            <span className={`text-sm px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[e.status] ?? ""}`}>{e.status}</span>
            {e.priority && (
              <span className="text-sm bg-muted rounded-full px-2.5 py-0.5 text-muted-foreground">#{e.priority}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Added {e.createdAt ? format(new Date(e.createdAt), "d MMM yyyy") : "unknown"}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/waiting-list/${entryId}/edit`}><Edit className="h-4 w-4 mr-1" />Edit</Link>
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Contact */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Contact Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {e.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4 flex-shrink-0" /><a href={`mailto:${e.email}`} className="text-primary hover:underline">{e.email}</a></div>}
          {e.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4 flex-shrink-0" /><a href={`tel:${e.phone}`} className="hover:underline">{e.phone}</a></div>}
          {e.address && <div className="flex items-start gap-2 text-muted-foreground sm:col-span-2"><MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" /><span className="whitespace-pre-wrap">{e.address}</span></div>}
          {!e.email && !e.phone && !e.address && <p className="text-muted-foreground sm:col-span-2 italic">No contact details recorded.</p>}
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><PawPrint className="h-4 w-4" />Puppy Preferences</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {[
            { label: "Breed", value: e.breedPreference },
            { label: "Sex", value: e.sexPreference && e.sexPreference !== "either" ? e.sexPreference : "Either" },
            { label: "Colour", value: e.colourPreference },
            { label: "Timeframe", value: e.timeframe },
            { label: "Programme", value: e.litterPreference },
          ].map(({ label, value }) => value ? (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-medium capitalize">{value}</p>
            </div>
          ) : null)}
          {!e.breedPreference && !e.colourPreference && !e.timeframe && !e.litterPreference && (
            <p className="text-muted-foreground col-span-3 italic text-sm">No preferences recorded.</p>
          )}
        </CardContent>
      </Card>

      {/* Deposit */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Deposit</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-4">
          {e.depositPaid ? (
            <span className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
              <CheckCircle2 className="h-5 w-5" /> Deposit paid{e.depositAmount ? ` — £${e.depositAmount}` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">No deposit received{e.depositAmount ? ` (requested: £${e.depositAmount})` : ""}</span>
          )}
        </CardContent>
      </Card>

      {/* Puppy Assignment */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Assigned Puppy</CardTitle>
            {!e.puppyId && <Button size="sm" onClick={() => setAssignOpen(true)}>Assign Puppy</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {e.puppyId ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <PawPrint className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold">{e.puppyName ?? `Puppy #${e.puppyId}`}</p>
                  <Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild>
                    <Link href={`/puppies/${e.puppyId}`}>View puppy profile →</Link>
                  </Button>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleUnassign} disabled={unassign.isPending}>
                {unassign.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Unassign"}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">No puppy assigned yet. Click "Assign Puppy" to match this person to a litter puppy.</p>
          )}
        </CardContent>
      </Card>

      {/* Create Contract */}
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Create a Contract</p>
              <p className="text-xs text-muted-foreground">Auto-fill buyer details from this waiting list entry.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/contracts/new?waitingListId=${entryId}`}>New Contract</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Notes */}
      {e.notes && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap text-muted-foreground">{e.notes}</p></CardContent>
        </Card>
      )}

      <AssignDialog entry={e} open={assignOpen} onClose={() => setAssignOpen(false)} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from waiting list?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete {e.name}'s waiting list entry. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
