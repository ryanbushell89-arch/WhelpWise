import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  useGetLitter, useListPuppies, useGetWhelpingRecord, useCreateWhelpingRecord,
  useListWhelpingDocuments, useCreateWhelpingDocument, useDeleteWhelpingDocument,
  useUpdatePuppy, useCreatePuppy, useDeleteLitter, useDeletePuppy, useUpdateLitter,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Baby, Plus, Heart, HeartOff, FileDown, FileText, PiggyBank,
  Upload, Trash2, ExternalLink, CheckCircle2, ClipboardList, Pencil, Check, X, AlertTriangle, Camera,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type Tab = "overview" | "puppies" | "whelping";

const COLLAR_OPTIONS = ["Red", "Blue", "Green", "Orange", "Pink", "Purple", "Yellow", "White", "Black"];

const collarColors: Record<string, string> = {
  Red: "bg-red-500", Blue: "bg-blue-500", Green: "bg-green-500",
  Orange: "bg-orange-500", Pink: "bg-pink-400", Purple: "bg-purple-500",
  Yellow: "bg-yellow-400", White: "bg-white border border-gray-300", Black: "bg-gray-900",
};

function DocUploadButton({ onUrl }: { onUrl: (url: string) => void }) {
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (r) => onUrl(`/api/storage${r.objectPath}`),
  });
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm border rounded-md px-3 py-1.5 hover:bg-muted transition-colors">
      <Upload className="h-3.5 w-3.5" />
      {isUploading ? `${progress}%…` : "Choose file"}
      <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])}
        disabled={isUploading} />
    </label>
  );
}

// Inline editable field — click text to edit, Enter/✓ to save, Escape/✕ to cancel
function InlineEdit({
  value, placeholder, onSave, className = "", small = false,
}: {
  value: string | null | undefined;
  placeholder: string;
  onSave: (v: string) => Promise<void>;
  className?: string;
  small?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit() { setDraft(value ?? ""); setEditing(true); }
  async function save() {
    setSaving(true);
    try { await onSave(draft.trim()); setEditing(false); }
    finally { setSaving(false); }
  }
  function cancel() { setEditing(false); }

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-0">
        <Input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          className={`h-7 ${small ? "text-xs" : "text-sm"} ${className}`}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0 text-green-600" onClick={save} disabled={saving}>
          <Check className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={cancel}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <button onClick={startEdit}
      className={`group flex items-center gap-1 text-left min-w-0 hover:text-foreground transition-colors ${className}`}>
      <span className={`truncate ${value ? "" : "italic text-muted-foreground/60"} ${small ? "text-xs" : "text-sm"}`}>
        {value || placeholder}
      </span>
      <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  );
}

