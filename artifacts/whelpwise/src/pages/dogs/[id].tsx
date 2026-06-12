import { useState, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  useGetDog, useGetDogPedigree, useListDogHealthTests, useListHeatCycles,
  useCreateHealthTest, useDeleteHealthTest, useCreateHeatCycle, useDeleteHeatCycle,
  useUpdateDog, useSavePedigree, useLookupDogs, useDeleteDog,
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
  ArrowLeft, Dog as DogIcon, ShieldCheck, Activity, GitBranch,
  Edit, Plus, CheckCircle2, XCircle, FileDown, Trash2, X, Camera, CalendarClock,
  Save, Pencil, Link2,
} from "lucide-react";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Tab = "overview" | "health" | "heat" | "pedigree";

const POSITIVE_RESULTS = ["Clear", "Normal", "Excellent", "Good", "Pass", "Negative", "A", "B"];

const COMMON_TESTS = [
  "Hip Dysplasia (BVA)", "Elbow Dysplasia (BVA)", "Eye Examination (CAER/BVA)",
  "Heart Assessment (BVA)", "DNA: PRA", "DNA: PRCD-PRA", "DNA: NCL",
  "DNA: MDR1", "DNA: vWD", "DNA: DM", "Thyroid (OFA)", "Cardiac (OFA)",
  "Shoulder OCD", "BAER Hearing Test", "Coat Test (E Locus)",
];

const COMMON_RESULTS = [
  "Clear", "Carrier", "Affected",
  "Normal", "Mild", "Moderate", "Severe",
  "Excellent", "Good", "Fair",
  "Pass", "Fail", "Negative", "Positive",
  "A", "A1", "A2", "B", "C", "D",
];

const emptyHealthForm = { testName: "", result: "", date: "", laboratory: "", certificateUrl: "", notes: "" };
const emptyHeatForm = { startDate: "", endDate: "", notes: "" };

function estimateNextHeat(cycles: any[]): { date: Date; basis: string } | null {
  if (cycles.length === 0) return null;
  const sorted = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const last = sorted[sorted.length - 1];
  if (sorted.length === 1) {
    return { date: addDays(parseISO(last.startDate), 183), basis: "6-month average" };
  }
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(differenceInDays(parseISO(sorted[i].startDate), parseISO(sorted[i - 1].startDate)));
  }
  const avg = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
  return { date: addDays(parseISO(last.startDate), avg), basis: `${avg}-day avg from ${sorted.length} cycles` };
}

function PhotoUpload({ currentUrl, onUrl }: { currentUrl?: string | null; onUrl: (url: string) => void }) {
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (r) => onUrl(`/api/storage${r.objectPath}`),
  });
  return (
    <label className="absolute inset-0 flex items-end justify-center pb-2 cursor-pointer group">
      <input type="file" className="sr-only" accept="image/*"
        onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])}
        disabled={isUploading} />
      <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isUploading ? `${progress}%…` : <><Camera className="h-3 w-3" /> Change photo</>}
      </span>
    </label>
  );
}

