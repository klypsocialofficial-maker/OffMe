import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import fs from "fs";

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
  });
}

startServer();
