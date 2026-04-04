import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
}) : null;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.' });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
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
              name: 'OffMe Premium',
              description: 'Desbloqueie recursos exclusivos, como edição de posts a qualquer momento e selo de verificação.',
              images: [`${appUrl}/ghost.svg`],
            },
            unit_amount: 1990, // R$ 19,90
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/premium?success=true`,
      cancel_url: `${appUrl}/premium?canceled=true`,
      client_reference_id: userId,
    });

    res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
}
