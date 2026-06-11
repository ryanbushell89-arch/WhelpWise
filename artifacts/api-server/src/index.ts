import { getStripeClient, getOrCreatePrice, getOrCreateStudPrice } from "./stripeClient";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

async function initStripe() {
  try {
    logger.info("Initializing Stripe...");
    const stripe = await getStripeClient();
    const priceId = await getOrCreatePrice();
    const studPriceId = await getOrCreateStudPrice();
    logger.info({ priceId, studPriceId }, "Stripe ready — products and prices confirmed");

    const appUrl = process.env.APP_URL;
    if (!appUrl) {
      logger.warn("APP_URL not set — skipping Stripe webhook endpoint registration");
      return;
    }
    const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/stripe/webhook`;

    const webhooks = await stripe.webhookEndpoints.list({ limit: 20 });
    const existing = webhooks.data.find(w => w.url === webhookUrl);
    if (!existing) {
      const wh = await stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: [
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.deleted',
        ],
      });
      logger.info({ webhookId: wh.id }, "Stripe webhook endpoint created");
    } else {
      logger.info({ webhookId: existing.id }, "Stripe webhook endpoint already exists");
    }
  } catch (err) {
    logger.error({ err }, "Failed to initialize Stripe");
  }
}

await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
