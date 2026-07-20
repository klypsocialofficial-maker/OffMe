import Stripe from 'stripe';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, tier } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.warn("Missing STRIPE_SECRET_KEY. Redirecting user to custom OffMe checkout simulator.");
    const simulationUrl = `${appUrl}/premium-checkout-simulation?userId=${encodeURIComponent(userId)}&tier=${encodeURIComponent(tier || 'gold')}`;
    return res.status(200).json({ url: simulationUrl });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-12-18.acacia' as any,
  });

  let price = 1990;
  let name = 'OffMe Fun (Gold)';
  let description = 'A experiência completa do OffMe. Selo Gold, edição a qualquer momento e destaque.';

  if (tier === 'silver') {
    price = 990;
    name = 'OffMe Básico (Prata)';
    description = 'O essencial para se destacar. Selo Prata e edição de posts até 1 hora.';
  } else if (tier === 'black') {
    price = 4990;
    name = 'OffMe Business (Black)';
    description = 'Para criadores e marcas. Selo Black, Analytics e Suporte prioritário.';
  }

  try {
    // Vercel provides VERCEL_URL automatically
    const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: name,
              description: description,
              images: [`${appUrl}/ghost.svg`],
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/premium?success=true`,
      cancel_url: `${appUrl}/premium?canceled=true`,
      client_reference_id: userId,
      metadata: {
        tier: tier || 'gold'
      }
    });

    res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
}
