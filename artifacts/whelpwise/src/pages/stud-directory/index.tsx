import { useState } from "react";
import { useListStudListings } from "@workspace/api-client-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, MapPin, Dog as DogIcon, ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

function StudAddonBanner() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
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
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="font-semibold text-sm">Unlock Stud Advertising</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Add the Stud Listing add-on for just <strong>$2/month</strong> to advertise your stud dogs in this directory.
        </p>
      </div>
      <Button onClick={handleUpgrade} disabled={loading} className="flex-shrink-0">
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
        {loading ? "Loading…" : "Add for $2/month"}
      </Button>
    </div>
  );
}

export default function StudDirectory() {
  const [search, setSearch] = useState("");
  const { data: listings, isLoading } = useListStudListings({});
  const { data: userStatus } = useSubscription();

  const filtered = listings
    ? (listings as any[]).filter(l =>
        !search ||
        l.dogName?.toLowerCase().includes(search.toLowerCase()) ||
        l.breedName?.toLowerCase().includes(search.toLowerCase()) ||
        l.location?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const hasStudAddon = userStatus?.hasStudAddon ?? false;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif">Stud Directory</h1>
          <p className="text-muted-foreground mt-1">Browse verified stud dogs available for breeding.</p>
        </div>
        {hasStudAddon && (
          <Button asChild>
            <Link href="/stud-directory/new">
              <Plus className="h-4 w-4 mr-2" /> List a Stud
            </Link>
          </Button>
        )}
      </div>

      {!hasStudAddon && <StudAddonBanner />}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by breed, name, location…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
          <DogIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No stud listings yet</p>
          <p className="text-sm mt-1">Be the first to list a stud dog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((listing: any) => (
            <Card key={listing.id} className="overflow-hidden hover:border-primary/50 transition-colors">
              <div className="h-32 bg-muted flex items-center justify-center">
                {listing.photoUrl ? (
                  <img src={listing.photoUrl} alt={listing.dogName} className="w-full h-full object-cover" />
                ) : (
                  <DogIcon className="h-12 w-12 text-muted-foreground/20" />
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base">{listing.dogName}</h3>
                    <p className="text-sm text-muted-foreground">{listing.breedName}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-primary">${listing.studFee?.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{listing.currency}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {listing.location ?? listing.country ?? "Unknown location"}
                </div>
                <div className="flex gap-2 mt-3">
                  {listing.healthTested && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 text-xs">
                      <ShieldCheck className="h-3 w-3 mr-1" />Health Tested
                    </Badge>
                  )}
                </div>
                {listing.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{listing.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
