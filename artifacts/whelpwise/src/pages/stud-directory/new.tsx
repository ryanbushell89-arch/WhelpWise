import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useListDogs, useCreateStudListing } from "@workspace/api-client-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Dog as DogIcon, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CURRENCIES = ["AUD", "USD", "GBP", "EUR", "NZD", "CAD"];

export default function NewStudListing() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: dogs } = useListDogs({});
  const { data: userStatus } = useSubscription();
  const createListing = useCreateStudListing();
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const [form, setForm] = useState({
    dogId: "",
    studFee: "",
    currency: "AUD",
    country: "",
    location: "",
    description: "",
    expiresAt: "",
  });

  const males = (dogs as any[] | undefined)?.filter(d => d.sex === "male") ?? [];
  const allDogs = (dogs as any[] | undefined) ?? [];
  const displayDogs = males.length > 0 ? males : allDogs;
  const hasStudAddon = userStatus?.hasStudAddon ?? false;

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleUpgrade() {
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/users/stud-checkout", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast({ title: "Could not start checkout", variant: "destructive" });
      setUpgradeLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.dogId) {
      toast({ title: "Select a dog", description: "Choose which dog to list as a stud.", variant: "destructive" });
      return;
    }
    try {
      const body: any = {
        dogId: parseInt(form.dogId),
        currency: form.currency,
        studFee: form.studFee ? parseFloat(form.studFee) : null,
        country: form.country || null,
        location: form.location || null,
        description: form.description || null,
        expiresAt: form.expiresAt || null,
      };
      await createListing.mutateAsync({ data: body });
      toast({ title: "Stud listed", description: "Your stud dog is now visible in the directory." });
      navigate("/stud-directory");
    } catch {
      toast({ title: "Error creating listing", variant: "destructive" });
    }
  }

  if (!hasStudAddon) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/stud-directory"><ArrowLeft className="h-4 w-4 mr-1" /> Stud Directory</Link>
        </Button>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-serif mb-2">Stud Listing Add-on</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Advertise your stud dogs in the WhelpWise directory for just <strong>$2/month</strong> on top of your base subscription.
            </p>
          </div>
          <ul className="text-sm text-left inline-block space-y-2 mx-auto">
            {[
              "List unlimited stud dogs",
              "Visible to all WhelpWise subscribers",
              "Health-tested badge shown automatically",
              "Cancel anytime from your billing portal",
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Button size="lg" onClick={handleUpgrade} disabled={upgradeLoading} className="w-full max-w-xs mx-auto">
            {upgradeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {upgradeLoading ? "Loading…" : "Add Stud Listing — $2/month"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/stud-directory"><ArrowLeft className="h-4 w-4 mr-1" /> Stud Directory</Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold font-serif">List a Stud Dog</h1>
        <p className="text-muted-foreground mt-1">Add your stud dog to the public directory so other breeders can find him.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DogIcon className="h-4 w-4 text-primary" /> Dog Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Dog *</Label>
              <Select value={form.dogId} onValueChange={v => set("dogId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a dog…" />
                </SelectTrigger>
                <SelectContent>
                  {displayDogs.length === 0 ? (
                    <SelectItem value="__none__" disabled>No dogs found — add a dog first</SelectItem>
                  ) : (
                    displayDogs.map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.registeredName}{d.callName ? ` "${d.callName}"` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {males.length === 0 && allDogs.length > 0 && (
                <p className="text-xs text-muted-foreground">Showing all dogs — no males recorded yet.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Stud Fee</Label>
              <Input type="number" min="0" step="0.01" placeholder="e.g. 1500" value={form.studFee} onChange={e => set("studFee", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Currency *</Label>
              <Select value={form.currency} onValueChange={v => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input placeholder="e.g. Australia" value={form.country} onChange={e => set("country", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Location / City</Label>
              <Input placeholder="e.g. Melbourne, VIC" value={form.location} onChange={e => set("location", e.target.value)} />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Titles, achievements, temperament, health clearances, breeding terms…"
                rows={4}
                value={form.description}
                onChange={e => set("description", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Listing Expires</Label>
              <Input type="date" value={form.expiresAt} onChange={e => set("expiresAt", e.target.value)} />
              <p className="text-xs text-muted-foreground">Leave blank for no expiry.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/stud-directory">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createListing.isPending}>
            {createListing.isPending ? "Publishing…" : "Publish Listing"}
          </Button>
        </div>
      </form>
    </div>
  );
}
