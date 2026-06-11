import Stripe from 'stripe';

async function seedStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY environment variable is required');
  const stripe = new Stripe(secretKey);

  const existing = await stripe.products.search({
    query: "name:'WhelpWise Monthly' AND active:'true'",
  });

  if (existing.data.length > 0) {
    console.log('WhelpWise Monthly product already exists:', existing.data[0].id);
    const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
    console.log('Existing prices:', prices.data.map((p) => `${p.id} — ${p.unit_amount} ${p.currency}`));
    return;
  }

  const product = await stripe.products.create({
    name: 'WhelpWise Monthly',
    description: 'Full access to WhelpWise — dog breeding management platform. Includes all features, stud directory, unlimited records, and PDF reports.',
  });
  console.log('Created product:', product.id);

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 599,
    currency: 'aud',
    recurring: { interval: 'month' },
  });
  console.log('Created price:', price.id, '— AUD $5.99/month');
  console.log('Done. Webhooks will sync to your database automatically.');
}

seedStripe().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
