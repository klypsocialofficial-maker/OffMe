import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import cors from "cors";
import fs from "fs";
import admin from 'firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { WebSocketServer, WebSocket } from "ws";

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

// Initialize Firebase Admin with credentials if available to bypass PERMISSION_DENIED
try {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
      databaseURL: firebaseConfig.projectId ? `https://${firebaseConfig.projectId}.firebaseio.com` : undefined
    });
    console.log("Firebase Admin successfully initialized via key.");
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      databaseURL: firebaseConfig.projectId ? `https://${firebaseConfig.projectId}.firebaseio.com` : undefined
    });
    console.log("Firebase Admin successfully initialized via environment variables.");
  } else if (firebaseConfig.projectId) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
      databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
    });
    console.log(`Firebase Admin initialized for project (without credential): ${firebaseConfig.projectId}`);
  } else {
    admin.initializeApp();
    console.log("Firebase Admin initialized with default settings.");
  }
} catch (error) {
  console.warn("Firebase Admin could not be initialized automatically. Scheduled posts might not work.", error);
}

async function checkScheduledPosts() {
  if (!admin.apps.length) return;
  
  // Use the specific database ID if it exists in the config (Enterprise Firestore)
  const db = firebaseConfig.firestoreDatabaseId 
    ? getFirestore(firebaseConfig.firestoreDatabaseId)
    : getFirestore();
  const now = Timestamp.now();
  
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

// Memory-cached total registered user count for real-time WebSocket dashboard aggregation
let cachedTotalUsers = 42;

async function refreshCachedTotalUsers() {
  if (!admin.apps.length) return;
  try {
    const db = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(firebaseConfig.firestoreDatabaseId)
      : getFirestore();
    const snap = await db.collection('users').count().get();
    const count = snap.data().count;
    if (typeof count === 'number') {
      cachedTotalUsers = count;
      console.log(`[Cache] Refreshed total user count: ${cachedTotalUsers}`);
    }
  } catch (error) {
    console.error("Error refreshing cached user count:", error);
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
  let viteInstance: any = null;
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    viteInstance = vite;
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Check for scheduled posts every 5 minutes
    setInterval(checkScheduledPosts, 5 * 60 * 1000);

    // Initial load and periodic refresh of users counter
    refreshCachedTotalUsers();
    setInterval(refreshCachedTotalUsers, 3 * 60 * 1000); // 3-minute refresh
  });

  // Setup WebSocket Server for active user telemetry and real-time counter sync
  const wss = new WebSocketServer({ noServer: true });

  const broadcastStats = () => {
    const payload = JSON.stringify({
      type: 'stats',
      activeCount: wss.clients.size,
      totalCount: cachedTotalUsers
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  wss.on('connection', (ws: any) => {
    // Send immediate initial response upon handshake
    ws.send(JSON.stringify({
      type: 'stats',
      activeCount: wss.clients.size,
      totalCount: cachedTotalUsers
    }));

    // Broadcast new updated counts to all open sockets
    broadcastStats();

    ws.on('close', () => {
      broadcastStats();
    });

    ws.on('error', (err: any) => {
      console.warn('[WebSocket] Active socket error:', err);
    });
  });

  // Intercept and route upgrade requests to upgrade specific endpoints
  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const url = request.url || "";
      const isWsPath = url.includes('/ws-active-users');
      if (isWsPath) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        // Allow fallback to Vite's own internal dev server WS upgrading handler in development
        if (viteInstance && viteInstance.ws) {
          viteInstance.ws.handleUpgrade(request, socket, head);
        } else {
          if (process.env.NODE_ENV === "production") {
            socket.destroy();
          }
        }
      }
    } catch (err) {
      console.error('[WebSocket] Upgrade routing error:', err);
      socket.destroy();
    }
  });
}

startServer();
