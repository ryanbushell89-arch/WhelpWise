import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Pencil, X, CheckCircle2, Loader2, Info,
} from "lucide-react";
import { AKC_ALL_BREEDS } from "@/data/akc-breeds";

// ─── Exported types ───────────────────────────────────────────────────────────

export interface ManualParentDetails {
  registeredName: string;
  callName: string;
  registrationNumber: string;
  microchip: string;
  sex: string;
  breedName: string;
  dob: string;
  colour: string;
}

export type ParentSelection =
  | { mode: "none" }
  | { mode: "known"; dogId: number; dogName: string; regNumber: string | null }
  | {
      mode: "manual";
      details: ManualParentDetails;
      matchedId?: number;
      matchedName?: string;
      ancestorCount?: number;
    };

const emptyManual: ManualParentDetails = {
  registeredName: "",
  callName: "",
  registrationNumber: "",
  microchip: "",
  sex: "",
  breedName: "",
  dob: "",
  colour: "",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ParentPickerProps {
  label: string;
  sex: "male" | "female";
  value: ParentSelection;
  onChange: (v: ParentSelection) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ParentPicker({ label, sex, value, onChange }: ParentPickerProps) {
  const [ui, setUi] = useState<"idle" | "searching" | "manual">(
    value.mode === "none" ? "idle"
    : value.mode === "known" ? "idle"
    : "manual",
  );
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [regLookupLoading, setRegLookupLoading] = useState(false);
  const [manual, setManual] = useState<ManualParentDetails>(
    value.mode === "manual" ? value.details : { ...emptyManual, sex },
  );
  const [match, setMatch] = useState<{ id: number; name: string; ancestorCount: number } | null>(
    value.mode === "manual" && value.matchedId
      ? { id: value.matchedId, name: value.matchedName ?? "", ancestorCount: value.ancestorCount ?? 0 }
      : null,
  );
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setUi(prev => prev === "searching" ? "idle" : prev);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Debounced kennel search
  const doSearch = useCallback((q: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dogs/lookup?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  function handleSearchChange(q: string) {
    setSearchQ(q);
    doSearch(q);
  }

  function selectKnownDog(dog: any) {
    onChange({ mode: "known", dogId: dog.id, dogName: dog.registeredName, regNumber: dog.registrationNumber ?? null });
    setUi("idle");
    setSearchQ("");
    setSearchResults([]);
  }

  // Registration number lookup on blur — links manual entry to an existing dog
  async function handleRegBlur() {
    const reg = manual.registrationNumber.trim();
    if (!reg) { setMatch(null); return; }
    setRegLookupLoading(true);
    try {
      const res = await fetch(`/api/dogs/lookup-by-reg?reg=${encodeURIComponent(reg)}`);
      if (res.ok) {
        const d = await res.json();
        const found = { id: d.id, name: d.registeredName, ancestorCount: d.ancestorCount ?? 0 };
        setMatch(found);
        onChange({ mode: "manual", details: manual, matchedId: found.id, matchedName: found.name, ancestorCount: found.ancestorCount });
      } else {
        setMatch(null);
        onChange({ mode: "manual", details: manual });
      }
    } catch {
      setMatch(null);
      onChange({ mode: "manual", details: manual });
    } finally {
      setRegLookupLoading(false);
    }
  }

  function setManualField(k: keyof ManualParentDetails, v: string) {
    const next = { ...manual, [k]: v };
    setManual(next);
    if (k !== "registrationNumber") {
      onChange({ mode: "manual", details: next, matchedId: match?.id, matchedName: match?.name, ancestorCount: match?.ancestorCount });
    }
    if (k === "registrationNumber") setMatch(null);
  }

  function clear() {
    onChange({ mode: "none" });
    setUi("idle");
    setSearchQ("");
    setSearchResults([]);
    setManual({ ...emptyManual, sex });
    setMatch(null);
  }

  function openManual() {
    const details = { ...emptyManual, sex };
    setManual(details);
    setMatch(null);
    setUi("manual");
    onChange({ mode: "manual", details });
  }

  // ─── Render: already selected (known dog from kennel) ────────────────────
  if (value.mode === "known") {
    return (
      <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          <p className="font-medium text-sm truncate">{value.dogName}</p>
          {value.regNumber && <p className="text-xs text-muted-foreground font-mono">{value.regNumber}</p>}
          <Badge variant="secondary" className="text-xs mt-1 gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600" /> From your kennel
          </Badge>
        </div>
        <Button type="button" variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={clear}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // ─── Render: manual entry form ───────────────────────────────────────────
  if (value.mode === "manual") {
    return (
      <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label} — Manual Entry</p>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={clear}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {match ? (
          <div className="flex items-start gap-2 text-xs bg-green-50 border border-green-200 text-green-800 rounded-md px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              <strong>Linked to:</strong> {match.name}
              {match.ancestorCount > 0 && ` — pedigree auto-populates ${match.ancestorCount} known ancestor${match.ancestorCount !== 1 ? "s" : ""}`}
            </span>
          </div>
        ) : (
          manual.registrationNumber.trim() && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Will be added as an external record
            </div>
          )
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Registered Name */}
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs">Registered Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Full registered name"
              value={manual.registeredName}
              onChange={e => setManualField("registeredName", e.target.value)}
            />
          </div>

          {/* Call Name */}
          <div className="space-y-1">
            <Label className="text-xs">Call Name</Label>
            <Input
              placeholder="e.g. Max"
              value={manual.callName}
              onChange={e => setManualField("callName", e.target.value)}
            />
          </div>

          {/* Sex — pre-filled but editable */}
          <div className="space-y-1">
            <Label className="text-xs">Sex</Label>
            <Select value={manual.sex || sex} onValueChange={v => setManualField("sex", v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Breed — sourced from AKC static list, always populated */}
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs">Breed</Label>
            <Select
              value={manual.breedName || "_none"}
              onValueChange={v => setManualField("breedName", v === "_none" ? "" : v)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="— Unknown / Mixed —" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="_none">— Unknown / Mixed —</SelectItem>
                {AKC_ALL_BREEDS.map(b => (
                  <SelectItem key={b.name} value={b.name}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Registration Number — triggers kennel lookup on blur */}
          <div className="space-y-1">
            <Label className="text-xs">Registration Number</Label>
            <div className="relative">
              <Input
                className="font-mono pr-8"
                placeholder="e.g. 2100123456"
                value={manual.registrationNumber}
                onChange={e => setManualField("registrationNumber", e.target.value)}
                onBlur={handleRegBlur}
              />
              {regLookupLoading && (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Microchip */}
          <div className="space-y-1">
            <Label className="text-xs">Microchip</Label>
            <Input
              className="font-mono"
              placeholder="15-digit number"
              value={manual.microchip}
              onChange={e => setManualField("microchip", e.target.value)}
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-1">
            <Label className="text-xs">Date of Birth</Label>
            <Input type="date" value={manual.dob} onChange={e => setManualField("dob", e.target.value)} />
          </div>

          {/* Colour */}
          <div className="space-y-1">
            <Label className="text-xs">Colour</Label>
            <Input
              placeholder="e.g. Black & Tan"
              value={manual.colour}
              onChange={e => setManualField("colour", e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: idle — no selection yet ─────────────────────────────────────
  return (
    <div className="space-y-2">
      {ui === "searching" ? (
        <div ref={searchRef} className="relative">
          <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              placeholder={`Search ${sex === "male" ? "male" : "female"} dogs by name or reg…`}
              value={searchQ}
              onChange={e => handleSearchChange(e.target.value)}
            />
            {searchLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />}
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={clear}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          {(searchResults.length > 0 || (searchQ && !searchLoading)) && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No dogs found</div>
              ) : (
                searchResults
                  .filter((d: any) => d.sex === sex)
                  .map((d: any) => (
                    <button
                      key={d.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between gap-2"
                      onClick={() => selectKnownDog(d)}
                    >
                      <span className="font-medium truncate">{d.registeredName}</span>
                      {d.registrationNumber && (
                        <span className="text-xs text-muted-foreground font-mono shrink-0">{d.registrationNumber}</span>
                      )}
                    </button>
                  ))
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-9 gap-1.5"
            onClick={() => setUi("searching")}
          >
            <Search className="h-3.5 w-3.5" />
            Search Known Dogs
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-9 gap-1.5"
            onClick={openManual}
          >
            <Pencil className="h-3.5 w-3.5" />
            Enter Manually
          </Button>
        </div>
      )}
    </div>
  );
}
