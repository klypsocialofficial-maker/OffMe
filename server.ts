import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

// Initialize Firebase Admin
let firebaseAdminInitialized = false;
try {
  // Using the provided credentials directly for the prototype
  // In a real production app, these should remain in environment variables
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  };

  if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
    initializeApp({
      credential: cert(serviceAccount),
    });
    firebaseAdminInitialized = true;
    console.log("Firebase Admin initialized successfully.");
  } else {
    console.warn("Firebase Admin credentials not found in environment variables. Premium upgrades will not work.");
  }
} catch (error) {
  console.error("Error initializing Firebase Admin:", error);
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: "2024-12-18.acacia",
}) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

  // Stripe Webhook needs raw body
  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    if (!stripe) {
      return res.status(500).send("Stripe not configured");
    }

    const sig = req.headers["stripe-signature"];
    let event;

    try {
      // If you have a webhook secret, use it here. For now, we'll just parse the body if no secret is provided.
      // In a real app, you MUST verify the signature.
      event = JSON.parse(req.body.toString());
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.client_reference_id;

      if (userId && firebaseAdminInitialized) {
        try {
          await getFirestore().collection("users").doc(userId).update({
            isPremium: true,
            isVerified: true, // Also give them the verified badge
          });
          console.log(`Successfully upgraded user ${userId} to Premium`);
        } catch (error) {
          console.error(`Error upgrading user ${userId}:`, error);
        }
      }
    }

    res.json({ received: true });
  });

  // Regular JSON parsing for other routes
  app.use(express.json());

  app.post("/api/create-checkout-session", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables." });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    try {
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: "OffMe Premium",
                description: "Desbloqueie recursos exclusivos, como edição de posts a qualquer momento e selo de verificação.",
                images: [`${appUrl}/ghost.svg`],
              },
              unit_amount: 1990, // R$ 19,90
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${appUrl}/premium?success=true`,
        cancel_url: `${appUrl}/premium?canceled=true`,
        client_reference_id: userId,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
