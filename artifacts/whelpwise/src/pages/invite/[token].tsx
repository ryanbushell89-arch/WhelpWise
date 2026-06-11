import { useParams, useLocation, Link } from "wouter";
import { useUser } from "@clerk/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dog, CheckCircle2, Clock, AlertCircle, Loader2, MessageCircle, ShieldCheck } from "lucide-react";

interface InviteInfo {
  status: string;
  puppyName: string | null;
  puppyColour: string | null;
  puppySex: string | null;
  puppyPhotoUrl: string | null;
  breederEmail: string | null;
  email: string;
  expiresAt: string;
}

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: invite, isLoading } = useQuery<InviteInfo>({
    queryKey: ["invite", token],
    queryFn: async () => {
      const res = await fetch(`/api/invites/${token}`);
      if (!res.ok) throw new Error("Invite not found");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to accept invite");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "me"] });
      setAccepted(true);
      setTimeout(() => setLocation("/puppy-owner"), 1500);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const puppyName = invite?.puppyName ?? "Your Puppy";
  const breederName = invite?.breederEmail?.split("@")[0] ?? "Your Breeder";

  if (isLoading || !isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invite Not Found</h2>
            <p className="text-muted-foreground">This invitation link is invalid or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.status === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invite Expired</h2>
            <p className="text-muted-foreground">This invitation has expired. Please ask your breeder to send a new one.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.status === "accepted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Already Accepted</h2>
            <p className="text-muted-foreground mb-6">This invitation has already been used.</p>
            {isSignedIn && (
              <Button onClick={() => setLocation("/puppy-owner")}>Go to Your Dashboard</Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Welcome to WhelpWise!</h2>
            <p className="text-muted-foreground">Taking you to {puppyName}'s profile…</p>
            <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Brand header */}
      <div className="flex items-center gap-2 mb-8">
        <Dog className="h-7 w-7 text-primary" />
        <span className="text-2xl font-bold text-primary font-serif">WhelpWise</span>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-0">
          {invite.puppyPhotoUrl ? (
            <img
              src={invite.puppyPhotoUrl}
              alt={puppyName}
              className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-primary/20"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Dog className="h-10 w-10 text-primary" />
            </div>
          )}
          <CardTitle className="text-2xl font-serif">Meet {puppyName}!</CardTitle>
          <CardDescription className="mt-1">
            <strong className="text-foreground">{breederName}</strong> has invited you to view {puppyName}'s profile on WhelpWise.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Puppy details */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {invite.puppySex && (
              <Badge variant="secondary">{invite.puppySex === "M" ? "Male" : invite.puppySex === "F" ? "Female" : invite.puppySex}</Badge>
            )}
            {invite.puppyColour && (
              <Badge variant="outline">{invite.puppyColour}</Badge>
            )}
          </div>

          {/* Feature list */}
          <div className="space-y-3 mb-6">
            {[
              { icon: Dog, label: "Full puppy profile & records" },
              { icon: ShieldCheck, label: "Vaccination & worming history" },
              { icon: MessageCircle, label: "Private chat with your breeder" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Free badge */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center mb-6">
            <p className="text-sm font-medium text-primary">Your account is completely free</p>
            <p className="text-xs text-muted-foreground mt-0.5">No credit card required — ever</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          {isSignedIn ? (
            <Button
              className="w-full"
              size="lg"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Accepting…</>
              ) : (
                <>Accept Invitation & View {puppyName}</>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link href={`/sign-up?from=/invite/${token}`}>
                  Create Free Account & Accept
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/sign-in?from=/invite/${token}`}>
                  Sign In to Accept
                </Link>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Already have a breeder account? Sign in and the invite will be waiting here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
