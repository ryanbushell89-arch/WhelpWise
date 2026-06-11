import { useState } from "react";
import { useLocation } from "wouter";
import { useListDogs, useCreateBreeding } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, HeartPulse, FlaskConical, Stethoscope } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function NewBreeding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: dogs } = useListDogs({});
  const createBreeding = useCreateBreeding();

  const [form, setForm] = useState({
    damId: "",
    sireId: "",
    date: "",
    method: "natural",
    tieDuration: "",
    notes: "",
    ultrasoundDate: "",
    ultrasoundCompleted: false,
    ultrasoundNotes: "",
    xrayDate: "",
    xrayCompleted: false,
    xrayPuppyCount: "",
    xrayNotes: "",
  });

  const females = (dogs as any[] | undefined)?.filter(d => d.sex === "female") ?? [];
  const males = (dogs as any[] | undefined)?.filter(d => d.sex === "male") ?? [];

  function set(key: string, val: string | boolean) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.damId || !form.sireId || !form.date) {
      toast({ title: "Missing required fields", description: "Dam, Sire, and Date are required.", variant: "destructive" });
      return;
    }
    try {
      const body: any = {
        damId: parseInt(form.damId),
        sireId: parseInt(form.sireId),
        date: form.date,
        method: form.method,
        tieDuration: form.tieDuration ? parseInt(form.tieDuration) : null,
        notes: form.notes || null,
        ultrasoundDate: form.ultrasoundDate || null,
        ultrasoundCompleted: form.ultrasoundCompleted,
        ultrasoundNotes: form.ultrasoundNotes || null,
        xrayDate: form.xrayDate || null,
        xrayCompleted: form.xrayCompleted,
        xrayPuppyCount: form.xrayPuppyCount ? parseInt(form.xrayPuppyCount) : null,
        xrayNotes: form.xrayNotes || null,
      };
      const result = await createBreeding.mutateAsync({ data: body });
      toast({ title: "Breeding recorded" });
      navigate(`/breedings/${(result as any).id}`);
    } catch {
      toast({ title: "Error saving breeding", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/breedings"><ArrowLeft className="h-4 w-4 mr-1" /> Breedings</Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold font-serif">Record Breeding</h1>
        <p className="text-muted-foreground mt-1">Log the breeding event and track pregnancy milestones.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Breeding Basics ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="h-4 w-4 text-rose-500" /> Breeding Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Dam (Female) *</Label>
              <Select value={form.damId} onValueChange={v => set("damId", v)}>
                <SelectTrigger><SelectValue placeholder="Select dam…" /></SelectTrigger>
                <SelectContent>
                  {females.map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.registeredName} "{d.callName}"</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sire (Male) *</Label>
              <Select value={form.sireId} onValueChange={v => set("sireId", v)}>
                <SelectTrigger><SelectValue placeholder="Select sire…" /></SelectTrigger>
                <SelectContent>
                  {males.map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.registeredName} "{d.callName}"</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Breeding Date *</Label>
              <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={form.method} onValueChange={v => set("method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Natural</SelectItem>
                  <SelectItem value="ai">Artificial Insemination (AI)</SelectItem>
                  <SelectItem value="surgical_ai">Surgical AI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tie Duration (minutes)</Label>
              <Input type="number" min="0" placeholder="e.g. 25" value={form.tieDuration} onChange={e => set("tieDuration", e.target.value)} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Any notes about this breeding…" value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* ── Ultrasound ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4 text-blue-500" /> Ultrasound
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                id="us-done"
                checked={form.ultrasoundCompleted}
                onCheckedChange={v => set("ultrasoundCompleted", v)}
              />
              <Label htmlFor="us-done" className="cursor-pointer font-medium">
                Ultrasound completed
              </Label>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ultrasound Date</Label>
                <Input type="date" value={form.ultrasoundDate} onChange={e => set("ultrasoundDate", e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Ultrasound Notes</Label>
                <Textarea placeholder="Puppy count seen, vet details, etc." value={form.ultrasoundNotes} onChange={e => set("ultrasoundNotes", e.target.value)} rows={2} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── X-ray ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4 text-amber-500" /> X-ray
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                id="xray-done"
                checked={form.xrayCompleted}
                onCheckedChange={v => set("xrayCompleted", v)}
              />
              <Label htmlFor="xray-done" className="cursor-pointer font-medium">
                X-ray completed
              </Label>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>X-ray Date</Label>
                <Input type="date" value={form.xrayDate} onChange={e => set("xrayDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Puppies seen on X-ray</Label>
                <Input type="number" min="0" placeholder="e.g. 6" value={form.xrayPuppyCount} onChange={e => set("xrayPuppyCount", e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>X-ray Notes</Label>
                <Textarea placeholder="Puppy positions, vet notes, etc." value={form.xrayNotes} onChange={e => set("xrayNotes", e.target.value)} rows={2} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" asChild><Link href="/breedings">Cancel</Link></Button>
          <Button type="submit" disabled={createBreeding.isPending}>
            {createBreeding.isPending ? "Saving…" : "Record Breeding"}
          </Button>
        </div>
      </form>
    </div>
  );
}
