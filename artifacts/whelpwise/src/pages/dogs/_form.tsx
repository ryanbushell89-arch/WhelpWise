import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  useListBreeds, useCreateDog, useUpdateDog, useSavePedigree,
} from "@workspace/api-client-react";
import type { PedigreeInput } from "@workspace/api-client-react";
import { AKC_ALL_BREEDS } from "@/data/akc-breeds";
import { useUpload } from "@workspace/object-storage-web";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Camera, ChevronsUpDown, Check, Dog as DogIcon, Loader2, X, Link2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DogFormValues {
  registeredName: string;
  callName: string;
  sex: string;
  breedName: string;
  dob: string;
  colour: string;
  microchip: string;
  registrationNumber: string;
  visibility: string;
  status: string;
  photoUrl: string;
}

const empty: DogFormValues = {
  registeredName: "",
  callName: "",
  sex: "male",
  breedName: "",
  dob: "",
  colour: "",
  microchip: "",
  registrationNumber: "",
  visibility: "private",
  status: "active",
  photoUrl: "",
};

export function dogToFormValues(dog: any): DogFormValues {
  return {
    registeredName: dog.registeredName ?? "",
    callName: dog.callName ?? "",
    sex: dog.sex ?? "male",
    breedName: dog.breedName ?? "",
    dob: dog.dob ?? "",
    colour: dog.colour ?? "",
    microchip: dog.microchip ?? "",
    registrationNumber: dog.registrationNumber ?? "",
    visibility: dog.visibility ?? "private",
    status: dog.status ?? "active",
    photoUrl: dog.photoUrl ?? "",
  };
}

// ─── Pedigree types ───────────────────────────────────────────────────────────

type AncestorKey =
  | "sire" | "dam"
  | "sireSire" | "sireDam" | "damSire" | "damDam"
  | "sireSireSire" | "sireSireDam" | "sireDamSire" | "sireDamDam"
  | "damSireSire" | "damSireDam" | "damDamSire" | "damDamDam";

interface AncestorEntry {
  registeredName: string;
  registrationNumber: string;
  colour: string;
  linkedId?: number;
}

const emptyAncestor = (): AncestorEntry => ({ registeredName: "", registrationNumber: "", colour: "" });

type PedigreeState = Record<AncestorKey, AncestorEntry>;

const emptyPedigree = (): PedigreeState => ({
  sire: emptyAncestor(), dam: emptyAncestor(),
  sireSire: emptyAncestor(), sireDam: emptyAncestor(),
  damSire: emptyAncestor(), damDam: emptyAncestor(),
  sireSireSire: emptyAncestor(), sireSireDam: emptyAncestor(),
  sireDamSire: emptyAncestor(), sireDamDam: emptyAncestor(),
  damSireSire: emptyAncestor(), damSireDam: emptyAncestor(),
  damDamSire: emptyAncestor(), damDamDam: emptyAncestor(),
});

function buildPedigreePayload(pedigree: PedigreeState): PedigreeInput {
  const payload: PedigreeInput = {};
  (Object.keys(pedigree) as AncestorKey[]).forEach(key => {
    const e = pedigree[key];
    if (e.registeredName.trim() || e.registrationNumber.trim()) {
      (payload as any)[key] = {
        registeredName: e.registeredName.trim() || null,
        registrationNumber: e.registrationNumber.trim() || null,
        colour: e.colour.trim() || null,
      };
    }
  });
  return payload;
}

// ─── Ancestor input sub-component ────────────────────────────────────────────

function AncestorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AncestorEntry;
  onChange: (v: AncestorEntry) => void;
}) {
  const [looking, setLooking] = useState(false);

  async function onRegBlur() {
    const reg = value.registrationNumber.trim();
    if (!reg || value.linkedId) return;
    setLooking(true);
    try {
      const res = await fetch(`/api/dogs/lookup-by-reg?reg=${encodeURIComponent(reg)}`);
      if (res.ok) {
        const dog = await res.json();
        onChange({
          ...value,
          registeredName: dog.registeredName ?? value.registeredName,
          colour: dog.colour ?? value.colour,
          linkedId: dog.id,
        });
      }
    } catch { /* ignore network errors */ } finally {
      setLooking(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
      <div className="flex items-center justify-between min-h-5">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        {value.linkedId && (
          <Badge variant="secondary" className="text-xs gap-1 h-5">
            <Link2 className="h-3 w-3" /> Linked
          </Badge>
        )}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Registration Number</Label>
        <div className="relative">
          <Input
            className="font-mono text-sm pr-8"
            placeholder="e.g. 2100123456"
            value={value.registrationNumber}
            onChange={e => onChange({ ...value, registrationNumber: e.target.value, linkedId: undefined })}
            onBlur={onRegBlur}
          />
          {looking && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Registered Name</Label>
        <Input
          placeholder="e.g. Goldenridge Perfect Storm"
          value={value.registeredName}
          onChange={e => onChange({ ...value, registeredName: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Colour</Label>
        <Input
          placeholder="e.g. Light Golden"
          value={value.colour}
          onChange={e => onChange({ ...value, colour: e.target.value })}
        />
      </div>
    </div>
  );
}

// ─── Photo upload sub-component ───────────────────────────────────────────────

function PhotoField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
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
          <img src={value} alt="Dog photo" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <DogIcon className="h-10 w-10 opacity-30" />
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
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
      {value && (
        <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => onChange("")}>
          <X className="h-3 w-3 mr-1" /> Remove photo
        </Button>
      )}
    </div>
  );
}

// ─── Searchable breed combobox ────────────────────────────────────────────────

function BreedCombobox({ value, onChange }: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open}
          className="w-full justify-between font-normal text-sm h-9">
          <span className="truncate text-left">
            {value ? value : <span className="text-muted-foreground">— Unknown / Mixed —</span>}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search breed…" className="h-9" />
          <CommandList>
            <CommandEmpty>No breed found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="none" onSelect={() => { onChange(""); setOpen(false); }}>
                <Check className={cn("mr-2 h-3.5 w-3.5", !value ? "opacity-100" : "opacity-0")} />
                — Unknown / Mixed —
              </CommandItem>
            </CommandGroup>
            <CommandGroup>
              {AKC_ALL_BREEDS.map(b => (
                <CommandItem key={b.name} value={b.name} onSelect={() => { onChange(b.name); setOpen(false); }}>
                  <Check className={cn("mr-2 h-3.5 w-3.5", b.name === value ? "opacity-100" : "opacity-0")} />
                  {b.name}
                  <span className="ml-auto text-xs text-muted-foreground">{b.group}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function DogForm({
  initialValues = empty,
  mode,
  dogId,
}: {
  initialValues?: DogFormValues;
  mode: "create" | "edit";
  dogId?: number;
}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<DogFormValues>(initialValues);
  const [pedigree, setPedigree] = useState<PedigreeState>(emptyPedigree);

  const { data: breeds } = useListBreeds();
  const createDog = useCreateDog();
  const updateDog = useUpdateDog();
  const savePedigree = useSavePedigree();

  const breedList = (breeds as any[] | undefined) ?? [];

  function set(key: keyof DogFormValues, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function setAncestor(key: AncestorKey, val: AncestorEntry) {
    setPedigree(p => ({ ...p, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.registeredName.trim() || !form.callName.trim() || !form.sex || !form.visibility) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const body: any = {
      registeredName: form.registeredName.trim(),
      callName: form.callName.trim(),
      sex: form.sex,
      breedId: form.breedName ? (breedList.find((b: any) => b.name === form.breedName)?.id ?? null) : null,
      dob: form.dob || null,
      colour: form.colour.trim() || null,
      microchip: form.microchip.trim() || null,
      registrationNumber: form.registrationNumber.trim() || null,
      visibility: form.visibility,
      photoUrl: form.photoUrl || null,
    };

    if (mode === "create") {
      body.isOwned = true;
      body.addToKennel = true;
    }

    try {
      let resolvedDogId: number;

      if (mode === "create") {
        const result = await createDog.mutateAsync({ data: body });
        resolvedDogId = (result as any).id;
      } else {
        const updateBody = { ...body, status: form.status };
        await updateDog.mutateAsync({ dogId: dogId!, data: updateBody });
        resolvedDogId = dogId!;
      }

      const pedigreePayload = buildPedigreePayload(pedigree);
      if (Object.keys(pedigreePayload).length > 0) {
        try {
          await savePedigree.mutateAsync({ dogId: resolvedDogId, data: pedigreePayload });
        } catch (pedigreeErr) {
          const desc = pedigreeErr instanceof Error ? pedigreeErr.message : undefined;
          toast({
            title: "Dog saved, but pedigree could not be saved",
            description: desc,
            variant: "destructive",
          });
          navigate(`/dogs/${resolvedDogId}`);
          return;
        }
      }

      toast({ title: mode === "create" ? "Dog added to My Kennel" : "Dog updated successfully" });
      navigate(`/dogs/${resolvedDogId}`);
    } catch (err) {
      const description = err instanceof Error ? err.message : undefined;
      toast({ title: mode === "create" ? "Failed to add dog" : "Failed to update dog", description, variant: "destructive" });
    }
  }

  const isPending = createDog.isPending || updateDog.isPending || savePedigree.isPending;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={mode === "edit" && dogId ? `/dogs/${dogId}` : "/dogs"}>
          <ArrowLeft className="h-4 w-4 mr-1" />{mode === "edit" ? "Back to Dog" : "Dogs"}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-serif">
          {mode === "create" ? "Add New Dog" : "Edit Dog"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {mode === "create"
            ? "Add a dog to your kennel. Enter pedigree ancestors below to build the 3-generation family tree."
            : "Update this dog's details."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo */}
        <div className="flex justify-center">
          <PhotoField value={form.photoUrl} onChange={v => set("photoUrl", v)} />
        </div>

        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Registered Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Goldenridge Perfect Storm" value={form.registeredName}
                onChange={e => set("registeredName", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Call Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Storm" value={form.callName}
                onChange={e => set("callName", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sex <span className="text-destructive">*</span></Label>
              <Select value={form.sex} onValueChange={v => set("sex", v)}>
                <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Breed</Label>
              <BreedCombobox value={form.breedName} onChange={v => set("breedName", v)} />
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Date of Birth</Label>
              <Input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Colour / Coat</Label>
              <Input placeholder="e.g. Light Golden" value={form.colour}
                onChange={e => set("colour", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Microchip Number</Label>
              <Input className="font-mono" placeholder="e.g. 985112345678900" value={form.microchip}
                onChange={e => set("microchip", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Registration Number</Label>
              <Input className="font-mono" placeholder="e.g. 2100123456" value={form.registrationNumber}
                onChange={e => set("registrationNumber", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Pedigree — Generation 1 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pedigree — Parents</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter a registration number and tab away to auto-link an existing record.
              Ancestors are saved to the global pedigree database only, not your kennel.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AncestorInput label="Sire (Father)" value={pedigree.sire} onChange={v => setAncestor("sire", v)} />
            <AncestorInput label="Dam (Mother)" value={pedigree.dam} onChange={v => setAncestor("dam", v)} />
          </CardContent>
        </Card>

        {/* Pedigree — Generation 2 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pedigree — Grandparents</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AncestorInput label="Sire's Sire" value={pedigree.sireSire} onChange={v => setAncestor("sireSire", v)} />
            <AncestorInput label="Sire's Dam" value={pedigree.sireDam} onChange={v => setAncestor("sireDam", v)} />
            <AncestorInput label="Dam's Sire" value={pedigree.damSire} onChange={v => setAncestor("damSire", v)} />
            <AncestorInput label="Dam's Dam" value={pedigree.damDam} onChange={v => setAncestor("damDam", v)} />
          </CardContent>
        </Card>

        {/* Pedigree — Generation 3 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pedigree — Great-Grandparents</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AncestorInput label="Sire's Sire's Sire" value={pedigree.sireSireSire} onChange={v => setAncestor("sireSireSire", v)} />
            <AncestorInput label="Sire's Sire's Dam" value={pedigree.sireSireDam} onChange={v => setAncestor("sireSireDam", v)} />
            <AncestorInput label="Sire's Dam's Sire" value={pedigree.sireDamSire} onChange={v => setAncestor("sireDamSire", v)} />
            <AncestorInput label="Sire's Dam's Dam" value={pedigree.sireDamDam} onChange={v => setAncestor("sireDamDam", v)} />
            <AncestorInput label="Dam's Sire's Sire" value={pedigree.damSireSire} onChange={v => setAncestor("damSireSire", v)} />
            <AncestorInput label="Dam's Sire's Dam" value={pedigree.damSireDam} onChange={v => setAncestor("damSireDam", v)} />
            <AncestorInput label="Dam's Dam's Sire" value={pedigree.damDamSire} onChange={v => setAncestor("damDamSire", v)} />
            <AncestorInput label="Dam's Dam's Dam" value={pedigree.damDamDam} onChange={v => setAncestor("damDamDam", v)} />
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Settings</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Visibility <span className="text-destructive">*</span></Label>
              <Select value={form.visibility} onValueChange={v => set("visibility", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private — kennel only</SelectItem>
                  <SelectItem value="public">Public — visible in directory</SelectItem>
                  <SelectItem value="stud">Stud — listed in stud directory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "edit" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                    <SelectItem value="deceased">Deceased</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" asChild>
            <Link href={mode === "edit" && dogId ? `/dogs/${dogId}` : "/dogs"}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "create" ? "Add Dog" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
