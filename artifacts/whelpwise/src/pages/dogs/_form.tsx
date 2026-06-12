import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  useListBreeds, useCreateDog, useUpdateDog,
} from "@workspace/api-client-react";
import { AKC_ALL_BREEDS } from "@/data/akc-breeds";
import { useUpload } from "@workspace/object-storage-web";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Camera, ChevronsUpDown, Check, Dog as DogIcon, Loader2, X } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ParentPicker, type ParentSelection } from "@/components/ParentPicker";

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
  initialSire,
  initialDam,
  mode,
  dogId,
}: {
  initialValues?: DogFormValues;
  initialSire?: ParentSelection;
  initialDam?: ParentSelection;
  mode: "create" | "edit";
  dogId?: number;
}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<DogFormValues>(initialValues);
  const [sireSelection, setSireSelection] = useState<ParentSelection>(initialSire ?? { mode: "none" });
  const [damSelection, setDamSelection] = useState<ParentSelection>(initialDam ?? { mode: "none" });
  const [ownedByUser, setOwnedByUser] = useState<"yes" | "no">("yes");
  const [addToKennel, setAddToKennel] = useState(true);

  const { data: breeds } = useListBreeds();
  const createDog = useCreateDog();
  const updateDog = useUpdateDog();

  const breedList = (breeds as any[] | undefined) ?? [];

  function set(key: keyof DogFormValues, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.registeredName.trim() || !form.callName.trim() || !form.sex || !form.visibility) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    // Manual parent entries require at least a registered name to create a stub record
    if (sireSelection.mode === "manual" && !sireSelection.details.registeredName.trim()) {
      toast({ title: "Please enter a registered name for the Sire, or clear the sire field", variant: "destructive" });
      return;
    }
    if (damSelection.mode === "manual" && !damSelection.details.registeredName.trim()) {
      toast({ title: "Please enter a registered name for the Dam, or clear the dam field", variant: "destructive" });
      return;
    }

    // Prevent selecting the same dog as both sire and dam
    if (sireSelection.mode === "known" && damSelection.mode === "known" && sireSelection.dogId === damSelection.dogId) {
      toast({ title: "The same dog cannot be both Sire and Dam", variant: "destructive" });
      return;
    }

    // Prevent a dog being its own parent in edit mode
    if (dogId) {
      if (sireSelection.mode === "known" && sireSelection.dogId === dogId) {
        toast({ title: "A dog cannot be its own Sire", variant: "destructive" });
        return;
      }
      if (damSelection.mode === "known" && damSelection.dogId === dogId) {
        toast({ title: "A dog cannot be its own Dam", variant: "destructive" });
        return;
      }
    }

    // Build sire/dam payload from selections
    const sirePayload = buildSirePayload(sireSelection, breedList);
    const damPayload = buildDamPayload(damSelection, breedList);

    const isOwned = ownedByUser === "yes";
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
      ...sirePayload,
      ...damPayload,
    };

    if (mode === "create") {
      body.isOwned = isOwned;
      body.addToKennel = isOwned ? addToKennel : false;
    }

    try {
      if (mode === "create") {
        const result = await createDog.mutateAsync({ data: body });
        const kennelMsg = isOwned && addToKennel ? " and added to My Kennel" : "";
        toast({ title: `Dog added successfully${kennelMsg}` });
        navigate(`/dogs/${(result as any).id}`);
      } else if (dogId) {
        const updateBody = { ...body, status: form.status };
        delete updateBody.sire;
        delete updateBody.dam;
        await updateDog.mutateAsync({ dogId, data: updateBody });
        toast({ title: "Dog updated successfully" });
        navigate(`/dogs/${dogId}`);
      }
    } catch (err) {
      const description = err instanceof Error ? err.message : undefined;
      toast({ title: mode === "create" ? "Failed to add dog" : "Failed to update dog", description, variant: "destructive" });
    }
  }

  const isPending = createDog.isPending || updateDog.isPending;

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
            ? ownedByUser === "yes"
              ? addToKennel ? "Add a dog to your kennel and pedigree database." : "Add a dog you own to the pedigree database."
              : "Add a dog to the pedigree database for registration number lookups."
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

        {/* Parents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Parents</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Search your kennel for existing dogs, or enter details manually. If a registration number
              matches an existing record, pedigree will auto-populate.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Sire (Father)</Label>
              <ParentPicker
                label="Sire (Father)"
                sex="male"
                value={sireSelection}
                onChange={setSireSelection}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Dam (Mother)</Label>
              <ParentPicker
                label="Dam (Mother)"
                sex="female"
                value={damSelection}
                onChange={setDamSelection}
              />
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Settings</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Ownership — create mode only */}
            {mode === "create" && (
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Is this dog owned by you? <span className="text-destructive">*</span></Label>
                <Select value={ownedByUser} onValueChange={v => setOwnedByUser(v as "yes" | "no")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes — I own this dog</SelectItem>
                    <SelectItem value="no">No — adding for pedigree record only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {ownedByUser === "no"
                    ? "The dog will be saved to the pedigree database and is findable by registration number, but will not appear in My Kennel."
                    : "The dog will be saved with you as the owner."}
                </p>
              </div>
            )}

            {/* Add to kennel — only when owned, create mode */}
            {mode === "create" && ownedByUser === "yes" && (
              <div className="sm:col-span-2 rounded-lg border p-3 flex items-start gap-3">
                <Checkbox
                  id="add-to-kennel"
                  checked={addToKennel}
                  onCheckedChange={checked => setAddToKennel(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <label htmlFor="add-to-kennel" className="text-sm font-medium cursor-pointer select-none">
                    Add to My Kennel
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {addToKennel
                      ? "This dog will appear in your My Kennel section."
                      : "The dog will be saved to the pedigree database but hidden from My Kennel."}
                  </p>
                </div>
              </div>
            )}

            {/* Visibility — only relevant when dog is in kennel */}
            {(mode === "edit" || (ownedByUser === "yes" && addToKennel)) && (
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
            )}

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

// ─── Helpers: convert ParentSelection to API body fields ─────────────────────

function buildParentDetails(
  d: import("@/components/ParentPicker").ManualParentDetails,
  breedList: { id: number; name: string }[],
) {
  const matchedBreed = d.breedName ? breedList.find(b => b.name === d.breedName) : null;
  return {
    registeredName: d.registeredName.trim() || undefined,
    callName: d.callName.trim() || undefined,
    registrationNumber: d.registrationNumber.trim() || undefined,
    microchip: d.microchip.trim() || undefined,
    sex: d.sex || undefined,
    breedId: matchedBreed?.id ?? undefined,
    dob: d.dob || undefined,
    colour: d.colour.trim() || undefined,
  };
}

function buildSirePayload(sel: ParentSelection, breedList: { id: number; name: string }[]): Record<string, unknown> {
  if (sel.mode === "none") return { sireId: null };
  if (sel.mode === "known") return { sireId: sel.dogId };
  if (sel.matchedId) return { sireId: sel.matchedId };
  return { sire: buildParentDetails(sel.details, breedList) };
}

function buildDamPayload(sel: ParentSelection, breedList: { id: number; name: string }[]): Record<string, unknown> {
  if (sel.mode === "none") return { damId: null };
  if (sel.mode === "known") return { damId: sel.dogId };
  if (sel.matchedId) return { damId: sel.matchedId };
  return { dam: buildParentDetails(sel.details, breedList) };
}
