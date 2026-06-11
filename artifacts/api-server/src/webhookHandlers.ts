import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getStripeClient, getStripeWebhookSecret, getOrCreateStudPrice } from './stripeClient';
import { logger } from './lib/logger';
import type Stripe from 'stripe';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = await getStripeClient();
    const webhookSecret = await getStripeWebhookSecret();

    let event: Stripe.Event;
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      event = JSON.parse(payload.toString()) as Stripe.Event;
      logger.warn('No webhook secret configured — skipping signature verification');
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

        // Determine if this is the base plan or stud add-on by checking the price
        let studPriceId: string | null = null;
        try { studPriceId = await getOrCreateStudPrice(); } catch { /* ignore */ }

        const subItems = sub.items?.data ?? [];
        const isStudSub = studPriceId
          ? subItems.some(item => item.price?.id === studPriceId)
          : false;

        if (isStudSub) {
          await db.update(usersTable)
            .set({ stripeStudSubId: sub.status === 'active' || sub.status === 'trialing' ? sub.id : null })
            .where(eq(usersTable.stripeCustomerId, customerId));
          logger.info({ customerId, subId: sub.id, status: sub.status }, 'Stud subscription updated');
        } else {
          await db.update(usersTable)
            .set({ stripeSubscriptionId: sub.id })
            .where(eq(usersTable.stripeCustomerId, customerId));
          logger.info({ customerId, subId: sub.id, status: sub.status }, 'Base subscription upserted');
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

        let studPriceId: string | null = null;
        try { studPriceId = await getOrCreateStudPrice(); } catch { /* ignore */ }

        const subItems = sub.items?.data ?? [];
        const isStudSub = studPriceId
          ? subItems.some(item => item.price?.id === studPriceId)
          : false;

        if (isStudSub) {
          await db.update(usersTable)
            .set({ stripeStudSubId: null })
            .where(eq(usersTable.stripeCustomerId, customerId));
          logger.info({ customerId }, 'Stud subscription cancelled');
        } else {
          await db.update(usersTable)
            .set({ stripeSubscriptionId: null })
            .where(eq(usersTable.stripeCustomerId, customerId));
          logger.info({ customerId }, 'Base subscription cancelled');
        }
        break;
      }
      default:
        logger.info({ type: event.type }, 'Unhandled Stripe event');
    }
  }
}
