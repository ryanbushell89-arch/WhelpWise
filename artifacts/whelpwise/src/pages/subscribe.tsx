import { useState } from "react";
import { Dog, Check, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useClerk } from "@clerk/react";
import { ModeToggle } from "@/components/mode-toggle";

export default function SubscribePage() {
  const { signOut } = useClerk();
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/users/checkout", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  }

  const features = [
    "Unlimited dog profiles & pedigrees",
    "Full litter & whelping records",
    "Breeding & progesterone tracking",
    "Puppy weight charts with alerts",
    "Buyer & contract management",
    "Health test certificate storage",
    "Family pet records",
    "Stud directory listing",
    "Waiting list management",
    "PDF reports",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-16 border-b border-border/40 px-6 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <Link href="/" className="flex items-center gap-2">
          <Dog className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-primary font-serif">WhelpWise</span>
        </Link>
        <div className="flex items-center gap-3">
          <ModeToggle />
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20 mb-4">
              7-day free trial
            </div>
            <h1 className="text-3xl font-bold font-serif mb-3">Everything included</h1>
            <p className="text-muted-foreground">
              One simple plan. No tiers, no hidden features. Everything WhelpWise has to offer.
            </p>
          </div>

          <div className="bg-card border rounded-2xl p-8 shadow-sm">
            <div className="flex items-end gap-1 mb-1">
              <span className="text-5xl font-bold">$5.99</span>
              <span className="text-muted-foreground mb-2">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mb-6">Includes GST · Cancel anytime</p>

            <ul className="space-y-3 mb-8">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button className="w-full h-12 text-base" onClick={handleSubscribe} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Start 7-day free trial <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-3">
              No charge during trial · $5.99/month after · Cancel anytime
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
