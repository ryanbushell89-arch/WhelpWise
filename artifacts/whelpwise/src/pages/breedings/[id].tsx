import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetBreeding, useGetPregnancy, useUpdateBreeding } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, CheckCircle2, Circle, Stethoscope, FlaskConical, Edit, X, Save } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function BreedingDetail() {
  const [, params] = useRoute("/breedings/:id");
  const breedingId = parseInt(params?.id ?? "0", 10);
  const { toast } = useToast();

  const { data: breeding, isLoading, refetch } = useGetBreeding(breedingId);
  const { data: pregnancy } = useGetPregnancy(breedingId);
  const updateBreeding = useUpdateBreeding();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);

  function startEdit() {
    if (!breeding) return;
    setForm({
      ultrasoundDate: (breeding as any).ultrasoundDate ?? "",
      ultrasoundCompleted: (breeding as any).ultrasoundCompleted ?? false,
      ultrasoundNotes: (breeding as any).ultrasoundNotes ?? "",
      xrayDate: (breeding as any).xrayDate ?? "",
      xrayCompleted: (breeding as any).xrayCompleted ?? false,
      xrayPuppyCount: (breeding as any).xrayPuppyCount != null ? String((breeding as any).xrayPuppyCount) : "",
      xrayNotes: (breeding as any).xrayNotes ?? "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!form) return;
    try {
      await updateBreeding.mutateAsync({
        breedingId,
        data: {
          ultrasoundDate: form.ultrasoundDate || null,
          ultrasoundCompleted: form.ultrasoundCompleted,
          ultrasoundNotes: form.ultrasoundNotes || null,
          xrayDate: form.xrayDate || null,
          xrayCompleted: form.xrayCompleted,
          xrayPuppyCount: form.xrayPuppyCount ? parseInt(form.xrayPuppyCount) : null,
          xrayNotes: form.xrayNotes || null,
        },
      });
      await refetch();
      setEditing(false);
      toast({ title: "Breeding updated" });
    } catch {
      toast({ title: "Error updating breeding", variant: "destructive" });
    }
  }

  if (isLoading) return <div className="p-8"><Skeleton className="h-48 w-full rounded-xl" /></div>;
  if (!breeding) return <div className="p-8 text-muted-foreground">Breeding not found.</div>;

  const b = breeding as any;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/breedings"><ArrowLeft className="h-4 w-4 mr-1" /> Breedings</Link>
      </Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-serif">{b.damName} × {b.sireName}</h1>
          <p className="text-muted-foreground mt-1">
            {b.date ? format(new Date(b.date), "d MMMM yyyy") : ""} · <span className="capitalize">{b.method?.replace("_", " ")}</span>
          </p>
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Edit className="h-4 w-4 mr-1" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={saveEdit} disabled={updateBreeding.isPending}>
              <Save className="h-4 w-4 mr-1" /> {updateBreeding.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Breeding Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Breeding Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Date" value={b.date ? format(new Date(b.date), "d MMM yyyy") : null} />
            <Row label="Method" value={<span className="capitalize">{b.method?.replace("_", " ")}</span>} />
            <Row label="Tie Duration" value={b.tieDuration ? `${b.tieDuration} minutes` : null} />
            {b.notes && <div className="mt-2 text-muted-foreground pt-2 border-t">{b.notes}</div>}
          </CardContent>
        </Card>

        {/* Pregnancy Tracker */}
        {pregnancy && (
          <Card>
            <CardHeader><CardTitle className="text-base">Pregnancy Tracker</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days Pregnant</span>
                <span className="font-bold text-lg text-primary">{(pregnancy as any).daysPregnant}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-1">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.min(100, ((pregnancy as any).daysPregnant / 63) * 100)}%` }} />
              </div>
              <Row label="Expected Whelp" value={(pregnancy as any).expectedWhelpDate ? format(new Date((pregnancy as any).expectedWhelpDate), "d MMM yyyy") : null} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Ultrasound */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Stethoscope className="h-4 w-4 text-blue-500" />
          <CardTitle className="text-base">Ultrasound</CardTitle>
          {!editing && (
            <Badge variant={b.ultrasoundCompleted ? "secondary" : "outline"} className="ml-auto text-xs">
              {b.ultrasoundCompleted ? "✓ Completed" : "Pending"}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="us-edit"
                  checked={form.ultrasoundCompleted}
                  onCheckedChange={v => setForm((f: any) => ({ ...f, ultrasoundCompleted: v }))}
                />
                <Label htmlFor="us-edit" className="cursor-pointer">Completed</Label>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={form.ultrasoundDate} onChange={e => setForm((f: any) => ({ ...f, ultrasoundDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.ultrasoundNotes} onChange={e => setForm((f: any) => ({ ...f, ultrasoundNotes: e.target.value }))} placeholder="Puppy count, vet details…" />
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {b.ultrasoundDate && <Row label="Date" value={format(new Date(b.ultrasoundDate), "d MMM yyyy")} />}
              {b.ultrasoundNotes && <p className="text-muted-foreground">{b.ultrasoundNotes}</p>}
              {!b.ultrasoundDate && !b.ultrasoundNotes && (
                <p className="text-muted-foreground italic text-sm">No ultrasound details recorded. Click Edit to add.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* X-ray */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <FlaskConical className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-base">X-ray</CardTitle>
          {!editing && (
            <Badge variant={b.xrayCompleted ? "secondary" : "outline"} className="ml-auto text-xs">
              {b.xrayCompleted ? "✓ Completed" : "Pending"}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="xray-edit"
                  checked={form.xrayCompleted}
                  onCheckedChange={v => setForm((f: any) => ({ ...f, xrayCompleted: v }))}
                />
                <Label htmlFor="xray-edit" className="cursor-pointer">Completed</Label>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={form.xrayDate} onChange={e => setForm((f: any) => ({ ...f, xrayDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Puppies seen on X-ray</Label>
                  <Input type="number" min="0" value={form.xrayPuppyCount} onChange={e => setForm((f: any) => ({ ...f, xrayPuppyCount: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.xrayNotes} onChange={e => setForm((f: any) => ({ ...f, xrayNotes: e.target.value }))} placeholder="Puppy positions, vet notes…" />
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {b.xrayDate && <Row label="Date" value={format(new Date(b.xrayDate), "d MMM yyyy")} />}
              {b.xrayPuppyCount != null && <Row label="Puppies on X-ray" value={String(b.xrayPuppyCount)} />}
              {b.xrayNotes && <p className="text-muted-foreground">{b.xrayNotes}</p>}
              {!b.xrayDate && !b.xrayPuppyCount && !b.xrayNotes && (
                <p className="text-muted-foreground italic text-sm">No X-ray details recorded. Click Edit to add.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pregnancy Milestones */}
      {(pregnancy as any)?.milestones && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pregnancy Milestones</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(pregnancy as any).milestones.map((m: any) => (
                <div key={m.day} className="flex items-center gap-3">
                  {m.completed
                    ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    : <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />}
                  <div className="flex-1">
                    <div className={`font-medium text-sm ${m.completed ? "" : "text-muted-foreground"}`}>
                      Day {m.day}: {m.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{m.date ? format(new Date(m.date), "d MMM yyyy") : ""}</div>
                  </div>
                  <Badge variant={m.completed ? "secondary" : "outline"} className="text-xs">
                    {m.completed ? "Done" : "Upcoming"}
                  </Badge>
                </div>
              ))}
            </div>
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
