import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateWaitingListEntry, useUpdateWaitingListEntry } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export interface WLFormValues {
  name: string; email: string; phone: string; address: string;
  breedPreference: string; sexPreference: string; colourPreference: string;
  litterPreference: string; timeframe: string;
  depositPaid: boolean; depositAmount: string;
  priority: string; notes: string; status: string;
}

const empty: WLFormValues = {
  name: "", email: "", phone: "", address: "",
  breedPreference: "", sexPreference: "either", colourPreference: "",
  litterPreference: "", timeframe: "",
  depositPaid: false, depositAmount: "",
  priority: "", notes: "", status: "waiting",
};

export function wlToFormValues(e: any): WLFormValues {
  return {
    name: e.name ?? "", email: e.email ?? "", phone: e.phone ?? "", address: e.address ?? "",
    breedPreference: e.breedPreference ?? "", sexPreference: e.sexPreference ?? "either",
    colourPreference: e.colourPreference ?? "", litterPreference: e.litterPreference ?? "",
    timeframe: e.timeframe ?? "", depositPaid: !!e.depositPaid,
    depositAmount: e.depositAmount ?? "", priority: e.priority != null ? String(e.priority) : "",
    notes: e.notes ?? "", status: e.status ?? "waiting",
  };
}

export function WLForm({ initialValues = empty, mode, entryId }: {
  initialValues?: WLFormValues; mode: "create" | "edit"; entryId?: number;
}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<WLFormValues>(initialValues);
  const create = useCreateWaitingListEntry();
  const update = useUpdateWaitingListEntry();

  function set(k: keyof WLFormValues, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const body: any = {
      name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null,
      address: form.address.trim() || null, breedPreference: form.breedPreference.trim() || null,
      sexPreference: form.sexPreference || null, colourPreference: form.colourPreference.trim() || null,
      litterPreference: form.litterPreference.trim() || null, timeframe: form.timeframe.trim() || null,
      depositPaid: form.depositPaid, depositAmount: form.depositAmount.trim() || null,
      priority: form.priority ? parseInt(form.priority) : null,
      notes: form.notes.trim() || null, status: form.status,
    };
    try {
      if (mode === "create") {
        const r = await create.mutateAsync({ data: body });
        toast({ title: "Entry added to waiting list" });
        navigate(`/waiting-list/${(r as any).id}`);
      } else if (entryId) {
        await update.mutateAsync({ entryId, data: body });
        toast({ title: "Waiting list entry updated" });
        navigate(`/waiting-list/${entryId}`);
      }
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={mode === "edit" && entryId ? `/waiting-list/${entryId}` : "/waiting-list"}>
          <ArrowLeft className="h-4 w-4 mr-1" />{mode === "edit" ? "Back" : "Waiting List"}
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-serif">{mode === "create" ? "Add to Waiting List" : "Edit Entry"}</h1>
        <p className="text-muted-foreground mt-1 text-sm">Record a person's interest and preferences.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Contact Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Full Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Sarah Johnson" value={form.name} onChange={e => set("name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" placeholder="sarah@example.com" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input type="tel" placeholder="07700 900000" value={form.phone} onChange={e => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Address</Label>
              <Textarea placeholder="Street, Town, County, Postcode" rows={2} value={form.address} onChange={e => set("address", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Puppy Preferences</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Breed Preference</Label>
              <Input placeholder="e.g. Golden Retriever" value={form.breedPreference} onChange={e => set("breedPreference", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sex Preference</Label>
              <Select value={form.sexPreference} onValueChange={v => set("sexPreference", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="either">Either</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Colour Preference</Label>
              <Input placeholder="e.g. Light Golden, any" value={form.colourPreference} onChange={e => set("colourPreference", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Timeframe / Urgency</Label>
              <Input placeholder="e.g. ASAP, end of 2025" value={form.timeframe} onChange={e => set("timeframe", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Litter / Programme Interest</Label>
              <Input placeholder="e.g. Goldie × Atlas Summer 2025 litter" value={form.litterPreference} onChange={e => set("litterPreference", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Admin */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Deposit & Admin</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Priority / Position</Label>
              <Input type="number" placeholder="1" value={form.priority} onChange={e => set("priority", e.target.value)} min={1} />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Switch checked={form.depositPaid} onCheckedChange={v => set("depositPaid", v)} />
              <Label className="text-xs cursor-pointer">Deposit Paid</Label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deposit Amount (£)</Label>
              <Input placeholder="e.g. 250" value={form.depositAmount} onChange={e => set("depositAmount", e.target.value)} />
            </div>
            {mode === "edit" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea placeholder="Any additional notes about this person or their requirements…" rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" asChild>
            <Link href={mode === "edit" && entryId ? `/waiting-list/${entryId}` : "/waiting-list"}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "create" ? "Add to Waiting List" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
