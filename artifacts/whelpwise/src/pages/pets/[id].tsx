import { useState, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  useGetPet, useDeletePet,
  useListPetVaccinations, useCreatePetVaccination, useDeletePetVaccination,
  useListPetVetVisits, useCreatePetVetVisit, useDeletePetVetVisit,
  useUpdatePet,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Trash2, X, Plus, Camera, Loader2, Syringe, Stethoscope, PawPrint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { speciesEmoji, speciesLabel } from "./_form";
import { format, differenceInDays, parseISO } from "date-fns";

type Tab = "overview" | "vaccinations" | "vet-visits";

function PhotoUpload({ currentUrl, onUrl }: { currentUrl?: string | null; onUrl: (url: string) => void }) {
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

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b last:border-0 border-border/50">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium text-sm text-right">{value}</span>
    </div>
  );
}

export default function PetProfile() {
  const [, params] = useRoute("/pets/:id");
  const petId = parseInt(params?.id ?? "0");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: pet, isLoading, refetch: refetchPet } = useGetPet(petId);
  const deletePet = useDeletePet();
  const updatePet = useUpdatePet();

  // Vaccinations
  const { data: vaccinations, refetch: refetchVaccinations } = useListPetVaccinations(petId);
  const createVaccination = useCreatePetVaccination();
  const deleteVaccination = useDeletePetVaccination();
  const [showVaxForm, setShowVaxForm] = useState(false);
  const [vaxForm, setVaxForm] = useState({ vaccine: "", dateGiven: "", nextDueDate: "", vet: "", notes: "" });
  const [confirmDeleteVax, setConfirmDeleteVax] = useState<number | null>(null);

  // Vet visits
  const { data: vetVisits, refetch: refetchVisits } = useListPetVetVisits(petId);
  const createVisit = useCreatePetVetVisit();
  const deleteVisit = useDeletePetVetVisit();
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitForm, setVisitForm] = useState({ date: "", reason: "", vet: "", notes: "", cost: "" });
  const [confirmDeleteVisit, setConfirmDeleteVisit] = useState<number | null>(null);

  async function handlePhotoUpload(url: string) {
    try {
      await updatePet.mutateAsync({ petId, data: { photoUrl: url } as any });
      await refetchPet();
      toast({ title: "Photo updated" });
    } catch { toast({ title: "Error updating photo", variant: "destructive" }); }
  }

  async function handleDelete() {
    try {
      await deletePet.mutateAsync({ petId });
      toast({ title: "Pet deleted" });
      navigate("/pets");
    } catch { toast({ title: "Error deleting pet", variant: "destructive" }); }
  }

  async function handleAddVaccination() {
    if (!vaxForm.vaccine.trim()) { toast({ title: "Vaccine name is required", variant: "destructive" }); return; }
    try {
      await createVaccination.mutateAsync({ petId, data: { vaccine: vaxForm.vaccine.trim(), dateGiven: vaxForm.dateGiven || null, nextDueDate: vaxForm.nextDueDate || null, vet: vaxForm.vet.trim() || null, notes: vaxForm.notes.trim() || null } as any });
      await refetchVaccinations();
      setVaxForm({ vaccine: "", dateGiven: "", nextDueDate: "", vet: "", notes: "" });
      setShowVaxForm(false);
      toast({ title: "Vaccination recorded" });
    } catch { toast({ title: "Error saving vaccination", variant: "destructive" }); }
  }

  async function handleDeleteVax(id: number) {
    try {
      await deleteVaccination.mutateAsync({ petId, vaccinationId: id });
      await refetchVaccinations();
      setConfirmDeleteVax(null);
      toast({ title: "Vaccination removed" });
    } catch { toast({ title: "Error removing vaccination", variant: "destructive" }); }
  }

  async function handleAddVisit() {
    if (!visitForm.date || !visitForm.reason.trim()) { toast({ title: "Date and reason are required", variant: "destructive" }); return; }
    try {
      await createVisit.mutateAsync({ petId, data: { date: visitForm.date, reason: visitForm.reason.trim(), vet: visitForm.vet.trim() || null, notes: visitForm.notes.trim() || null, cost: visitForm.cost.trim() || null } as any });
      await refetchVisits();
      setVisitForm({ date: "", reason: "", vet: "", notes: "", cost: "" });
      setShowVisitForm(false);
      toast({ title: "Vet visit recorded" });
    } catch { toast({ title: "Error saving vet visit", variant: "destructive" }); }
  }

  async function handleDeleteVisit(id: number) {
    try {
      await deleteVisit.mutateAsync({ petId, visitId: id });
      await refetchVisits();
      setConfirmDeleteVisit(null);
      toast({ title: "Vet visit removed" });
    } catch { toast({ title: "Error removing vet visit", variant: "destructive" }); }
  }

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-6">
          <Skeleton className="h-40 w-40 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!pet) return <div className="p-8 text-muted-foreground">Pet not found.</div>;

  const p = pet as any;
  const age = p.dob ? Math.floor(differenceInDays(new Date(), parseISO(p.dob)) / 365.25) : null;
  const vaxList = (vaccinations as any[]) ?? [];
  const visitList = (vetVisits as any[]) ?? [];

  // Upcoming vaccinations due in next 60 days
  const upcoming = vaxList.filter((v: any) => {
    if (!v.nextDueDate) return false;
    const diff = differenceInDays(parseISO(v.nextDueDate), new Date());
    return diff >= 0 && diff <= 60;
  });

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: PawPrint },
    { key: "vaccinations", label: "Vaccinations", icon: Syringe },
    { key: "vet-visits", label: "Vet Visits", icon: Stethoscope },
  ];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/pets"><ArrowLeft className="h-4 w-4 mr-1" /> Family Pets</Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 border overflow-hidden">
          {p.photoUrl ? (
            <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl">{speciesEmoji(p.species)}</span>
          )}
          <PhotoUpload currentUrl={p.photoUrl} onUrl={handlePhotoUpload} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold font-serif">{p.name}</h1>
              <p className="text-muted-foreground">{speciesLabel(p.species)}{p.breed ? ` · ${p.breed}` : ""}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/pets/${petId}/edit`}><Edit className="h-4 w-4" /><span className="hidden sm:inline ml-1">Edit</span></Link>
              </Button>
              {confirmDelete ? (
                <div className="flex gap-1 items-center">
                  <span className="text-xs text-destructive font-medium hidden sm:inline">Delete?</span>
                  <Button size="sm" variant="destructive" disabled={deletePet.isPending} onClick={handleDelete}>Yes, delete</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" /><span className="hidden sm:inline ml-1">Delete</span>
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {p.sex && <Badge variant={p.sex === "male" ? "default" : "secondary"} className="capitalize">{p.sex}</Badge>}
            {p.colour && <Badge variant="outline">{p.colour}</Badge>}
            {p.status === "deceased" && <Badge variant="destructive">Deceased</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-4 text-sm">
            {p.dob && <div className="text-muted-foreground">DOB: <span className="text-foreground font-medium">{format(parseISO(p.dob), "d MMM yyyy")}{age !== null ? ` (${age}y)` : ""}</span></div>}
            {p.microchip && <div className="text-muted-foreground">Chip: <span className="text-foreground font-medium font-mono text-xs">{p.microchip}</span></div>}
            {p.vetName && <div className="text-muted-foreground">Vet: <span className="text-foreground font-medium">{p.vetName}</span></div>}
            {p.vetPhone && <div className="text-muted-foreground">Phone: <span className="text-foreground font-medium">{p.vetPhone}</span></div>}
          </div>
          {upcoming.length > 0 && (
            <div className="mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
              ⚠️ {upcoming.length} vaccination{upcoming.length > 1 ? "s" : ""} due within 60 days
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.key === "vaccinations" && vaxList.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5 ml-1">{vaxList.length}</Badge>
            )}
            {t.key === "vet-visits" && visitList.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5 ml-1">{visitList.length}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent>
              <InfoRow label="Species" value={speciesLabel(p.species)} />
              <InfoRow label="Breed" value={p.breed} />
              <InfoRow label="Sex" value={p.sex} />
              <InfoRow label="Colour" value={p.colour} />
              <InfoRow label="Microchip" value={p.microchip} />
              <InfoRow label="Date of Birth" value={p.dob ? format(parseISO(p.dob), "d MMMM yyyy") : null} />
              <InfoRow label="Age" value={age !== null ? `${age} year${age !== 1 ? "s" : ""}` : null} />
              <InfoRow label="Status" value={p.status === "deceased" ? "Deceased" : "Alive"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Vet Contact</CardTitle></CardHeader>
            <CardContent>
              {!p.vetName && !p.vetPhone ? (
                <p className="text-sm text-muted-foreground">No vet contact added yet. <Link href={`/pets/${petId}/edit`} className="underline">Edit pet</Link> to add one.</p>
              ) : (
                <>
                  <InfoRow label="Clinic / Vet" value={p.vetName} />
                  <InfoRow label="Phone" value={p.vetPhone} />
                </>
              )}
            </CardContent>
          </Card>
          {p.notes && (
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap text-muted-foreground">{p.notes}</p></CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Vaccinations ── */}
      {tab === "vaccinations" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowVaxForm(v => !v)}>
              <Plus className="h-4 w-4 mr-1" /> Log Vaccination
            </Button>
          </div>

          {showVaxForm && (
            <Card>
              <CardHeader><CardTitle className="text-base">New Vaccination Record</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Vaccine <span className="text-destructive">*</span></Label>
                  <Input placeholder="e.g. Annual Booster, Rabies" value={vaxForm.vaccine}
                    onChange={e => setVaxForm(f => ({ ...f, vaccine: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date Given</Label>
                  <Input type="date" value={vaxForm.dateGiven}
                    onChange={e => setVaxForm(f => ({ ...f, dateGiven: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Next Due Date</Label>
                  <Input type="date" value={vaxForm.nextDueDate}
                    onChange={e => setVaxForm(f => ({ ...f, nextDueDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Administered By</Label>
                  <Input placeholder="e.g. Countryside Vets" value={vaxForm.vet}
                    onChange={e => setVaxForm(f => ({ ...f, vet: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Input placeholder="Optional notes" value={vaxForm.notes}
                    onChange={e => setVaxForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowVaxForm(false)}>Cancel</Button>
                  <Button onClick={handleAddVaccination} disabled={createVaccination.isPending}>
                    {createVaccination.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {vaxList.length === 0 ? (
            <div className="py-12 text-center border rounded-lg border-dashed">
              <Syringe className="h-10 w-10 mx-auto text-muted-foreground opacity-40 mb-3" />
              <p className="text-muted-foreground text-sm">No vaccination records yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vaxList.map((v: any) => {
                const isOverdue = v.nextDueDate && differenceInDays(parseISO(v.nextDueDate), new Date()) < 0;
                const isDueSoon = v.nextDueDate && !isOverdue && differenceInDays(parseISO(v.nextDueDate), new Date()) <= 60;
                return (
                  <Card key={v.id}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{v.vaccine}</span>
                            {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                            {isDueSoon && <Badge className="text-xs bg-amber-500">Due soon</Badge>}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 mt-2 text-sm">
                            {v.dateGiven && <span className="text-muted-foreground">Given: <b>{format(parseISO(v.dateGiven), "d MMM yyyy")}</b></span>}
                            {v.nextDueDate && <span className="text-muted-foreground">Due: <b>{format(parseISO(v.nextDueDate), "d MMM yyyy")}</b></span>}
                            {v.vet && <span className="text-muted-foreground">By: <b>{v.vet}</b></span>}
                          </div>
                          {v.notes && <p className="text-xs text-muted-foreground mt-1">{v.notes}</p>}
                        </div>
                        {confirmDeleteVax === v.id ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteVax(v.id)}>Delete</Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteVax(null)}><X className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive"
                            onClick={() => setConfirmDeleteVax(v.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Vet Visits ── */}
      {tab === "vet-visits" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowVisitForm(v => !v)}>
              <Plus className="h-4 w-4 mr-1" /> Log Vet Visit
            </Button>
          </div>

          {showVisitForm && (
            <Card>
              <CardHeader><CardTitle className="text-base">New Vet Visit</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Date <span className="text-destructive">*</span></Label>
                  <Input type="date" value={visitForm.date}
                    onChange={e => setVisitForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reason <span className="text-destructive">*</span></Label>
                  <Input placeholder="e.g. Annual check-up, Injury" value={visitForm.reason}
                    onChange={e => setVisitForm(f => ({ ...f, reason: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Vet / Clinic</Label>
                  <Input placeholder="e.g. Countryside Vets" value={visitForm.vet}
                    onChange={e => setVisitForm(f => ({ ...f, vet: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cost</Label>
                  <Input placeholder="e.g. 45.00" value={visitForm.cost}
                    onChange={e => setVisitForm(f => ({ ...f, cost: e.target.value }))} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Notes</Label>
                  <Textarea placeholder="Diagnosis, treatment, follow-up…" rows={2} value={visitForm.notes}
                    onChange={e => setVisitForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowVisitForm(false)}>Cancel</Button>
                  <Button onClick={handleAddVisit} disabled={createVisit.isPending}>
                    {createVisit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {visitList.length === 0 ? (
            <div className="py-12 text-center border rounded-lg border-dashed">
              <Stethoscope className="h-10 w-10 mx-auto text-muted-foreground opacity-40 mb-3" />
              <p className="text-muted-foreground text-sm">No vet visits recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...visitList].sort((a: any, b: any) => b.date.localeCompare(a.date)).map((v: any) => (
                <Card key={v.id}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-medium">{v.reason}</span>
                          <span className="text-sm text-muted-foreground">{format(parseISO(v.date), "d MMM yyyy")}</span>
                          {v.cost && <Badge variant="outline" className="text-xs">£{v.cost}</Badge>}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground flex gap-4 flex-wrap">
                          {v.vet && <span>Vet: <b>{v.vet}</b></span>}
                        </div>
                        {v.notes && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{v.notes}</p>}
                      </div>
                      {confirmDeleteVisit === v.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteVisit(v.id)}>Delete</Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteVisit(null)}><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDeleteVisit(v.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
