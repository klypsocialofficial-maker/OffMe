import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';

// Simple plugin to mock Vercel API routes during local development
const vercelApiMockPlugin = () => ({
  name: 'vercel-api-mock',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url?.startsWith('/api/')) {
        const urlPath = req.url.split('?')[0];
        const apiFilePath = path.join(process.cwd(), urlPath + '.ts');
        
        if (fs.existsSync(apiFilePath)) {
          try {
            // Dynamically import the API route handler
            const module = await server.ssrLoadModule(apiFilePath);
            const handler = module.default;
            
            if (typeof handler === 'function') {
              // Parse JSON body for POST requests if not already parsed
              if (req.method === 'POST' && !req.body && req.headers['content-type']?.includes('application/json')) {
                const chunks: any[] = [];
                req.on('data', (chunk: any) => chunks.push(chunk));
                await new Promise<void>((resolve) => {
                  req.on('end', () => {
                    if (chunks.length > 0) {
                      try {
                        req.body = JSON.parse(Buffer.concat(chunks).toString());
                      } catch (e) {
                        console.error('Failed to parse JSON body in mock server');
                      }
                    }
                    resolve();
                  });
                });
              }

              // Mock Express-like res.status().json() and res.status().send()
              const originalRes = res;
              let currentStatus = 200;
              
              const mockRes = {
                status: (code: number) => {
                  currentStatus = code;
                  originalRes.statusCode = code;
                  return mockRes;
                },
                json: (data: any) => {
                  originalRes.setHeader('Content-Type', 'application/json');
                  originalRes.end(JSON.stringify(data));
                },
                send: (data: any) => {
                  originalRes.end(data);
                }
              };

              await handler(req, mockRes);
              return;
            }
          } catch (error) {
            console.error(`Error executing API route ${urlPath}:`, error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal Server Error in mock API' }));
            return;
          }
        }
      }
      next();
    });
  }
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      vercelApiMockPlugin(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'prompt',
        manifest: {
          name: 'OffMe',
          short_name: 'OffMe',
          description: 'Um app social responsivo como Twitter/Threads',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'fullscreen',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        devOptions: {
          enabled: true,
          type: 'module',
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
