import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
  }
} else {
  console.warn("FIREBASE_SERVICE_ACCOUNT_KEY not found in environment variables. Push notifications will not work.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to send push notification
  app.post("/api/send-notification", async (req, res) => {
    const { tokens, title, body, data } = req.body;

    if (!tokens || tokens.length === 0) {
      return res.status(400).json({ error: "No tokens provided" });
    }

    try {
      const message = {
        notification: { title, body },
        data: data || {},
        tokens: tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      res.json({ success: true, response });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
