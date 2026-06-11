import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListDogs,
  useCreateLitter,
  useCreatePuppy,
  useListDogHealthTests,
  useCreateHealthTest,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Baby, Plus, Trash2, ShieldCheck, Upload, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@workspace/object-storage-web";

const STEP_LABELS = ["Litter Details", "Parent Health", "Add Puppies"];
const COLLAR_COLOURS = ["Red", "Blue", "Green", "Orange", "Pink", "Purple", "Yellow", "White", "Black"];

type PuppyRow = {
  id: string;
  sex: "male" | "female";
  collarColour: string;
  colour: string;
  markings: string;
  birthWeight: string;
  birthTime: string;
  notes: string;
};

type HealthTestForm = {
  testName: string;
  result: string;
  date: string;
  laboratory: string;
  certificateUrl: string;
};

function newPuppy(): PuppyRow {
  return { id: crypto.randomUUID(), sex: "female", collarColour: "", colour: "", markings: "", birthWeight: "", birthTime: "", notes: "" };
}

function newHealthTest(): HealthTestForm {
  return { testName: "", result: "", date: "", laboratory: "", certificateUrl: "" };
}

function HealthTestUploader({ onUrl }: { onUrl: (url: string) => void }) {
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (r) => onUrl(`/api/storage${r.objectPath}`),
  });
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
      <Upload className="h-3.5 w-3.5" />
      {isUploading ? `Uploading… ${progress}%` : "Upload certificate"}
      <input
        type="file"
        className="sr-only"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])}
        disabled={isUploading}
      />
    </label>
  );
}

