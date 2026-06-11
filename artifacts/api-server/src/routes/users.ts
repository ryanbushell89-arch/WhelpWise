import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { getStripeClient, getOrCreatePrice, getOrCreateStudPrice } from "../stripeClient";
import type { Request } from "express";

const router = Router();

const TRIAL_DAYS = 7;

function getBaseUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get('host')}`;
}

async function getSubscriptionStatus(user: typeof usersTable.$inferSelect): Promise<{
  subscriptionStatus: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  hasStudAddon: boolean;
}> {
  let subscriptionStatus = 'none';
  let trialEndsAt: string | null = null;
  let currentPeriodEnd: string | null = null;
  let hasStudAddon = false;

  if (user.trialStartedAt) {
    const trialEnd = new Date(user.trialStartedAt);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    trialEndsAt = trialEnd.toISOString();
    if (new Date() < trialEnd) {
      subscriptionStatus = 'trialing';
    }
  }

  if (user.stripeSubscriptionId) {
    try {
      const stripe = await getStripeClient();
      const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId) as unknown as { status: string; current_period_end?: number };
      subscriptionStatus = sub.status;
      if (sub.current_period_end) {
        currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
      }
    } catch {
      subscriptionStatus = 'none';
    }
  }

  if (user.stripeStudSubId) {
    try {
      const stripe = await getStripeClient();
      const sub = await stripe.subscriptions.retrieve(user.stripeStudSubId) as unknown as { status: string };
      hasStudAddon = sub.status === 'active' || sub.status === 'trialing';
    } catch {
      hasStudAddon = false;
    }
  }

  return { subscriptionStatus, trialEndsAt, currentPeriodEnd, hasStudAddon };
}

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const { subscriptionStatus, trialEndsAt, currentPeriodEnd, hasStudAddon } = await getSubscriptionStatus(user);

  res.json({
    id: user.id,
    email: user.email,
    role: user.role ?? "breeder",
    subscriptionStatus,
    trialEndsAt,
    currentPeriodEnd,
    hasStripeCustomer: !!user.stripeCustomerId,
    hasStudAddon,
  });
});

router.post("/users/checkout", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const stripe = await getStripeClient();
  const baseUrl = getBaseUrl(req);

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId },
    });
    await db.update(usersTable).set({ stripeCustomerId: customer.id }).where(eq(usersTable.id, userId));
    customerId = customer.id;
  }

  const priceId = await getOrCreatePrice();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    subscription_data: { trial_period_days: 7 },
    success_url: `${baseUrl}/dashboard?subscribed=true`,
    cancel_url: `${baseUrl}/subscribe`,
  });

  res.json({ url: session.url });
});

router.post("/users/stud-checkout", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const stripe = await getStripeClient();
  const baseUrl = getBaseUrl(req);

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId },
    });
    await db.update(usersTable).set({ stripeCustomerId: customer.id }).where(eq(usersTable.id, userId));
    customerId = customer.id;
  }

  const studPriceId = await getOrCreateStudPrice();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: studPriceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${baseUrl}/stud-directory?upgraded=true`,
    cancel_url: `${baseUrl}/stud-directory`,
  });

  res.json({ url: session.url });
});

router.post("/users/portal", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.stripeCustomerId) {
    res.status(400).json({ error: "No billing account found" });
    return;
  }

  const stripe = await getStripeClient();
  const baseUrl = getBaseUrl(req);
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${baseUrl}/settings`,
  });

  res.json({ url: session.url });
});

export default router;
