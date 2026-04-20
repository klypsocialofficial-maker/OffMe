import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn('WARNING: Cloudinary credentials are not fully configured in environment variables.');
}

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post('/api/upload-video', (req, res, next) => {
    upload.single('video')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'O vídeo é muito grande (máximo 100MB)' });
        }
        return res.status(400).json({ error: `Erro no upload: ${err.message}` });
      } else if (err) {
        console.error('Unknown upload error:', err);
        return res.status(500).json({ error: 'Erro interno no processamento do arquivo' });
      }
      next();
    });
  }, (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo de vídeo enviado' });
      }

      console.log('Starting video upload to Cloudinary...', { 
        filename: req.file.originalname, 
        size: req.file.size,
        mimetype: req.file.mimetype 
      });

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'offme/videos',
          timeout: 600000, // 10 minutes timeout for server-side upload
          chunk_size: 6000000, 
          eager: [
            { width: 720, height: 1280, crop: "fill", gravity: "center" }
          ],
          eager_async: true
        },
        (error, result) => {
          if (error) {
            console.error('SERVER SIDE Cloudinary upload error:', {
              message: error.message,
              http_code: error.http_code,
              error: error
            });
            return res.status(500).json({ 
              error: 'Falha no Cloudinary', 
              details: error.message 
            });
          }
          if (!result) {
            return res.status(500).json({ error: 'Nenhum resultado retornado do Cloudinary' });
          }
          
          console.log('Video upload successful:', result.secure_url);
          res.json({ url: result.secure_url });
        }
      );

      uploadStream.end(req.file.buffer);
    } catch (error) {
      console.error('Express route error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
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
