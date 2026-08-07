import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import apiDbHandler from './api/db.js'
import apiTtsHandler from './api/tts.js'

function apiDevMiddlewarePlugin() {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        try {
          const host = req.headers.host || 'localhost:5173';
          const urlObj = new URL(req.url, `http://${host}`);
          const pathname = urlObj.pathname;

          if (pathname === '/api/tts' || pathname.startsWith('/api/tts?')) {
            const query = Object.fromEntries(urlObj.searchParams.entries());
            req.query = query;
            const resMock = {
              statusCode: 200,
              setHeader: (k, v) => res.setHeader(k, v),
              status: function(code) {
                res.statusCode = code;
                return this;
              },
              json: function(data) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              },
              send: function(buffer) {
                res.end(buffer);
              }
            };
            apiTtsHandler(req, resMock).catch(err => {
              console.error("Localhost TTS Handler Error:", err);
              if (!res.headersSent) {
                res.statusCode = 500;
                res.end("TTS Error");
              }
            });
            return;
          }

          if ((pathname === '/api/db' || pathname.startsWith('/api/db?')) && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                req.body = JSON.parse(body || '{}');
                const resMock = {
                  status: (code) => ({
                    json: (data) => {
                      res.statusCode = code;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify(data));
                    },
                    send: (msg) => {
                      res.statusCode = code;
                      res.setHeader('Content-Type', 'text/plain');
                      res.end(msg);
                    }
                  })
                };
                await apiDbHandler(req, resMock);
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ status: 'error', message: err?.message || String(err) }));
              }
            });
            return;
          }
        } catch (e) {
          console.error("Vite Middleware Error:", e);
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    apiDevMiddlewarePlugin()
  ],
  define: {
    'import.meta.env.GOOGLE_SCRIPT_URL': JSON.stringify(process.env.GOOGLE_SCRIPT_URL || '')
  }
})
