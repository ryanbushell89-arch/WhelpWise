import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useCreatePet, useUpdatePet } from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Camera, PawPrint, Loader2, X } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export const SPECIES_OPTIONS = [
  { value: "dog",        label: "Dog",         emoji: "🐕" },
  { value: "cat",        label: "Cat",         emoji: "🐈" },
  { value: "rabbit",     label: "Rabbit",      emoji: "🐰" },
  { value: "guinea_pig", label: "Guinea Pig",  emoji: "🐹" },
  { value: "bird",       label: "Bird",        emoji: "🐦" },
  { value: "fish",       label: "Fish",        emoji: "🐟" },
  { value: "reptile",    label: "Reptile",     emoji: "🦎" },
  { value: "horse",      label: "Horse",       emoji: "🐴" },
  { value: "other",      label: "Other",       emoji: "🐾" },
];

export function speciesLabel(species: string) {
  return SPECIES_OPTIONS.find(s => s.value === species)?.label ?? species;
}

export function speciesEmoji(species: string) {
  return SPECIES_OPTIONS.find(s => s.value === species)?.emoji ?? "🐾";
}

export interface PetFormValues {
  name: string;
  species: string;
  breed: string;
  sex: string;
  dob: string;
  colour: string;
  microchip: string;
  vetName: string;
  vetPhone: string;
  notes: string;
  photoUrl: string;
  status: string;
}

const empty: PetFormValues = {
  name: "", species: "dog", breed: "", sex: "", dob: "",
  colour: "", microchip: "", vetName: "", vetPhone: "",
  notes: "", photoUrl: "", status: "alive",
};

export function petToFormValues(pet: any): PetFormValues {
  return {
    name: pet.name ?? "",
    species: pet.species ?? "dog",
    breed: pet.breed ?? "",
    sex: pet.sex ?? "",
    dob: pet.dob ?? "",
    colour: pet.colour ?? "",
    microchip: pet.microchip ?? "",
    vetName: pet.vetName ?? "",
    vetPhone: pet.vetPhone ?? "",
    notes: pet.notes ?? "",
    photoUrl: pet.photoUrl ?? "",
    status: pet.status ?? "alive",
  };
}

function PhotoField({ value, onChange, species }: { value: string; onChange: (url: string) => void; species: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (r) => onChange(`/api/storage${r.objectPath}`),
    onError: () => toast({ title: "Upload failed", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-36 h-36 md:w-44 md:h-44 rounded-xl bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        {value ? (
          <img src={value} alt="Pet photo" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <span className="text-4xl">{speciesEmoji(species)}</span>
            <span className="text-xs">Add photo</span>
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1.5">
          {isUploading ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> : <Camera className="h-3.5 w-3.5 text-white" />}
        </div>
        {isUploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-medium">{progress}%</span>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
      {value && (
        <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground h-7"
          onClick={() => onChange("")}>
          <X className="h-3 w-3 mr-1" /> Remove photo
        </Button>
      )}
    </div>
  );
}

export function PetForm({
  initialValues = empty,
  mode,
  petId,
}: {
  initialValues?: PetFormValues;
  mode: "create" | "edit";
  petId?: number;
}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<PetFormValues>(initialValues);

  const createPet = useCreatePet();
  const updatePet = useUpdatePet();

  function set(key: keyof PetFormValues, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Pet name is required", variant: "destructive" });
      return;
    }
    const body: any = {
      name: form.name.trim(),
      species: form.species,
      breed: form.breed.trim() || null,
      sex: form.sex || null,
      dob: form.dob || null,
      colour: form.colour.trim() || null,
      microchip: form.microchip.trim() || null,
      vetName: form.vetName.trim() || null,
      vetPhone: form.vetPhone.trim() || null,
      notes: form.notes.trim() || null,
      photoUrl: form.photoUrl || null,
      status: form.status,
    };

    try {
      if (mode === "create") {
        const result = await createPet.mutateAsync({ data: body });
        toast({ title: "Pet added" });
        navigate(`/pets/${(result as any).id}`);
      } else if (petId) {
        await updatePet.mutateAsync({ petId, data: body });
        toast({ title: "Pet updated" });
        navigate(`/pets/${petId}`);
      }
    } catch {
      toast({ title: mode === "create" ? "Failed to add pet" : "Failed to update pet", variant: "destructive" });
    }
  }

  const isPending = createPet.isPending || updatePet.isPending;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={mode === "edit" && petId ? `/pets/${petId}` : "/pets"}>
          <ArrowLeft className="h-4 w-4 mr-1" />{mode === "edit" ? "Back to Pet" : "Family Pets"}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-serif">
          {mode === "create" ? "Add Family Pet" : "Edit Pet"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {mode === "create" ? "Record a pet that's part of your family." : "Update this pet's details."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center">
          <PhotoField value={form.photoUrl} onChange={v => set("photoUrl", v)} species={form.species} />
        </div>

        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Biscuit" value={form.name}
                onChange={e => set("name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Species <span className="text-destructive">*</span></Label>
              <Select value={form.species} onValueChange={v => set("species", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPECIES_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.emoji} {s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sex</Label>
              <Select value={form.sex || "unknown"} onValueChange={v => set("sex", v === "unknown" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">— Unknown —</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Breed / Type</Label>
              <Input placeholder="e.g. Domestic Shorthair" value={form.breed}
                onChange={e => set("breed", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date of Birth</Label>
              <Input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Colour / Markings</Label>
              <Input placeholder="e.g. Tabby orange" value={form.colour}
                onChange={e => set("colour", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Microchip Number</Label>
              <Input className="font-mono" placeholder="e.g. 985112345678900" value={form.microchip}
                onChange={e => set("microchip", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Vet */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Vet Contact</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Vet / Clinic Name</Label>
              <Input placeholder="e.g. Countryside Vets" value={form.vetName}
                onChange={e => set("vetName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vet Phone</Label>
              <Input type="tel" placeholder="e.g. 01234 567890" value={form.vetPhone}
                onChange={e => set("vetPhone", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">General Notes</Label>
              <Textarea placeholder="Allergies, dietary needs, personality notes…" rows={3}
                value={form.notes} onChange={e => set("notes", e.target.value)} />
            </div>
            {mode === "edit" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alive">Alive</SelectItem>
                    <SelectItem value="deceased">Deceased</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" asChild>
            <Link href={mode === "edit" && petId ? `/pets/${petId}` : "/pets"}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "create" ? "Add Pet" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