function DobEditRow({ dob, onSave }: { dob: string | null | undefined; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit() { setDraft(dob ?? ""); setEditing(true); }
  async function save() {
    setSaving(true);
    try { await onSave(draft); setEditing(false); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex justify-between gap-4 items-center">
      <span className="text-muted-foreground">Date of Birth</span>
      {editing ? (
        <div className="flex items-center gap-1">
          <Input type="date" autoFocus value={draft} onChange={e => setDraft(e.target.value)} className="h-7 text-sm" />
          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={save} disabled={saving}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button onClick={startEdit} className="group flex items-center gap-1 font-medium hover:text-foreground transition-colors">
          <span className={dob ? "" : "italic text-muted-foreground/60"}>
            {dob ? format(new Date(dob), "d MMM yyyy") : "Click to set…"}
          </span>
          <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
}

export default function LitterDetail() {
  const [, params] = useRoute("/litters/:id");
  const litterId = parseInt(params?.id ?? "0", 10);
  const [tab, setTab] = useState<Tab>("overview");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: litter, isLoading, refetch: refetchLitter } = useGetLitter(litterId);
  const { data: puppies, refetch: refetchPuppies } = useListPuppies(litterId, { query: { enabled: tab === "puppies" || tab === "overview", queryKey: ["puppies", litterId] } });
  const { data: whelpingRecord, refetch: refetchWhelping } = useGetWhelpingRecord(litterId, {
    query: { enabled: tab === "whelping", queryKey: ["whelping-record", litterId] },
  });
  const { data: docs, refetch: refetchDocs } = useListWhelpingDocuments(litterId, {
    query: { enabled: tab === "whelping", queryKey: ["whelping-docs", litterId] },
  });

  const createWhelping = useCreateWhelpingRecord();
  const createDoc = useCreateWhelpingDocument();
  const deleteDoc = useDeleteWhelpingDocument();
  const updatePuppy = useUpdatePuppy();
  const createPuppy = useCreatePuppy();
  const deleteLitter = useDeleteLitter();
  const deletePuppy = useDeletePuppy();
  const updateLitter = useUpdateLitter();

  async function handleLitterPhotoUpload(url: string) {
    try {
      await updateLitter.mutateAsync({ litterId, data: { photoUrl: url } as any });
      await refetchLitter();
      toast({ title: "Photo updated" });
    } catch { toast({ title: "Error updating photo", variant: "destructive" }); }
  }

  async function handleDobSave(dob: string) {
    try {
      await updateLitter.mutateAsync({ litterId, data: { dob: dob || null } as any });
      await refetchLitter();
      toast({ title: "Date of birth updated" });
    } catch { toast({ title: "Error updating date of birth", variant: "destructive" }); }
  }

  // Delete confirm state
  const [confirmDeleteLitter, setConfirmDeleteLitter] = useState(false);
  const [confirmDeletePuppy, setConfirmDeletePuppy] = useState<number | null>(null);

  async function handleDeleteLitter() {
    try {
      await deleteLitter.mutateAsync({ litterId });
      navigate("/litters");
      toast({ title: "Litter deleted" });
    } catch {
      toast({ title: "Error deleting litter", variant: "destructive" });
    }
  }

  async function handleDeletePuppy(puppyId: number) {
    try {
      await deletePuppy.mutateAsync({ puppyId });
      await refetchPuppies();
      setConfirmDeletePuppy(null);
      toast({ title: "Puppy deleted" });
    } catch {
      toast({ title: "Error deleting puppy", variant: "destructive" });
    }
  }

  // Add puppy form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    sex: "male" as "male" | "female",
    collarColour: "",
    birthWeight: "",
    birthTime: "",
    callName: "",
    registeredName: "",
  });

  // Whelping form state
  const [whelpForm, setWhelpForm] = useState({ date: "", startTime: "", endTime: "", complications: "", notes: "" });
  const [showWhelpForm, setShowWhelpForm] = useState(false);

  // Document form state
  const [docForm, setDocForm] = useState({ name: "", fileUrl: "" });
  const [showDocForm, setShowDocForm] = useState(false);

  function openWhelpForm() {
    setWhelpForm(f => ({ ...f, date: litter?.dob ?? "" }));
    setShowWhelpForm(true);
  }

  if (isLoading) return <div className="p-8"><Skeleton className="h-48 w-full rounded-xl" /></div>;
  if (!litter) return <div className="p-8 text-muted-foreground">Litter not found.</div>;

  async function addPuppy() {
    try {
      await createPuppy.mutateAsync({
        litterId,
        data: {
          sex: addForm.sex,
          alive: true,
          collarColour: addForm.collarColour || null,
          birthWeight: addForm.birthWeight ? parseFloat(addForm.birthWeight) : null,
          birthTime: addForm.birthTime || null,
          callName: addForm.callName || null,
          registeredName: addForm.registeredName || null,
        } as any,
      });
      await refetchPuppies();
      setAddForm({ sex: "male", collarColour: "", birthWeight: "", birthTime: "", callName: "", registeredName: "" });
      setShowAddForm(false);
      toast({ title: "Puppy added" });
    } catch {
      toast({ title: "Error adding puppy", variant: "destructive" });
    }
  }

  async function saveWhelping() {
    if (!whelpForm.date) {
      toast({ title: "Date of birth is required", variant: "destructive" });
      return;
    }
    try {
      await createWhelping.mutateAsync({
        litterId,
        data: {
          startTime: whelpForm.startTime || null,
          endTime: whelpForm.endTime || null,
          complications: whelpForm.complications || null,
          notes: whelpForm.notes || null,
        } as any,
      });
      await updateLitter.mutateAsync({ litterId, data: { dob: whelpForm.date } as any });
      await refetchWhelping();
      await refetchLitter();
      setShowWhelpForm(false);
      toast({ title: "Whelping record saved — litter marked as Whelped" });
    } catch {
      toast({ title: "Error saving whelping record", variant: "destructive" });
    }
  }

  async function saveDoc() {
    if (!docForm.name || !docForm.fileUrl) {
      toast({ title: "Name and file are required", variant: "destructive" });
      return;
    }
    await createDoc.mutateAsync({ litterId, data: docForm as any });
    await refetchDocs();
    setDocForm({ name: "", fileUrl: "" });
    setShowDocForm(false);
    toast({ title: "Document saved" });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "puppies", label: `Puppies${puppies ? ` (${puppies.length})` : ""}` },
    { key: "whelping", label: "Whelping Record" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/litters"><ArrowLeft className="h-4 w-4 mr-1" /> Litters</Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start gap-5">
        {/* Litter photo */}
        <LitterPhotoUpload photoUrl={(litter as any).photoUrl} onUrl={handleLitterPhotoUpload} />
        <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold font-serif">
            {litter.damName ?? "Unknown Dam"} × {litter.sireName ?? "Unknown Sire"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {litter.dob ? format(new Date(litter.dob), "d MMMM yyyy") : "Expected date TBD"}
          </p>
          <Badge className="mt-2 capitalize">{litter.status}</Badge>
        </div>
        <div className="flex gap-2 flex-wrap items-start">
          <Button variant="outline" size="sm"
            onClick={() => window.open(`/api/litters/${litterId}/report`, "_blank")}>
            <FileDown className="h-4 w-4 mr-1" /> PDF Report
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => window.open(`/api/litters/${litterId}/financial-report`, "_blank")}>
            <PiggyBank className="h-4 w-4 mr-1" /> Financial Report
          </Button>
          <Button size="sm" onClick={() => { setTab("whelping"); openWhelpForm(); }}>
            <ClipboardList className="h-4 w-4 mr-1" /> Log Whelping
          </Button>
          {confirmDeleteLitter ? (
            <div className="flex items-center gap-1.5 border border-destructive/40 rounded-md px-2 py-1 bg-destructive/5">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
              <span className="text-xs text-destructive font-medium">Delete litter + all puppies?</span>
              <Button size="sm" variant="destructive" className="h-7 text-xs px-2 ml-1"
                disabled={deleteLitter.isPending} onClick={handleDeleteLitter}>
                Yes, delete
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2"
                onClick={() => setConfirmDeleteLitter(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDeleteLitter(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete Litter
            </Button>
          )}
        </div>
      </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Litter Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Dam" value={litter.damName} />
              <Row label="Sire" value={litter.sireName} />
              <DobEditRow dob={litter.dob} onSave={handleDobSave} />
              <Row label="Total Born" value={litter.totalBorn} />
              <Row label="Live Males" value={litter.liveMales} />
              <Row label="Live Females" value={litter.liveFemales} />
              <Row label="Stillborn" value={litter.stillborn} />
              <Row label="Status" value={<span className="capitalize">{litter.status}</span>} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Puppy Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {puppies ? (
                <>
                  <Row label="Total Puppies" value={puppies.length} />
                  <Row label="Alive" value={(puppies as any[]).filter(p => p.alive).length} />
                  <Row label="Males" value={(puppies as any[]).filter(p => p.sex === "male").length} />
                  <Row label="Females" value={(puppies as any[]).filter(p => p.sex === "female").length} />
                  <Row label="Buyers Assigned" value={(puppies as any[]).filter(p => p.buyerId).length} />
                  <Row label="Available" value={(puppies as any[]).filter(p => !p.buyerId && p.alive).length} />
                </>
              ) : <p className="text-muted-foreground">Loading...</p>}
            </CardContent>
          </Card>
          {litter.notes && (
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{litter.notes}</p></CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Puppies ── */}
      {tab === "puppies" && (
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">Puppies</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click any name to edit it — call name and registered name can be set at any time.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowAddForm(f => !f)}>
              <Plus className="h-4 w-4 mr-1" /> Add Puppy
            </Button>
          </div>

          {/* Add Puppy Form */}
          {showAddForm && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">New Puppy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Sex */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sex *</Label>
                    <div className="flex gap-2">
                      {(["male", "female"] as const).map(s => (
                        <button key={s} onClick={() => setAddForm(f => ({ ...f, sex: s }))}
                          className={`flex-1 py-1.5 rounded-md border text-sm capitalize transition-colors ${addForm.sex === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Collar colour */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Collar Colour</Label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setAddForm(f => ({ ...f, collarColour: "" }))}
                        className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${addForm.collarColour === "" ? "border-primary scale-125" : "border-transparent opacity-60 hover:opacity-100"} bg-muted`}
                        title="No collar"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                      {COLLAR_OPTIONS.map(c => (
                        <button key={c}
                          onClick={() => setAddForm(f => ({ ...f, collarColour: c }))}
                          title={c}
                          className={`h-6 w-6 rounded-full border-2 transition-all ${addForm.collarColour === c ? "border-primary scale-125" : "border-transparent hover:border-muted-foreground/40"} ${collarColors[c]}`}
                        />
                      ))}
                    </div>
                    {addForm.collarColour && (
                      <p className="text-xs text-muted-foreground">{addForm.collarColour}</p>
                    )}
                  </div>

                  {/* Birth weight */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Birth Weight (g)</Label>
                    <Input className="h-8 text-sm" type="number" placeholder="e.g. 450"
                      value={addForm.birthWeight}
                      onChange={e => setAddForm(f => ({ ...f, birthWeight: e.target.value }))} />
                  </div>

                  {/* Birth time */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Birth Time</Label>
                    <Input className="h-8 text-sm" type="time"
                      value={addForm.birthTime}
                      onChange={e => setAddForm(f => ({ ...f, birthTime: e.target.value }))} />
                  </div>

                  {/* Call name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Call Name <span className="text-muted-foreground">(optional)</span></Label>
                    <Input className="h-8 text-sm" placeholder="e.g. Bella"
                      value={addForm.callName}
                      onChange={e => setAddForm(f => ({ ...f, callName: e.target.value }))} />
                  </div>

                  {/* Registered name */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Registered Name <span className="text-muted-foreground">(optional)</span></Label>
                    <Input className="h-8 text-sm" placeholder="e.g. Riverfield's Golden Bella"
                      value={addForm.registeredName}
                      onChange={e => setAddForm(f => ({ ...f, registeredName: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={addPuppy} disabled={createPuppy.isPending}>
                    {createPuppy.isPending ? "Saving…" : "Add Puppy"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Puppy grid */}
          {!puppies || puppies.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
              <Baby className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No puppies recorded yet.</p>
              <p className="text-xs mt-1">Click "Add Puppy" above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(puppies as any[]).map(pup => (
                <Card key={pup.id} className={`transition-colors ${confirmDeletePuppy === pup.id ? "border-destructive/50 bg-destructive/5" : "hover:border-primary/40"}`}>
                  <CardContent className="p-4 space-y-3">
                    {/* Header row: collar dot + number badge + alive icon + delete */}
                    <div className="flex items-center gap-2">
                      {pup.collarColour
                        ? <div className={`h-4 w-4 rounded-full flex-shrink-0 ${collarColors[pup.collarColour] ?? "bg-gray-300"}`} title={pup.collarColour} />
                        : <div className="h-4 w-4 rounded-full flex-shrink-0 bg-muted border border-dashed border-muted-foreground/30" title="No collar" />
                      }
                      <Badge variant="secondary" className="text-xs font-mono px-1.5 py-0">{pup.name ?? `#?`}</Badge>
                      <div className="ml-auto flex-shrink-0 flex items-center gap-1">
                        {pup.alive ? <Heart className="h-4 w-4 text-green-500" /> : <HeartOff className="h-4 w-4 text-red-400" />}
                        {confirmDeletePuppy === pup.id ? (
                          <>
                            <Button size="sm" variant="destructive" className="h-6 text-[10px] px-1.5"
                              disabled={deletePuppy.isPending} onClick={() => handleDeletePuppy(pup.id)}>
                              Delete
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6"
                              onClick={() => setConfirmDeletePuppy(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <Button size="icon" variant="ghost"
                            className="h-6 w-6 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDeletePuppy(pup.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Call Name — inline edit */}
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Call Name</p>
                      <InlineEdit
                        value={pup.callName}
                        placeholder="Click to set call name…"
                        className="font-semibold text-foreground"
                        onSave={async (v) => {
                          await updatePuppy.mutateAsync({ puppyId: pup.id, data: { callName: v || null } as any });
                          await refetchPuppies();
                          toast({ title: "Call name updated" });
                        }}
                      />
                    </div>

                    {/* Registered Name — inline edit */}
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Registered Name</p>
                      <InlineEdit
                        value={pup.registeredName}
                        placeholder="Click to set registered name…"
                        small
                        className="text-muted-foreground"
                        onSave={async (v) => {
                          await updatePuppy.mutateAsync({ puppyId: pup.id, data: { registeredName: v || null } as any });
                          await refetchPuppies();
                          toast({ title: "Registered name updated" });
                        }}
                      />
                    </div>

                    {/* Details */}
                    <div className="text-xs text-muted-foreground space-y-0.5 border-t pt-2">
                      <div className="capitalize">
                        {pup.sex}
                        {pup.colour ? ` · ${pup.colour}` : ""}
                        {pup.collarColour ? ` · ${pup.collarColour} collar` : ""}
                      </div>
                      {pup.birthWeight && <div>Birth weight: {pup.birthWeight}g</div>}
                      {pup.buyerName && <div className="text-primary font-medium">→ {pup.buyerName}</div>}
                      {!pup.buyerId && pup.alive && <div className="text-green-600 dark:text-green-400">Available</div>}
                    </div>

                    <Link href={`/puppies/${pup.id}`}
                      className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors block">
                      View full profile →
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Whelping Record ── */}
      {tab === "whelping" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-primary" /> Whelping Details
              </CardTitle>
              {!whelpingRecord && !showWhelpForm && (
                <Button size="sm" onClick={openWhelpForm}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Log Whelping
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {showWhelpForm && !whelpingRecord && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Fill in the whelping details. Saving will automatically mark this litter as <strong>Whelped</strong>.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Date of Birth *</Label>
                      <Input type="date" value={whelpForm.date}
                        onChange={e => setWhelpForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Whelping Start Time</Label>
                      <Input type="time" value={whelpForm.startTime}
                        onChange={e => setWhelpForm(f => ({ ...f, startTime: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Whelping End Time</Label>
                      <Input type="time" value={whelpForm.endTime}
                        onChange={e => setWhelpForm(f => ({ ...f, endTime: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label>Complications</Label>
                      <Input placeholder="e.g. One puppy needed assistance…"
                        value={whelpForm.complications}
                        onChange={e => setWhelpForm(f => ({ ...f, complications: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label>Notes</Label>
                      <Textarea rows={3} placeholder="General notes…"
                        value={whelpForm.notes}
                        onChange={e => setWhelpForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowWhelpForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={saveWhelping} disabled={createWhelping.isPending}>
                      {createWhelping.isPending ? "Saving…" : "Save Whelping Record"}
                    </Button>
                  </div>
                </div>
              )}
              {whelpingRecord && (
                <div className="space-y-3 text-sm">
                  <div className="inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full text-xs font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Whelping recorded
                  </div>
                  <Row label="Start Time" value={(whelpingRecord as any).startTime} />
                  <Row label="End Time" value={(whelpingRecord as any).endTime} />
                  <Row label="Complications" value={(whelpingRecord as any).complications} />
                  {(whelpingRecord as any).notes && (
                    <div className="pt-2 border-t">
                      <p className="text-muted-foreground mb-1">Notes</p>
                      <p>{(whelpingRecord as any).notes}</p>
                    </div>
                  )}
                </div>
              )}
              {!whelpingRecord && !showWhelpForm && (
                <div className="text-center py-10 text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No whelping record yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-purple-500" /> Litter Records &amp; Documents
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowDocForm(f => !f)}>
                <Upload className="h-3.5 w-3.5 mr-1" /> Upload Document
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Upload and name any document for this litter — vet certificates, registration papers, DNA results, etc.
              </p>
              {showDocForm && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="space-y-1.5">
                    <Label>Record Name *</Label>
                    <Input placeholder="e.g. Vet Health Certificate, DNA Test Results…"
                      value={docForm.name}
                      onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-3">
                    <DocUploadButton onUrl={url => setDocForm(f => ({ ...f, fileUrl: url }))} />
                    {docForm.fileUrl && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> File uploaded
                      </span>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowDocForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={saveDoc} disabled={createDoc.isPending || !docForm.fileUrl}>Save Record</Button>
                  </div>
                </div>
              )}
              {((docs as any[]) ?? []).length === 0 && !showDocForm && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-7 w-7 mx-auto mb-2 opacity-25" />
                  <p className="text-sm">No documents uploaded yet.</p>
                </div>
              )}
              {((docs as any[]) ?? []).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-2.5 border rounded-lg px-3">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(d.createdAt), "d MMM yyyy")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                      <a href={d.fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 w-7 p-0"
                      onClick={async () => {
                        await deleteDoc.mutateAsync({ litterId, docId: d.id });
                        refetchDocs();
                        toast({ title: "Document removed" });
                      }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function LitterPhotoUpload({ photoUrl, onUrl }: { photoUrl?: string | null; onUrl: (url: string) => void }) {
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (r) => onUrl(`/api/storage${r.objectPath}`),
  });
  return (
    <label className="relative w-32 h-32 md:w-40 md:h-40 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 border overflow-hidden cursor-pointer group">
      {photoUrl ? (
        <img src={photoUrl} alt="Litter" className="w-full h-full object-cover" />
      ) : (
        <Baby className="h-12 w-12 text-muted-foreground/20" />
      )}
      <input type="file" className="sr-only" accept="image/*"
        onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])}
        disabled={isUploading} />
      <span className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 bg-black/60 text-white text-xs py-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isUploading ? `${progress}%…` : <><Camera className="h-3 w-3" /> Photo</>}
      </span>
    </label>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
