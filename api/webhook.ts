import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Lazy initialization of Firebase Admin
function getFirebaseAdmin() {
  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        initializeApp({
          credential: cert(serviceAccount)
        });
      } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
      }
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
      });
    }
  }
  
  return getApps().length > 0 ? getFirestore() : null;
}

// Disable Vercel's default body parser to get the raw body for Stripe signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return res.status(500).send('Stripe not configured');
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-12-18.acacia',
  });

  // Read raw body properly from Express
  const rawBody = req.rawBody || JSON.stringify(req.body);

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // If you configure a webhook secret in Vercel, use it here
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      // Fallback to just parsing the JSON if no secret is set (less secure, but works for prototyping)
      event = JSON.parse(rawBody.toString());
    }
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const tier = session.metadata?.tier || 'gold';

    const db = getFirebaseAdmin();

    if (userId && db) {
      try {
        await db.collection('users').doc(userId).update({
          isPremium: true,
          isVerified: true, // Also give them the verified badge
          premiumTier: tier,
        });
        console.log(`Successfully upgraded user ${userId} to Premium Tier: ${tier}`);
      } catch (error) {
        console.error(`Error upgrading user ${userId}:`, error);
      }
    }
  }

  res.status(200).json({ received: true });
}
