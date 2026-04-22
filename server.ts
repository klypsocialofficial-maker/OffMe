import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import fs from "fs";
import admin from 'firebase-admin';

// Load firebase config for the project ID
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn("Could not load firebase-applet-config.json", e);
}

// Initialize Firebase Admin (Try to find a way to auth)
try {
  // Use the project ID from the config to avoid defaulting to the environment's project
  if (firebaseConfig.projectId) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
      databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
    });
    console.log(`Firebase Admin initialized for project: ${firebaseConfig.projectId}`);
  } else {
    admin.initializeApp();
  }
} catch (error) {
  console.warn("Firebase Admin could not be initialized automatically. Scheduled posts might not work.", error);
}

async function checkScheduledPosts() {
  if (!admin.apps.length) return;
  
  // Use the specific database ID if it exists in the config (Enterprise Firestore)
  const db: any = firebaseConfig.firestoreDatabaseId 
    ? (admin as any).firestore(firebaseConfig.firestoreDatabaseId)
    : admin.firestore();
  const now = admin.firestore.Timestamp.now();
  
  try {
    const q = db.collection('posts')
      .where('status', '==', 'scheduled')
      .where('scheduledAt', '<=', now);
    
    const snap = await q.get();
    
    const batch = db.batch();
    snap.docs.forEach(doc => {
      batch.update(doc.ref, { 
        status: 'published',
        createdAt: now, // Update createdAt to now so it appears at top of feed
        scheduledAt: null 
      });
    });
    
    if (!snap.empty) {
      await batch.commit();
      console.log(`Published ${snap.size} scheduled posts.`);
    }
  } catch (error) {
    console.error("Error in scheduled posts worker:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({
    verify: (req: any, res: any, buf: Buffer) => {
      req.rawBody = buf;
    }
  }));

  // Check for api directory and statically load handlers if possible
  const apiDir = path.join(process.cwd(), 'api');
  if (fs.existsSync(apiDir)) {
    const files = fs.readdirSync(apiDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
    for (const file of files) {
      const routePath = `/api/${file.replace(/\.(ts|js)$/, '')}`;
      app.all(routePath, async (req, res) => {
        try {
          const module = await import(`./api/${file}`);
          const handler = module.default;
          if (typeof handler === 'function') {
            await handler(req, res);
          } else {
            res.status(500).json({ error: 'Invalid API handler' });
          }
        } catch (e) {
          console.error(`Error executing API route ${routePath}:`, e);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });
      console.log(`Registered API Route: ${routePath}`);
    }
  }

  // Fallback API route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
    // Check for scheduled posts every 5 minutes
    setInterval(checkScheduledPosts, 5 * 60 * 1000);
  });
}

startServer();
