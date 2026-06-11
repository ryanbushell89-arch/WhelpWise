import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import {
  useGetPuppy, useListWeights, useCreateWeight,
  useListWorming, useCreateWorming, useDeleteWorming,
  useListVaccinations, useCreateVaccination, useDeleteVaccination,
  useListPuppyDocuments, useCreatePuppyDocument, useDeletePuppyDocument,
  useDeletePuppy, useUpdatePuppy,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, AlertTriangle, Plus, TrendingUp, TrendingDown, FileText,
  Syringe, Bug, Trash2, Upload, ExternalLink, Printer, CheckCircle2, Camera, Dog as DogIcon,
  UserPlus, Copy, Mail, Loader2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";

type Tab = "overview" | "weights" | "health" | "documents";

function FileUploadButton({ label, onUrl }: { label: string; onUrl: (url: string) => void }) {
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (r) => onUrl(`/api/storage${r.objectPath}`),
  });
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm border rounded-md px-3 py-1.5 hover:bg-muted transition-colors">
      <Upload className="h-3.5 w-3.5" />
      {isUploading ? `${progress}%…` : label}
      <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png"
        onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])}
        disabled={isUploading} />
    </label>
  );
}

export default function PuppyProfile() {
  const [, params] = useRoute("/puppies/:id");
  const puppyId = parseInt(params?.id ?? "0", 10);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState<{ inviteUrl: string; emailSent: boolean } | null>(null);

  const { data: puppy, isLoading } = useGetPuppy(puppyId);
  const { data: weights, refetch: refetchWeights } = useListWeights(puppyId);
  const { data: worming, refetch: refetchWorming } = useListWorming(puppyId);
  const { data: vaccinations, refetch: refetchVaccinations } = useListVaccinations(puppyId);
  const { data: documents, refetch: refetchDocs } = useListPuppyDocuments(puppyId);

  const createWeight = useCreateWeight();
  const createWorming = useCreateWorming();
  const deleteWorming = useDeleteWorming();
  const createVaccination = useCreateVaccination();
  const deleteVaccination = useDeleteVaccination();
  const createDoc = useCreatePuppyDocument();
  const deleteDoc = useDeletePuppyDocument();
  const deletePuppy = useDeletePuppy();
  const updatePuppy = useUpdatePuppy();

  const inviteMutation = useMutation({
    mutationFn: async (email?: string) => {
      const res = await fetch(`/api/puppies/${puppyId}/invite`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send invite");
      return data as { inviteUrl: string; emailSent: boolean; message: string };
    },
    onSuccess: (data) => {
      setInviteResult({ inviteUrl: data.inviteUrl, emailSent: data.emailSent });
      toast({ title: data.emailSent ? "Invitation sent!" : "Invite link generated", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create invite", description: err.message, variant: "destructive" });
    },
  });

  const { data: inviteStatus } = useQuery({
    queryKey: ["puppies", puppyId, "invite-status"],
    queryFn: async () => {
      const res = await fetch(`/api/puppies/${puppyId}/invite-status`, { credentials: "include" });
      if (!res.ok) return { invite: null };
      return res.json() as Promise<{ invite: { status: string; email: string; createdAt: string } | null }>;
    },
    enabled: !!puppyId,
  });

  async function handlePuppyPhotoUpload(url: string) {
    try {
      await updatePuppy.mutateAsync({ puppyId, data: { photoUrl: url } as any });
      toast({ title: "Photo updated" });
    } catch { toast({ title: "Error updating photo", variant: "destructive" }); }
  }

  async function handleDeletePuppy() {
    try {
      const litterId = (puppy as any).litterId;
      await deletePuppy.mutateAsync({ puppyId });
      navigate(litterId ? `/litters/${litterId}` : "/litters");
      toast({ title: "Puppy deleted" });
    } catch {
      toast({ title: "Error deleting puppy", variant: "destructive" });
    }
  }

  // Weight form
  const [weightForm, setWeightForm] = useState({ date: new Date().toISOString().slice(0, 10), weightGrams: "", notes: "" });
  const [showWeightForm, setShowWeightForm] = useState(false);

  // Worming form
  const [wormForm, setWormForm] = useState({ date: "", product: "", dose: "", notes: "" });
  const [showWormForm, setShowWormForm] = useState(false);

  // Vaccination form
  const [vaccForm, setVaccForm] = useState({ date: "", vaccineName: "", batchLot: "", vet: "", nextDueDate: "", notes: "" });
  const [showVaccForm, setShowVaccForm] = useState(false);

  // Document form
  const [docForm, setDocForm] = useState({ docType: "other", name: "", fileUrl: "" });
  const [showDocForm, setShowDocForm] = useState(false);

  if (isLoading) return <div className="p-8"><Skeleton className="h-48 w-full rounded-xl" /></div>;
  if (!puppy) return <div className="p-8 text-muted-foreground">Puppy not found.</div>;

  const ws = (weights as any[]) ?? [];
  const latestWeight = ws.length > 0 ? ws[ws.length - 1] : null;
  const prevWeight = ws.length > 1 ? ws[ws.length - 2] : null;
  const trend = latestWeight && prevWeight ? latestWeight.weightGrams - prevWeight.weightGrams : null;

  async function saveWeight() {
    if (!weightForm.weightGrams) { toast({ title: "Weight is required", variant: "destructive" }); return; }
    await createWeight.mutateAsync({ puppyId, data: { date: weightForm.date, weightGrams: parseFloat(weightForm.weightGrams), notes: weightForm.notes || null } as any });
    await refetchWeights();
    setWeightForm({ date: new Date().toISOString().slice(0, 10), weightGrams: "", notes: "" });
    setShowWeightForm(false);
    toast({ title: "Weight logged" });
  }

  async function saveWorming() {
    if (!wormForm.date || !wormForm.product) { toast({ title: "Date and product required", variant: "destructive" }); return; }
    await createWorming.mutateAsync({ puppyId, data: wormForm as any });
    await refetchWorming();
    setWormForm({ date: "", product: "", dose: "", notes: "" });
    setShowWormForm(false);
    toast({ title: "Worming record saved" });
  }

  async function saveVaccination() {
    if (!vaccForm.date || !vaccForm.vaccineName) { toast({ title: "Date and vaccine name required", variant: "destructive" }); return; }
    await createVaccination.mutateAsync({ puppyId, data: vaccForm as any });
    await refetchVaccinations();
    setVaccForm({ date: "", vaccineName: "", batchLot: "", vet: "", nextDueDate: "", notes: "" });
    setShowVaccForm(false);
    toast({ title: "Vaccination saved" });
  }

  async function saveDocument() {
    if (!docForm.name || !docForm.fileUrl) { toast({ title: "Name and file required", variant: "destructive" }); return; }
    await createDoc.mutateAsync({ puppyId, data: docForm as any });
    await refetchDocs();
    setDocForm({ docType: "other", name: "", fileUrl: "" });
    setShowDocForm(false);
    toast({ title: "Document saved" });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "weights", label: `Weights (${ws.length})` },
    { id: "health", label: "Worming & Vaccines" },
    { id: "documents", label: "Documents" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/litters/${(puppy as any).litterId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Litter</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/puppies/${puppyId}/report`}><Printer className="h-4 w-4 mr-1" /> Print Report</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setInviteResult(null); setInviteEmail(""); setShowInviteDialog(true); }}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            {inviteStatus?.invite?.status === "accepted" ? "Owner Linked" : "Invite Owner"}
          </Button>
          {confirmDelete ? (
            <div className="flex items-center gap-1.5 border border-destructive/40 rounded-md px-2 py-1 bg-destructive/5">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
              <span className="text-xs text-destructive font-medium">Delete puppy?</span>
              <Button size="sm" variant="destructive" className="h-7 text-xs px-2 ml-1"
                disabled={deletePuppy.isPending} onClick={handleDeletePuppy}>
                Yes, delete
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2"
                onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-5 flex-wrap">
        {/* Puppy photo */}
        <div className="relative w-28 h-28 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 border overflow-hidden">
          {(puppy as any).photoUrl ? (
            <img src={(puppy as any).photoUrl} alt="Puppy" className="w-full h-full object-cover" />
          ) : (
            <DogIcon className="h-10 w-10 text-muted-foreground/30" />
          )}
          <PuppyPhotoUpload onUrl={handlePuppyPhotoUpload} />
        </div>
        <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="min-w-0">
          {/* Call name as primary heading */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold font-serif">
              {(puppy as any).callName ?? (puppy as any).name ?? ((puppy as any).collarColour ? `${(puppy as any).collarColour} Collar` : `Puppy ${puppyId}`)}
            </h1>
            {(puppy as any).name && (
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{(puppy as any).name}</span>
            )}
          </div>
          {/* Registered name */}
          {(puppy as any).registeredName && (
            <p className="text-sm text-muted-foreground italic mt-0.5">{(puppy as any).registeredName}</p>
          )}
          <p className="text-muted-foreground capitalize text-sm mt-0.5">
            {(puppy as any).sex}{(puppy as any).colour ? ` · ${(puppy as any).colour}` : ""}{(puppy as any).collarColour ? ` · ${(puppy as any).collarColour} collar` : ""}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant={(puppy as any).alive ? "default" : "destructive"}>{(puppy as any).alive ? "Alive" : "Deceased"}</Badge>
          {(puppy as any).buyerName && <Badge variant="secondary">Reserved — {(puppy as any).buyerName}</Badge>}
          {!(puppy as any).buyerId && (puppy as any).alive && <Badge className="bg-green-600 text-white">Available</Badge>}
        </div>
      </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{latestWeight ? `${latestWeight.weightGrams}g` : "--"}</div>
                <div className="text-xs text-muted-foreground mt-1">Latest Weight</div>
                {trend !== null && (
                  <div className={`flex items-center justify-center gap-1 text-xs mt-1 ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {trend >= 0 ? "+" : ""}{trend}g
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{(puppy as any).birthWeight ? `${(puppy as any).birthWeight}g` : "--"}</div>
                <div className="text-xs text-muted-foreground mt-1">Birth Weight</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{ws.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Weight Entries</div>
              </CardContent>
            </Card>
          </div>

          {ws.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Weight Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={ws.map((w: any) => ({ date: w.date, weight: w.weightGrams }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit="g" />
                    <Tooltip formatter={(v: any) => [`${v}g`, "Weight"]} />
                    <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(puppy as any).birthTime && <Row label="Birth Time" value={(puppy as any).birthTime} />}
              {(puppy as any).markings && <Row label="Markings" value={(puppy as any).markings} />}
              {(puppy as any).buyerName && <Row label="Reserved By" value={(puppy as any).buyerName} />}
              {(puppy as any).collectionDate && <Row label="Collection Date" value={format(new Date((puppy as any).collectionDate), "d MMM yyyy")} />}
              {(puppy as any).notes && <div className="mt-2 text-muted-foreground pt-2 border-t">{(puppy as any).notes}</div>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Weights ── */}
      {activeTab === "weights" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowWeightForm(f => !f)}>
              <Plus className="h-4 w-4 mr-1" /> Log Weight
            </Button>
          </div>

          {showWeightForm && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={weightForm.date} onChange={e => setWeightForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Weight (grams) *</Label>
                    <Input type="number" min="0" placeholder="e.g. 480" value={weightForm.weightGrams} onChange={e => setWeightForm(f => ({ ...f, weightGrams: e.target.value }))} />
                  </div>
                </div>
                <Input placeholder="Notes (optional)" value={weightForm.notes} onChange={e => setWeightForm(f => ({ ...f, notes: e.target.value }))} />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setShowWeightForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={saveWeight} disabled={createWeight.isPending}>Save</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {ws.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Daily Weight Log (Day 1–14+)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left pb-2 font-medium">Day</th>
                        <th className="text-left pb-2 font-medium">Date</th>
                        <th className="text-right pb-2 font-medium">Weight</th>
                        <th className="text-right pb-2 font-medium">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ws.map((w: any, i: number) => {
                        const prev = i > 0 ? ws[i - 1] : null;
                        const change = prev ? w.weightGrams - prev.weightGrams : null;
                        return (
                          <tr key={w.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-2 font-medium">Day {i + 1}</td>
                            <td className="py-2 text-muted-foreground">{format(new Date(w.date), "d MMM")}</td>
                            <td className="py-2 text-right font-semibold">{w.weightGrams}g</td>
                            <td className="py-2 text-right">
                              {w.alertTriggered ? (
                                <span className="text-red-500 flex items-center justify-end gap-1 text-xs">
                                  <AlertTriangle className="h-3 w-3" /> {change}g
                                </span>
                              ) : change !== null ? (
                                <span className={change >= 0 ? "text-green-600 text-xs" : "text-red-500 text-xs"}>
                                  {change >= 0 ? "+" : ""}{change}g
                                </span>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {ws.length === 0 && !showWeightForm && (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No weights logged yet. Start with Day 1!</p>
            </div>
          )}
        </div>
      )}

      {/* ── Worming & Vaccinations ── */}
      {activeTab === "health" && (
        <div className="space-y-6">
          {/* Worming */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bug className="h-4 w-4 text-green-600" /> Worming Records
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowWormForm(f => !f)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {showWormForm && (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Date *</Label><Input type="date" value={wormForm.date} onChange={e => setWormForm(f => ({ ...f, date: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Product *</Label><Input placeholder="e.g. Panacur" value={wormForm.product} onChange={e => setWormForm(f => ({ ...f, product: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Dose</Label><Input placeholder="e.g. 0.5ml" value={wormForm.dose} onChange={e => setWormForm(f => ({ ...f, dose: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Notes</Label><Input placeholder="Optional" value={wormForm.notes} onChange={e => setWormForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowWormForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={saveWorming} disabled={createWorming.isPending}>Save</Button>
                  </div>
                </div>
              )}
              {((worming as any[]) ?? []).length === 0 && !showWormForm && (
                <p className="text-sm text-muted-foreground italic text-center py-4">No worming records yet.</p>
              )}
              {((worming as any[]) ?? []).map((w: any) => (
                <div key={w.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="text-sm">
                    <span className="font-medium">{w.product}</span>
                    {w.dose && <span className="text-muted-foreground ml-2">· {w.dose}</span>}
                    <div className="text-xs text-muted-foreground">{format(new Date(w.date), "d MMM yyyy")}</div>
                    {w.notes && <div className="text-xs text-muted-foreground">{w.notes}</div>}
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 w-7 p-0"
                    onClick={async () => { await deleteWorming.mutateAsync({ puppyId, wormingId: w.id }); refetchWorming(); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Vaccinations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Syringe className="h-4 w-4 text-blue-500" /> Vaccination Records
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowVaccForm(f => !f)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {showVaccForm && (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Date *</Label><Input type="date" value={vaccForm.date} onChange={e => setVaccForm(f => ({ ...f, date: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Vaccine Name *</Label><Input placeholder="e.g. C3, Parvovirus" value={vaccForm.vaccineName} onChange={e => setVaccForm(f => ({ ...f, vaccineName: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Batch / Lot #</Label><Input placeholder="e.g. 12345A" value={vaccForm.batchLot} onChange={e => setVaccForm(f => ({ ...f, batchLot: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Vet / Clinic</Label><Input placeholder="e.g. Dr Smith" value={vaccForm.vet} onChange={e => setVaccForm(f => ({ ...f, vet: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Next Due Date</Label><Input type="date" value={vaccForm.nextDueDate} onChange={e => setVaccForm(f => ({ ...f, nextDueDate: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Notes</Label><Input placeholder="Optional" value={vaccForm.notes} onChange={e => setVaccForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowVaccForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={saveVaccination} disabled={createVaccination.isPending}>Save</Button>
                  </div>
                </div>
              )}
              {((vaccinations as any[]) ?? []).length === 0 && !showVaccForm && (
                <p className="text-sm text-muted-foreground italic text-center py-4">No vaccinations recorded yet.</p>
              )}
              {((vaccinations as any[]) ?? []).map((v: any) => (
                <div key={v.id} className="flex items-start justify-between py-2 border-b last:border-0">
                  <div className="text-sm">
                    <div className="font-medium">{v.vaccineName}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(v.date), "d MMM yyyy")}
                      {v.vet && ` · ${v.vet}`}
                      {v.batchLot && ` · Lot: ${v.batchLot}`}
                    </div>
                    {v.nextDueDate && (
                      <div className="text-xs text-amber-600">Next due: {format(new Date(v.nextDueDate), "d MMM yyyy")}</div>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 w-7 p-0"
                    onClick={async () => { await deleteVaccination.mutateAsync({ puppyId, vaccinationId: v.id }); refetchVaccinations(); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Documents ── */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-purple-500" /> Certificates & Documents
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowDocForm(f => !f)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {showDocForm && (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Document Type</Label>
                      <Select value={docForm.docType} onValueChange={v => setDocForm(f => ({ ...f, docType: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eye_cert">Eye Certification</SelectItem>
                          <SelectItem value="parentage_cert">Parentage Verification</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Document Name *</Label>
                      <Input placeholder="e.g. Eye Certificate 2025" value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileUploadButton label="Upload File" onUrl={url => setDocForm(f => ({ ...f, fileUrl: url }))} />
                    {docForm.fileUrl && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Uploaded</span>}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowDocForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={saveDocument} disabled={createDoc.isPending || !docForm.fileUrl}>Save</Button>
                  </div>
                </div>
              )}

              {/* Group by type */}
              {(["eye_cert", "parentage_cert", "other"] as const).map(type => {
                const label = type === "eye_cert" ? "Eye Certification" : type === "parentage_cert" ? "Parentage Verification" : "Other Documents";
                const items = ((documents as any[]) ?? []).filter((d: any) => d.docType === type);
                if (items.length === 0) return null;
                return (
                  <div key={type} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                    {items.map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between py-2 border rounded-lg px-3">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{d.name}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(d.createdAt), "d MMM yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                            <a href={d.fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 w-7 p-0"
                            onClick={async () => { await deleteDoc.mutateAsync({ puppyId, docId: d.id }); refetchDocs(); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {((documents as any[]) ?? []).length === 0 && !showDocForm && (
                <p className="text-sm text-muted-foreground italic text-center py-6">No documents uploaded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invite Owner Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={(o) => { setShowInviteDialog(o); if (!o) setInviteResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Invite Puppy Owner
            </DialogTitle>
            <DialogDescription>
              Send {(puppy as any)?.name ?? "this puppy"}'s owner a link to view their profile, health records, and chat with you — completely free for them.
            </DialogDescription>
          </DialogHeader>

          {inviteResult ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                {inviteResult.emailSent ? (
                  <div className="flex items-center gap-2 text-green-800">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span>Invitation email sent successfully!</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-green-800">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>Invite link created. Share it manually (email not configured).</span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Invite Link</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={inviteResult.inviteUrl}
                    className="flex-1 text-xs border rounded-md px-3 py-2 bg-muted font-mono truncate"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { navigator.clipboard.writeText(inviteResult.inviteUrl); toast({ title: "Link copied!" }); }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Button className="w-full" variant="outline" onClick={() => { setInviteResult(null); setInviteEmail(""); }}>
                Send Another Invite
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {inviteStatus?.invite && (
                <div className={`text-xs rounded-lg p-2.5 border ${inviteStatus.invite.status === "accepted" ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                  {inviteStatus.invite.status === "accepted"
                    ? `Owner already linked — ${inviteStatus.invite.email}`
                    : `Pending invite sent to ${inviteStatus.invite.email}`}
                </div>
              )}
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Email address <span className="text-muted-foreground font-normal">(optional — uses buyer email if blank)</span>
                </label>
                <input
                  type="email"
                  placeholder="owner@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => inviteMutation.mutate(inviteEmail || undefined)}
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending…</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-2" />Send Invitation</>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PuppyPhotoUpload({ onUrl }: { onUrl: (url: string) => void }) {
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (r) => onUrl(`/api/storage${r.objectPath}`),
  });
  return (
    <label className="absolute inset-0 flex items-end justify-center pb-1 cursor-pointer group">
      <input type="file" className="sr-only" accept="image/*"
        onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])}
        disabled={isUploading} />
      <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {isUploading ? `${progress}%…` : <><Camera className="h-2.5 w-2.5" /> Photo</>}
      </span>
    </label>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