export default function DogProfile() {
  const [, params] = useRoute("/dogs/:id");
  const dogId = parseInt(params?.id ?? "0", 10);
  const [tab, setTab] = useState<Tab>("overview");
  const { toast } = useToast();

  const { data: dog, isLoading, refetch: refetchDog } = useGetDog(dogId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: healthTests, refetch: refetchHealthTests } = useListDogHealthTests(dogId, { query: { enabled: tab === "health" } } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: heatCycles, refetch: refetchHeat } = useListHeatCycles(dogId, { query: { enabled: tab === "heat" } } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pedigree, refetch: refetchPedigree } = useGetDogPedigree(dogId, 3, { query: { enabled: tab === "pedigree" } } as any);

  const createHealthTest = useCreateHealthTest();
  const deleteHealthTest = useDeleteHealthTest();
  const createHeatCycle = useCreateHeatCycle();
  const deleteHeatCycle = useDeleteHeatCycle();
  const updateDog = useUpdateDog();
  const deleteDog = useDeleteDog();
  const [, navigate] = useLocation();

  // Delete dog
  const [confirmDeleteDog, setConfirmDeleteDog] = useState(false);

  async function handleDeleteDog() {
    try {
      await deleteDog.mutateAsync({ dogId });
      toast({ title: "Dog deleted" });
      navigate("/dogs");
    } catch { toast({ title: "Error deleting dog", variant: "destructive" }); }
  }

  // Health test form
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [healthForm, setHealthForm] = useState(emptyHealthForm);
  const [confirmDeleteHealth, setConfirmDeleteHealth] = useState<number | null>(null);

  // Heat cycle form
  const [showHeatForm, setShowHeatForm] = useState(false);
  const [heatForm, setHeatForm] = useState(emptyHeatForm);
  const [confirmDeleteHeat, setConfirmDeleteHeat] = useState<number | null>(null);

  async function handleAddHealth() {
    if (!healthForm.testName.trim()) { toast({ title: "Test name is required", variant: "destructive" }); return; }
    if (!healthForm.result.trim()) { toast({ title: "Result is required", variant: "destructive" }); return; }
    try {
      await createHealthTest.mutateAsync({ dogId, data: { testName: healthForm.testName.trim(), result: healthForm.result.trim(), date: healthForm.date || null, laboratory: healthForm.laboratory.trim() || null, certificateUrl: healthForm.certificateUrl.trim() || null, notes: healthForm.notes.trim() || null } as any });
      await refetchHealthTests();
      setHealthForm(emptyHealthForm);
      setShowHealthForm(false);
      toast({ title: "Health test saved" });
    } catch { toast({ title: "Error saving health test", variant: "destructive" }); }
  }

  async function handleDeleteHealth(testId: number) {
    try {
      await deleteHealthTest.mutateAsync({ dogId, testId });
      await refetchHealthTests();
      setConfirmDeleteHealth(null);
      toast({ title: "Health test removed" });
    } catch { toast({ title: "Error removing health test", variant: "destructive" }); }
  }

  async function handleAddHeat() {
    if (!heatForm.startDate) { toast({ title: "Start date is required", variant: "destructive" }); return; }
    try {
      await createHeatCycle.mutateAsync({ dogId, data: { startDate: heatForm.startDate, endDate: heatForm.endDate || null, notes: heatForm.notes.trim() || null } as any });
      await refetchHeat();
      setHeatForm(emptyHeatForm);
      setShowHeatForm(false);
      toast({ title: "Heat cycle logged" });
    } catch { toast({ title: "Error logging heat cycle", variant: "destructive" }); }
  }

  async function handleDeleteHeat(cycleId: number) {
    try {
      await deleteHeatCycle.mutateAsync({ dogId, cycleId });
      await refetchHeat();
      setConfirmDeleteHeat(null);
      toast({ title: "Heat cycle removed" });
    } catch { toast({ title: "Error removing heat cycle", variant: "destructive" }); }
  }

  async function handlePhotoUpload(url: string) {
    try {
      await updateDog.mutateAsync({ dogId, data: { photoUrl: url } as any });
      await refetchDog();
      toast({ title: "Photo updated" });
    } catch { toast({ title: "Error updating photo", variant: "destructive" }); }
  }

  const tabs = [
    { key: "overview" as Tab, label: "Overview", icon: DogIcon },
    { key: "health" as Tab, label: "Health Tests", icon: ShieldCheck },
    { key: "heat" as Tab, label: "Heat Cycles", icon: Activity },
    { key: "pedigree" as Tab, label: "Pedigree", icon: GitBranch },
  ];

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-6">
          <Skeleton className="h-48 w-48 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!dog) return <div className="p-8 text-muted-foreground">Dog not found.</div>;

  const age = dog.dob ? Math.floor((Date.now() - new Date(dog.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const cycles = (heatCycles as any[]) ?? [];
  const nextHeat = estimateNextHeat(cycles);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dogs"><ArrowLeft className="h-4 w-4 mr-1" /> Dogs</Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Photo — click to change */}
        <div className="relative w-36 h-36 md:w-48 md:h-48 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 border overflow-hidden">
          {dog.photoUrl ? (
            <img src={dog.photoUrl} alt={dog.callName} className="w-full h-full object-cover" />
          ) : (
            <DogIcon className="h-16 w-16 text-muted-foreground/30" />
          )}
          <PhotoUpload currentUrl={dog.photoUrl} onUrl={handlePhotoUpload} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold font-serif">{dog.registeredName}</h1>
              <p className="text-muted-foreground text-lg">"{dog.callName}"</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => window.open(`/api/dogs/${dogId}/pedigree-certificate`, "_blank")}>
                <FileDown className="h-4 w-4" /><span className="hidden sm:inline ml-1">Pedigree PDF</span>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dogs/${dogId}/edit`}><Edit className="h-4 w-4" /><span className="hidden sm:inline ml-1">Edit</span></Link>
              </Button>
              {confirmDeleteDog ? (
                <div className="flex gap-1 items-center">
                  <span className="text-xs text-destructive font-medium hidden sm:inline">Delete?</span>
                  <Button size="sm" variant="destructive" disabled={deleteDog.isPending}
                    onClick={handleDeleteDog}>Yes, delete</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteDog(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => setConfirmDeleteDog(true)}>
                  <Trash2 className="h-4 w-4" /><span className="hidden sm:inline ml-1">Delete</span>
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant={dog.sex === "male" ? "default" : "secondary"} className="capitalize">{dog.sex}</Badge>
            {dog.breedName && <Badge variant="outline">{dog.breedName}</Badge>}
            {dog.colour && <Badge variant="outline">{dog.colour}</Badge>}
            {dog.status !== "active" && <Badge variant="destructive" className="capitalize">{dog.status}</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-4 text-sm">
            {dog.dob && <div className="text-muted-foreground">DOB: <span className="text-foreground font-medium">{format(new Date(dog.dob), "d MMM yyyy")}{age !== null ? ` (${age}y)` : ""}</span></div>}
            {dog.microchip && <div className="text-muted-foreground">Chip: <span className="text-foreground font-medium font-mono text-xs">{dog.microchip}</span></div>}
            {dog.registrationNumber && <div className="text-muted-foreground">Reg: <span className="text-foreground font-medium">{dog.registrationNumber}</span></div>}
            {dog.sireName && <div className="text-muted-foreground">Sire: <span className="text-foreground font-medium">{dog.sireName}</span></div>}
            {dog.damName && <div className="text-muted-foreground">Dam: <span className="text-foreground font-medium">{dog.damName}</span></div>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Identification</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Registered Name" value={dog.registeredName} />
              <Row label="Call Name" value={dog.callName} />
              <Row label="Breed" value={dog.breedName} />
              <Row label="Sex" value={<span className="capitalize">{dog.sex}</span>} />
              <Row label="Colour" value={dog.colour} />
              <Row label="Status" value={<span className="capitalize">{dog.status}</span>} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Registration</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Date of Birth" value={dog.dob ? format(new Date(dog.dob), "d MMM yyyy") : null} />
              <Row label="Age" value={age !== null ? `${age} years` : null} />
              <Row label="Microchip" value={dog.microchip ? <span className="font-mono">{dog.microchip}</span> : null} />
              <Row label="Reg. Number" value={dog.registrationNumber} />
              <Row label="Visibility" value={<span className="capitalize">{dog.visibility}</span>} />
              <Row label="Sire" value={dog.sireName} />
              <Row label="Dam" value={dog.damName} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Health Tests ── */}
      {tab === "health" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Health Test Results</h2>
              <p className="text-xs text-muted-foreground mt-0.5">OFA, BVA, KC, DNA panels and any other certifications.</p>
            </div>
            <Button size="sm" onClick={() => setShowHealthForm(f => !f)}>
              <Plus className="h-4 w-4 mr-1" /> Add Test
            </Button>
          </div>

          {showHealthForm && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3"><CardTitle className="text-sm">New Health Test</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <datalist id="test-names">{COMMON_TESTS.map(t => <option key={t} value={t} />)}</datalist>
                <datalist id="test-results">{COMMON_RESULTS.map(r => <option key={r} value={r} />)}</datalist>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Test Name *</Label>
                    <Input className="h-8 text-sm" list="test-names" placeholder="e.g. Hip Dysplasia (BVA)" value={healthForm.testName} onChange={e => setHealthForm(f => ({ ...f, testName: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Result *</Label>
                    <Input className="h-8 text-sm" list="test-results" placeholder="e.g. Clear, Normal, 0/0" value={healthForm.result} onChange={e => setHealthForm(f => ({ ...f, result: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date</Label>
                    <Input className="h-8 text-sm" type="date" value={healthForm.date} onChange={e => setHealthForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Laboratory / Scheme</Label>
                    <Input className="h-8 text-sm" placeholder="e.g. BVA, OFA, Embark" value={healthForm.laboratory} onChange={e => setHealthForm(f => ({ ...f, laboratory: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Certificate URL <span className="text-muted-foreground">(optional)</span></Label>
                    <Input className="h-8 text-sm" type="url" placeholder="https://…" value={healthForm.certificateUrl} onChange={e => setHealthForm(f => ({ ...f, certificateUrl: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Notes</Label>
                    <Textarea className="text-sm min-h-[56px]" placeholder="Any additional details…" value={healthForm.notes} onChange={e => setHealthForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setShowHealthForm(false); setHealthForm(emptyHealthForm); }}>Cancel</Button>
                  <Button size="sm" onClick={handleAddHealth} disabled={createHealthTest.isPending}>{createHealthTest.isPending ? "Saving…" : "Save Test"}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!healthTests || (healthTests as any[]).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No health tests recorded yet</p>
              <p className="text-sm mt-1">Click "Add Test" to log the first result.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(healthTests as any[]).map((t) => {
                const isPositive = POSITIVE_RESULTS.includes(t.result);
                return (
                  <Card key={t.id} className={confirmDeleteHealth === t.id ? "border-destructive/40 bg-destructive/5" : ""}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${isPositive ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"}`}>
                        {isPositive ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{t.testName}</div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                          {t.date && <span>{format(new Date(t.date), "d MMM yyyy")}</span>}
                          {t.laboratory && <span>{t.laboratory}</span>}
                          {t.certificateUrl && <a href={t.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Certificate ↗</a>}
                        </div>
                        {t.notes && <div className="text-xs text-muted-foreground mt-1">{t.notes}</div>}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className={`font-bold ${isPositive ? "text-green-700 dark:text-green-400" : "text-yellow-700 dark:text-yellow-400"}`}>{t.result}</div>
                        {confirmDeleteHealth === t.id ? (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="destructive" className="h-7 text-xs px-2" disabled={deleteHealthTest.isPending} onClick={() => handleDeleteHealth(t.id)}>Delete</Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setConfirmDeleteHealth(null)}><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDeleteHealth(t.id)}><Trash2 className="h-4 w-4" /></Button>
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

      {/* ── Heat Cycles ── */}
      {tab === "heat" && (
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">Heat Cycles</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Log every season to improve next-heat predictions.</p>
            </div>
            <Button size="sm" onClick={() => setShowHeatForm(f => !f)}>
              <Plus className="h-4 w-4 mr-1" /> Log Cycle
            </Button>
          </div>

          {/* Next heat estimate */}
          {nextHeat && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center gap-3 p-4">
                <CalendarClock className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                  <div className="font-semibold text-primary">Estimated next heat: {format(nextHeat.date, "d MMM yyyy")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Based on {nextHeat.basis} · {differenceInDays(nextHeat.date, new Date())} days away</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add cycle form */}
          {showHeatForm && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3"><CardTitle className="text-sm">Log Heat Cycle</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Date *</Label>
                    <Input className="h-8 text-sm" type="date" value={heatForm.startDate} onChange={e => setHeatForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">End Date <span className="text-muted-foreground">(optional)</span></Label>
                    <Input className="h-8 text-sm" type="date" value={heatForm.endDate} onChange={e => setHeatForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Notes <span className="text-muted-foreground">(optional)</span></Label>
                    <Textarea className="text-sm min-h-[56px]" placeholder="e.g. duration, intensity, any observations…" value={heatForm.notes} onChange={e => setHeatForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setShowHeatForm(false); setHeatForm(emptyHeatForm); }}>Cancel</Button>
                  <Button size="sm" onClick={handleAddHeat} disabled={createHeatCycle.isPending}>{createHeatCycle.isPending ? "Saving…" : "Save Cycle"}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {cycles.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No heat cycles recorded</p>
              <p className="text-sm mt-1">Log cycles to track patterns and predict future heats.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...cycles].reverse().map((c: any, idx: number) => {
                const cycleNum = cycles.length - idx;
                const duration = c.endDate ? differenceInDays(parseISO(c.endDate), parseISO(c.startDate)) : null;
                return (
                  <Card key={c.id} className={confirmDeleteHeat === c.id ? "border-destructive/40 bg-destructive/5" : ""}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="h-10 w-10 rounded-full bg-pink-100 dark:bg-pink-950 flex items-center justify-center flex-shrink-0 text-pink-600 dark:text-pink-400 font-bold text-sm">
                        #{cycleNum}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          Started {format(parseISO(c.startDate), "d MMM yyyy")}
                          {c.endDate && ` → ${format(parseISO(c.endDate), "d MMM yyyy")}`}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
                          {duration !== null && <span>{duration} days</span>}
                          {c.notes && <span className="truncate">{c.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={c.endDate ? "secondary" : "default"}>{c.endDate ? "Ended" : "Active"}</Badge>
                        {confirmDeleteHeat === c.id ? (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="destructive" className="h-7 text-xs px-2" disabled={deleteHeatCycle.isPending} onClick={() => handleDeleteHeat(c.id)}>Delete</Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setConfirmDeleteHeat(null)}><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDeleteHeat(c.id)}><Trash2 className="h-4 w-4" /></Button>
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

      {/* ── Pedigree ── */}
      {tab === "pedigree" && dogId && (
        <PedigreeTab dogId={dogId} pedigree={pedigree} refetchPedigree={refetchPedigree} />
      )}
    </div>
  );
}

// ─── Pedigree Editor ─────────────────────────────────────────────────────────

const SLOT_DEFS = [
  { key: "sire",        label: "Sire",          sex: "male"   as const, gen: 1 },
  { key: "dam",         label: "Dam",            sex: "female" as const, gen: 1 },
  { key: "sireSire",    label: "Sire's Sire",    sex: "male"   as const, gen: 2 },
  { key: "sireDam",     label: "Sire's Dam",     sex: "female" as const, gen: 2 },
  { key: "damSire",     label: "Dam's Sire",     sex: "male"   as const, gen: 2 },
  { key: "damDam",      label: "Dam's Dam",      sex: "female" as const, gen: 2 },
  { key: "sireSireSire", label: "SS's Sire",     sex: "male"   as const, gen: 3 },
  { key: "sireSireDam",  label: "SS's Dam",      sex: "female" as const, gen: 3 },
  { key: "sireDamSire",  label: "SD's Sire",     sex: "male"   as const, gen: 3 },
  { key: "sireDamDam",   label: "SD's Dam",      sex: "female" as const, gen: 3 },
  { key: "damSireSire",  label: "DS's Sire",     sex: "male"   as const, gen: 3 },
  { key: "damSireDam",   label: "DS's Dam",      sex: "female" as const, gen: 3 },
  { key: "damDamSire",   label: "DD's Sire",     sex: "male"   as const, gen: 3 },
  { key: "damDamDam",    label: "DD's Dam",      sex: "female" as const, gen: 3 },
] as const;

type SlotKey = typeof SLOT_DEFS[number]["key"];
type SlotData = { registeredName: string; registrationNumber: string };
type PedigreeFormState = Record<SlotKey, SlotData>;

function emptySlot(): SlotData { return { registeredName: "", registrationNumber: "" }; }
function nodeToSlot(n: any): SlotData {
  return { registeredName: n?.registeredName ?? "", registrationNumber: n?.registrationNumber ?? "" };
}
function pedigreeToForm(p: any): PedigreeFormState {
  const n = p?.dog;
  return {
    sire:         nodeToSlot(n?.sire),
    dam:          nodeToSlot(n?.dam),
    sireSire:     nodeToSlot(n?.sire?.sire),
    sireDam:      nodeToSlot(n?.sire?.dam),
    damSire:      nodeToSlot(n?.dam?.sire),
    damDam:       nodeToSlot(n?.dam?.dam),
    sireSireSire: nodeToSlot(n?.sire?.sire?.sire),
    sireSireDam:  nodeToSlot(n?.sire?.sire?.dam),
    sireDamSire:  nodeToSlot(n?.sire?.dam?.sire),
    sireDamDam:   nodeToSlot(n?.sire?.dam?.dam),
    damSireSire:  nodeToSlot(n?.dam?.sire?.sire),
    damSireDam:   nodeToSlot(n?.dam?.sire?.dam),
    damDamSire:   nodeToSlot(n?.dam?.dam?.sire),
    damDamDam:    nodeToSlot(n?.dam?.dam?.dam),
  };
}

function AncestorSlotInput({
  label, sex, value, onChange,
}: {
  label: string;
  sex: "male" | "female";
  value: SlotData;
  onChange: (v: SlotData) => void;
}) {
  const [debouncedQ, setDebouncedQ] = useState(value.registrationNumber);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleRegChange(reg: string) {
    onChange({ ...value, registrationNumber: reg });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQ(reg), 400);
  }

  const { data: matches } = useLookupDogs(
    { q: debouncedQ },
    { query: { enabled: debouncedQ.trim().length >= 2, staleTime: 30_000 } } as any,
  );

  const exactMatch = matches?.find(
    d => d.registrationNumber?.toLowerCase() === debouncedQ.toLowerCase().trim(),
  );
  const hint = exactMatch ?? (debouncedQ.trim().length >= 2 ? matches?.[0] : undefined);

  const border = sex === "male"
    ? "border-blue-200 dark:border-blue-900/40"
    : "border-pink-200 dark:border-pink-900/40";

  return (
    <div className={`rounded-lg border ${border} p-2.5 space-y-1.5`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <Input
        className="h-7 text-xs"
        placeholder="Registered name"
        value={value.registeredName}
        onChange={e => onChange({ ...value, registeredName: e.target.value })}
      />
      <Input
        className="h-7 text-xs font-mono"
        placeholder="Reg. number"
        value={value.registrationNumber}
        onChange={e => handleRegChange(e.target.value)}
      />
      {hint && (
        <div className={`flex items-center gap-1 text-[11px] ${hint.isExternal ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
          <Link2 className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{hint.isExternal ? "Known stub:" : "Links to:"} {hint.registeredName}</span>
        </div>
      )}
    </div>
  );
}

function PedigreeEditor({ dogId, pedigreeData, onSaved, onCancel }: {
  dogId: number;
  pedigreeData: any;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PedigreeFormState>(() => pedigreeToForm(pedigreeData));
  const savePedigree = useSavePedigree();
  const { toast } = useToast();

  function handleSave() {
    const data: any = {};
    for (const slot of SLOT_DEFS) {
      const v = form[slot.key];
      if (v.registeredName.trim() || v.registrationNumber.trim()) {
        data[slot.key] = {
          registeredName: v.registeredName.trim() || null,
          registrationNumber: v.registrationNumber.trim() || null,
        };
      }
    }
    savePedigree.mutate({ dogId, data }, {
      onSuccess: () => { toast({ title: "Pedigree saved" }); onSaved(); },
      onError: () => toast({ title: "Failed to save pedigree", variant: "destructive" }),
    });
  }

  const genSections = [
    { gen: 1, title: "Parents (Generation 1)" },
    { gen: 2, title: "Grandparents (Generation 2)" },
    { gen: 3, title: "Great-Grandparents (Generation 3)" },
  ];

  return (
    <div className="space-y-6">
      {genSections.map(({ gen, title }) => {
        const slots = SLOT_DEFS.filter(s => s.gen === gen);
        const cols = gen === 1 ? "grid-cols-1 sm:grid-cols-2" : gen === 2 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
        return (
          <div key={gen}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h3>
            <div className={`grid gap-2 ${cols}`}>
              {slots.map(slot => (
                <AncestorSlotInput
                  key={slot.key}
                  label={slot.label}
                  sex={slot.sex}
                  value={form[slot.key]}
                  onChange={v => setForm(prev => ({ ...prev, [slot.key]: v }))}
                />
              ))}
            </div>
          </div>
        );
      })}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={savePedigree.isPending}>
          <Save className="h-4 w-4 mr-1.5" />
          {savePedigree.isPending ? "Saving…" : "Save Pedigree"}
        </Button>
      </div>
    </div>
  );
}

function PedigreeTab({ dogId, pedigree, refetchPedigree }: {
  dogId: number;
  pedigree: any;
  refetchPedigree: () => void;
}) {
  const [editing, setEditing] = useState(false);

  function handleSaved() {
    refetchPedigree();
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Pedigree</h2>
        </div>
        <PedigreeEditor
          dogId={dogId}
          pedigreeData={pedigree}
          onSaved={handleSaved}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  const hasAnyAncestor = pedigree?.dog && (pedigree.dog.sire || pedigree.dog.dam);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">3-Generation Pedigree</h2>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Edit Pedigree
        </Button>
      </div>
      {!pedigree ? (
        <div className="text-center py-16 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
          Pedigree loading…
        </div>
      ) : !hasAnyAncestor ? (
        <div className="text-center py-16 text-muted-foreground bg-muted/20 rounded-xl border border-dashed space-y-2">
          <GitBranch className="h-8 w-8 mx-auto opacity-30" />
          <p>No pedigree data yet.</p>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Add Pedigree
          </Button>
        </div>
      ) : (
        <PedigreeView node={pedigree.dog} />
      )}
      {pedigree?.duplicateAncestors && pedigree.duplicateAncestors.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-400">⚠ Duplicate ancestors detected:</p>
            <p className="text-sm text-orange-600 dark:text-orange-500 mt-1">{pedigree.duplicateAncestors.join(", ")}</p>
          </CardContent>
        </Card>
      )}
    </div>
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

// ─── Pedigree layout constants ────────────────────────────────────────────────

const CELL_H = 68; // px per grid row (8 equal rows)
const CONN_W = 20; // connector column width
const NODE_W = [176, 158, 146, 134] as const; // column widths per generation

// ─── PedigreeCard ─────────────────────────────────────────────────────────────

function PedigreeCard({ node, gen, label }: { node: any; gen: number; label?: string }) {
  if (!node) {
    return (
      <div className="rounded border border-dashed border-border/25 h-full w-full flex items-center justify-center">
        <span className="text-[10px] text-muted-foreground/25 select-none">—</span>
      </div>
    );
  }
  return (
    <div className={cn(
      "rounded-md border p-1.5 flex flex-col justify-center gap-[2px] h-full w-full overflow-hidden",
      gen === 0 ? "border-primary/40 bg-primary/5" : "border-border/70 bg-card",
    )}>
      {label && (
        <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground/50 leading-none">{label}</div>
      )}
      <div className={cn("font-semibold leading-tight truncate", gen <= 1 ? "text-[11px]" : "text-[10px]")}>
        {node.registeredName}
      </div>
      {node.registrationNumber && (
        <div className="text-[10px] font-mono text-muted-foreground/60 truncate leading-tight">
          {node.registrationNumber}
        </div>
      )}
      {node.colour && gen < 3 && (
        <div className="text-[10px] text-muted-foreground/50 truncate leading-tight">{node.colour}</div>
      )}
      <div className="flex gap-1 flex-wrap">
        {node.sex && (
          <Badge
            variant={node.sex === "male" ? "default" : "secondary"}
            className="text-[9px] px-1 py-0 h-3.5 leading-none capitalize"
          >
            {node.sex}
          </Badge>
        )}
        {node.isExternal && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 leading-none text-amber-600 border-amber-300 dark:border-amber-800">
            stub
          </Badge>
        )}
      </div>
    </div>
  );
}

// ─── SVG branch connector ──────────────────────────────────────────────────────
// Draws: horizontal arm from parent center → vertical bar → two arms to children.
// Works because topY = h/4 = center of top half, botY = 3h/4 = center of bottom half.

function PedigreeConnector({ rows }: { rows: number }) {
  const h = rows * CELL_H;
  const mid = h / 2;
  const top = h / 4;
  const bot = (h * 3) / 4;
  const cx = CONN_W / 2;
  return (
    <svg
      width={CONN_W}
      height={h}
      viewBox={`0 0 ${CONN_W} ${h}`}
      className="block shrink-0"
      style={{ color: "hsl(var(--border))" }}
    >
      {/* Arm from parent (left edge → midpoint column) */}
      <line x1={0} y1={mid} x2={cx} y2={mid} stroke="currentColor" strokeWidth="1" />
      {/* Vertical bar between child arm points */}
      <line x1={cx} y1={top} x2={cx} y2={bot} stroke="currentColor" strokeWidth="1" />
      {/* Arms to top and bottom children */}
      <line x1={cx} y1={top} x2={CONN_W} y2={top} stroke="currentColor" strokeWidth="1" />
      <line x1={cx} y1={bot} x2={CONN_W} y2={bot} stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

// ─── PedigreeView ─────────────────────────────────────────────────────────────

function PedigreeView({ node: n }: { node: any }) {
  const p2 = "3px 6px 3px 0"; // padding for left-padded node cells
  const p3 = "3px 0";         // padding for rightmost column (no right padding)

  // Cell wrapper: fills grid area, vertically centers content
  function Cell({ col, row, rowEnd, pad, children }: {
    col: number; row: number; rowEnd?: number; pad?: string; children: React.ReactNode;
  }) {
    return (
      <div style={{
        gridColumn: col,
        gridRow: rowEnd ? `${row} / ${rowEnd}` : row,
        padding: pad ?? p2,
        display: "flex",
        alignItems: "stretch",
      }}>
        {children}
      </div>
    );
  }

  // Great-grandparent shorthand labels: S/D = sire/dam from the subject's perspective
  const ggp = [
    { row: 1, nd: n?.sire?.sire?.sire, lbl: "S·S·S" },
    { row: 2, nd: n?.sire?.sire?.dam,  lbl: "S·S·D" },
    { row: 3, nd: n?.sire?.dam?.sire,  lbl: "S·D·S" },
    { row: 4, nd: n?.sire?.dam?.dam,   lbl: "S·D·D" },
    { row: 5, nd: n?.dam?.sire?.sire,  lbl: "D·S·S" },
    { row: 6, nd: n?.dam?.sire?.dam,   lbl: "D·S·D" },
    { row: 7, nd: n?.dam?.dam?.sire,   lbl: "D·D·S" },
    { row: 8, nd: n?.dam?.dam?.dam,    lbl: "D·D·D" },
  ];

  return (
    <>
      {/* ── Mobile: stacked by generation ─────────────────────────────────── */}
      <div className="md:hidden space-y-5">
        {([
          { label: "Parents", items: [
            { nd: n?.sire, lbl: "Sire" }, { nd: n?.dam, lbl: "Dam" },
          ]},
          { label: "Grandparents", items: [
            { nd: n?.sire?.sire, lbl: "Sire's Sire" }, { nd: n?.sire?.dam, lbl: "Sire's Dam" },
            { nd: n?.dam?.sire,  lbl: "Dam's Sire"  }, { nd: n?.dam?.dam,  lbl: "Dam's Dam"  },
          ]},
          { label: "Great-Grandparents", items: ggp.map(g => ({ nd: g.nd, lbl: g.lbl })) },
        ] as const).map(({ label, items }) => (
          <div key={label}>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">{label}</p>
            <div className="grid grid-cols-2 gap-2">
              {items.map(({ nd, lbl }) => (
                <div key={lbl} style={{ height: 64 }}>
                  <PedigreeCard node={nd} gen={1} label={lbl} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop: professional landscape grid ───────────────────────────── */}
      <div className="hidden md:block">
        {/* Generation headers */}
        <div className="flex mb-1" style={{ minWidth: 660 }}>
          {(["Subject", "Parents", "Grandparents", "Great-Grandparents"] as const).map((heading, i) => (
            <div key={heading} style={{ width: NODE_W[i], marginRight: i < 3 ? CONN_W : 0 }}>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60 pl-1">
                {heading}
              </span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `${NODE_W[0]}px ${CONN_W}px ${NODE_W[1]}px ${CONN_W}px ${NODE_W[2]}px ${CONN_W}px ${NODE_W[3]}px`,
              gridTemplateRows: `repeat(8, ${CELL_H}px)`,
              minWidth: 660,
            }}
          >
            {/* Subject — spans all 8 rows */}
            <Cell col={1} row={1} rowEnd={9}><PedigreeCard node={n} gen={0} /></Cell>

            {/* Subject → Parents connector */}
            <div style={{ gridColumn: 2, gridRow: "1 / 9" }}><PedigreeConnector rows={8} /></div>

            {/* Parents */}
            <Cell col={3} row={1} rowEnd={5} pad={p2}><PedigreeCard node={n?.sire} gen={1} label="Sire" /></Cell>
            <Cell col={3} row={5} rowEnd={9} pad={p2}><PedigreeCard node={n?.dam}  gen={1} label="Dam"  /></Cell>

            {/* Sire → Grandparents connector */}
            <div style={{ gridColumn: 4, gridRow: "1 / 5" }}><PedigreeConnector rows={4} /></div>
            {/* Dam → Grandparents connector */}
            <div style={{ gridColumn: 4, gridRow: "5 / 9" }}><PedigreeConnector rows={4} /></div>

            {/* Grandparents */}
            <Cell col={5} row={1} rowEnd={3} pad={p2}><PedigreeCard node={n?.sire?.sire} gen={2} label="Sire's Sire" /></Cell>
            <Cell col={5} row={3} rowEnd={5} pad={p2}><PedigreeCard node={n?.sire?.dam}  gen={2} label="Sire's Dam"  /></Cell>
            <Cell col={5} row={5} rowEnd={7} pad={p2}><PedigreeCard node={n?.dam?.sire}  gen={2} label="Dam's Sire"  /></Cell>
            <Cell col={5} row={7} rowEnd={9} pad={p2}><PedigreeCard node={n?.dam?.dam}   gen={2} label="Dam's Dam"   /></Cell>

            {/* Grandparents → Great-Grandparents connectors */}
            <div style={{ gridColumn: 6, gridRow: "1 / 3" }}><PedigreeConnector rows={2} /></div>
            <div style={{ gridColumn: 6, gridRow: "3 / 5" }}><PedigreeConnector rows={2} /></div>
            <div style={{ gridColumn: 6, gridRow: "5 / 7" }}><PedigreeConnector rows={2} /></div>
            <div style={{ gridColumn: 6, gridRow: "7 / 9" }}><PedigreeConnector rows={2} /></div>

            {/* Great-Grandparents */}
            {ggp.map(({ row, nd, lbl }) => (
              <Cell key={row} col={7} row={row} pad={p3}>
                <PedigreeCard node={nd} gen={3} label={lbl} />
              </Cell>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
