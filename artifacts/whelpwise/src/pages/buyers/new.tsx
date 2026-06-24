import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useCreateBuyer } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NewBuyer() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const createBuyer = useCreateBuyer();

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", address: "", notes: "",
  });

  function set(key: keyof typeof form, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast({ title: "First and last name are required", variant: "destructive" });
      return;
    }
    try {
      const buyer = await createBuyer.mutateAsync({
        data: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        },
      });
      toast({ title: "Buyer added" });
      navigate(`/buyers/${(buyer as any).id}`);
    } catch {
      toast({ title: "Failed to add buyer", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/buyers"><ArrowLeft className="h-4 w-4 mr-1" /> Buyers</Link>
      </Button>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-serif">Add Buyer</h1>
        <p className="text-muted-foreground mt-1 text-sm">Record a new puppy buyer's contact details.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Contact Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">First Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Jamie" value={form.firstName}
                onChange={e => set("firstName", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Last Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Taylor" value={form.lastName}
                onChange={e => set("lastName", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" placeholder="e.g. jamie@example.com" value={form.email}
                onChange={e => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input type="tel" placeholder="e.g. 01234 567890" value={form.phone}
                onChange={e => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Address</Label>
              <Input placeholder="e.g. 12 High Street, Townsville" value={form.address}
                onChange={e => set("address", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea placeholder="Preferences, household details, anything worth remembering…" rows={3}
              value={form.notes} onChange={e => set("notes", e.target.value)} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/buyers">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createBuyer.isPending}>
            {createBuyer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Buyer
          </Button>
        </div>
      </form>
    </div>
  );
}
