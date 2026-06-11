import Stripe from 'stripe';

let _stripeClient: Stripe | null = null;

export async function getStripeClient(): Promise<Stripe> {
  if (_stripeClient) return _stripeClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY environment variable is required');
  _stripeClient = new Stripe(secretKey);
  return _stripeClient;
}

export async function getStripeWebhookSecret(): Promise<string> {
  return process.env.STRIPE_WEBHOOK_SECRET ?? '';
}

// ── Base plan: $5.99 AUD/month ────────────────────────────────────────────────

let _basePriceId: string | null = null;

export async function getOrCreatePrice(): Promise<string> {
  if (_basePriceId) return _basePriceId;
  const stripe = await getStripeClient();

  const products = await stripe.products.search({ query: "name:'WhelpWise Monthly' AND active:'true'" });
  let product = products.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: 'WhelpWise Monthly',
      description: 'Full access to WhelpWise — professional dog breeding management.',
    });
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
  let price = prices.data.find(p => p.unit_amount === 599 && p.currency === 'aud' && p.recurring?.interval === 'month');
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: 599,
      currency: 'aud',
      recurring: { interval: 'month' },
    });
  }

  _basePriceId = price.id;
  return price.id;
}

// ── Stud listing add-on: $2 AUD/month ─────────────────────────────────────────

let _studPriceId: string | null = null;

export async function getOrCreateStudPrice(): Promise<string> {
  if (_studPriceId) return _studPriceId;
  const stripe = await getStripeClient();

  const products = await stripe.products.search({ query: "name:'WhelpWise Stud Listing' AND active:'true'" });
  let product = products.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: 'WhelpWise Stud Listing',
      description: 'Advertise your stud dogs in the WhelpWise Stud Directory.',
    });
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
  let price = prices.data.find(p => p.unit_amount === 200 && p.currency === 'aud' && p.recurring?.interval === 'month');
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: 200,
      currency: 'aud',
      recurring: { interval: 'month' },
    });
  }

  _studPriceId = price.id;
  return price.id;
}
