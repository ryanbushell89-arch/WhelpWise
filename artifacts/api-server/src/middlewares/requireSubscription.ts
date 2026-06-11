import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./requireAuth";
import { getStripeClient } from "../stripeClient";

const TRIAL_DAYS = 7;

export async function requireSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(403).json({ error: "User not found", code: "NO_USER" });
    return;
  }

  // Puppy owner accounts are always free — bypass subscription check
  if (user.role === "puppy_owner") {
    next();
    return;
  }

  if (user.trialStartedAt) {
    const trialEnd = new Date(user.trialStartedAt);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    if (new Date() < trialEnd) {
      next();
      return;
    }
  }

  if (user.stripeSubscriptionId) {
    try {
      const stripe = await getStripeClient();
      const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      if (sub.status === 'active' || sub.status === 'trialing') {
        next();
        return;
      }
    } catch {
      // Subscription fetch failed — deny access
    }
  }

  res.status(402).json({ error: "Subscription required", code: "SUBSCRIPTION_REQUIRED" });
}
