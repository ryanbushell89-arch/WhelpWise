import { useQuery } from "@tanstack/react-query";

export interface UserStatus {
  id: string;
  email: string | null;
  role: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
  hasStudAddon: boolean;
}

export function useSubscription() {
  return useQuery<UserStatus>({
    queryKey: ["users", "me"],
    queryFn: async () => {
      const res = await fetch("/api/users/me", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user status");
      return res.json();
    },
    staleTime: 30_000,
    retry: false,
  });
}

export function isSubscriptionActive(status: string | undefined): boolean {
  return status === "active" || status === "trialing";
}

export function getTrialDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