function HealthSection({
  dogId,
  dogName,
  label,
}: { dogId: number | null; dogName: string; label: string }) {
  const { data: existing } = useListDogHealthTests(dogId ?? 0, { query: { enabled: !!dogId, queryKey: ["health-tests", dogId] } });
  const createHealthTest = useCreateHealthTest();
  const { toast } = useToast();

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<HealthTestForm>(newHealthTest());

  function setF(k: keyof HealthTestForm, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!dogId || !form.testName || !form.result) {
      toast({ title: "Test name and result are required", variant: "destructive" });
      return;
    }
    await createHealthTest.mutateAsync({
      dogId,
      data: {
        testName: form.testName,
        result: form.result,
        date: form.date || undefined,
        laboratory: form.laboratory || undefined,
        certificateUrl: form.certificateUrl || undefined,
      } as any,
    });
    toast({ title: "Health test saved" });
    setForm(newHealthTest());
    setAdding(false);
  }

  const tests = (existing as any[]) ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{label}: {dogName || "—"}</h4>
        {dogId && (
          <Button size="sm" variant="outline" onClick={() => setAdding(a => !a)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Test
          </Button>
        )}
      </div>

      {tests.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground italic">No health tests recorded.</p>
      )}

      {tests.map((t: any) => (
        <div key={t.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
          <div className="text-sm">
            <span className="font-medium">{t.testName}</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <Badge variant={t.result.toLowerCase() === "pass" || t.result.toLowerCase() === "clear" ? "secondary" : "outline"} className="text-xs">
              {t.result}
            </Badge>
            {t.date && <span className="ml-2 text-xs text-muted-foreground">{t.date}</span>}
            {t.laboratory && <span className="ml-2 text-xs text-muted-foreground">{t.laboratory}</span>}
          </div>
          {t.certificateUrl && (
            <a href={t.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">View</a>
          )}
        </div>
      ))}

      {adding && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Test Name *</Label>
              <Input
                placeholder="e.g. DNA — PRA, Hip Score, Elbow Score"
                value={form.testName}
                onChange={e => setF("testName", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Result *</Label>
              <Input
                placeholder="e.g. Clear, Pass, 0/0, Excellent"
                value={form.result}
                onChange={e => setF("result", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.date} onChange={e => setF("date", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Laboratory / Certifying Body</Label>
              <Input placeholder="e.g. Animal DNA Diagnostics" value={form.laboratory} onChange={e => setF("laboratory", e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <HealthTestUploader onUrl={url => setF("certificateUrl", url)} />
            {form.certificateUrl && (
              <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> File uploaded</span>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={createHealthTest.isPending}>Save Test</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewLitter() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: dogs } = useListDogs({});
  const createLitter = useCreateLitter();
  const createPuppy = useCreatePuppy();

  const [step, setStep] = useState(0);

  // Step 1 state
  const [litter, setLitter] = useState({
    damId: "",
    sireId: "",
    dob: "",
    status: "expected",
    totalBorn: "",
    liveMales: "",
    liveFemales: "",
    stillborn: "",
    notes: "",
  });

  // Step 3 state
  const [puppies, setPuppies] = useState<PuppyRow[]>([newPuppy()]);

  const females = (dogs as any[] | undefined)?.filter(d => d.sex === "female") ?? [];
  const males = (dogs as any[] | undefined)?.filter(d => d.sex === "male") ?? [];

  const damDog = (dogs as any[] | undefined)?.find(d => String(d.id) === litter.damId);
  const sireDog = (dogs as any[] | undefined)?.find(d => String(d.id) === litter.sireId);

  function setL(k: string, v: string) { setLitter(f => ({ ...f, [k]: v })); }

  function updatePuppy(id: string, k: keyof PuppyRow, v: string) {
    setPuppies(ps => ps.map(p => p.id === id ? { ...p, [k]: v } : p));
  }

  function removePuppy(id: string) {
    setPuppies(ps => ps.filter(p => p.id !== id));
  }

  async function handleFinish() {
    if (!litter.damId) {
      toast({ title: "Dam is required", variant: "destructive" });
      return;
    }
    try {
      const litterBody: any = {
        damId: parseInt(litter.damId),
        sireId: litter.sireId ? parseInt(litter.sireId) : null,
        dob: litter.dob || null,
        status: litter.status,
        totalBorn: litter.totalBorn ? parseInt(litter.totalBorn) : null,
        liveMales: litter.liveMales ? parseInt(litter.liveMales) : null,
        liveFemales: litter.liveFemales ? parseInt(litter.liveFemales) : null,
        stillborn: litter.stillborn ? parseInt(litter.stillborn) : null,
        notes: litter.notes || null,
      };

      const created = await createLitter.mutateAsync({ data: litterBody }) as any;
      const litterId = created.id;

      // Create puppies
      const validPuppies = puppies.filter(p => p.sex);
      await Promise.all(validPuppies.map(p =>
        createPuppy.mutateAsync({
          litterId,
          data: {
            sex: p.sex,
            alive: true,
            collarColour: p.collarColour || null,
            colour: p.colour || null,
            markings: p.markings || null,
            birthWeight: p.birthWeight ? parseFloat(p.birthWeight) : null,
            birthTime: p.birthTime || null,
            notes: p.notes || null,
          } as any,
        })
      ));

      toast({ title: "Litter created!", description: `${validPuppies.length} puppy record${validPuppies.length !== 1 ? "s" : ""} added.` });
      navigate(`/litters/${litterId}`);
    } catch {
      toast({ title: "Error creating litter", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/litters"><ArrowLeft className="h-4 w-4 mr-1" /> Litters</Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold font-serif">New Litter</h1>
        <p className="text-muted-foreground mt-1">Record a new litter with puppy details and parent health information.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${i === step ? "text-primary" : i < step ? "text-green-600 cursor-pointer" : "text-muted-foreground cursor-default"}`}
            >
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i === step ? "border-primary text-primary" : i < step ? "border-green-600 bg-green-600 text-white" : "border-muted-foreground/30 text-muted-foreground"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-border w-6" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Litter Details ────────────────────────────── */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Baby className="h-4 w-4 text-primary" /> Litter Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Dam (Mother) *</Label>
                <Select value={litter.damId} onValueChange={v => setL("damId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select dam…" /></SelectTrigger>
                  <SelectContent>
                    {females.map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.registeredName} "{d.callName}"</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sire (Father)</Label>
                <Select value={litter.sireId} onValueChange={v => setL("sireId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select sire…" /></SelectTrigger>
                  <SelectContent>
                    {males.map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.registeredName} "{d.callName}"</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth / Expected Date</Label>
                <Input type="date" value={litter.dob} onChange={e => setL("dob", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={litter.status} onValueChange={v => setL("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expected">Expected</SelectItem>
                    <SelectItem value="whelped">Whelped</SelectItem>
                    <SelectItem value="weaned">Weaned</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Whelping Counts (fill in after birth)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { key: "totalBorn", label: "Total Born" },
                { key: "liveMales", label: "Live Males" },
                { key: "liveFemales", label: "Live Females" },
                { key: "stillborn", label: "Stillborn" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-sm">{label}</Label>
                  <Input type="number" min="0" value={(litter as any)[key]} onChange={e => setL(key, e.target.value)} />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Any additional notes…" value={litter.notes} onChange={e => setL("notes", e.target.value)} rows={2} />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => {
                if (!litter.damId) { toast({ title: "Please select a dam", variant: "destructive" }); return; }
                setStep(1);
              }}>
                Next: Parent Health →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Parent Health ──────────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-green-600" /> Parent Health Records
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Add or review DNA tests, hip scores, elbow scores, and other health certificates for both parents. These are stored on the dog's permanent record.
            </p>

            <HealthSection
              dogId={litter.damId ? parseInt(litter.damId) : null}
              dogName={damDog?.registeredName ?? ""}
              label="Dam"
            />

            <Separator />

            <HealthSection
              dogId={litter.sireId ? parseInt(litter.sireId) : null}
              dogName={sireDog?.registeredName ?? ""}
              label="Sire"
            />

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>← Back</Button>
              <Button onClick={() => setStep(2)}>Next: Add Puppies →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Puppies ───────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Baby className="h-4 w-4 text-primary" /> Puppies ({puppies.length})
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setPuppies(ps => [...ps, newPuppy()])}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Puppy
              </Button>
            </CardHeader>
          </Card>

          {puppies.map((p, idx) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold">Puppy #{idx + 1}</CardTitle>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removePuppy(p.id)} disabled={puppies.length === 1}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Sex *</Label>
                  <Select value={p.sex} onValueChange={v => updatePuppy(p.id, "sex", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male ♂</SelectItem>
                      <SelectItem value="female">Female ♀</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Collar Colour</Label>
                  <Select value={p.collarColour} onValueChange={v => updatePuppy(p.id, "collarColour", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {COLLAR_COLOURS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Coat Colour</Label>
                  <Input placeholder="e.g. Golden" value={p.colour} onChange={e => updatePuppy(p.id, "colour", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Markings</Label>
                  <Input placeholder="e.g. White blaze" value={p.markings} onChange={e => updatePuppy(p.id, "markings", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Birth Weight (g)</Label>
                  <Input type="number" min="0" placeholder="e.g. 420" value={p.birthWeight} onChange={e => updatePuppy(p.id, "birthWeight", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Birth Time</Label>
                  <Input type="time" value={p.birthTime} onChange={e => updatePuppy(p.id, "birthTime", e.target.value)} />
                </div>
                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Input placeholder="Any notes for this puppy…" value={p.notes} onChange={e => updatePuppy(p.id, "notes", e.target.value)} />
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
            <Button
              onClick={handleFinish}
              disabled={createLitter.isPending || createPuppy.isPending}
            >
              {createLitter.isPending || createPuppy.isPending ? "Creating…" : "Create Litter"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
