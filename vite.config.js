import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import apiDbHandler from './api/db.js' // Force reload

function apiDbPlugin() {
  return {
    name: 'api-db-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url === '/api/db' || req.url.startsWith('/api/db?')) && req.method === 'POST') {
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
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    apiDbPlugin()
  ],
})
