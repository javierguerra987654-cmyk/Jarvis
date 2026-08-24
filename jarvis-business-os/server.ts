import express from 'express';
import path from 'path';
import http from 'http';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes.js';
import { setupLiveWebSocket } from './server/liveSession.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const server = http.createServer(app);

  // Basic hardening for API responses. Keep this dependency-free.
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Set up WebSocket server for Gemini Live API real-time voice
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2 * 1024 * 1024 });
  setupLiveWebSocket(wss);

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = request.url || '';
      const pathname = url.split('?')[0];
      if (pathname === '/live-ws' || pathname === '/api/live-ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
        return;
      }

      // Do not leave unsupported upgrade sockets hanging.
      socket.destroy();
    } catch (err) {
      console.warn('[Server] WebSocket upgrade error:', err);
      socket.destroy();
    }
  });

  // JSON body parser with generous limit for document intelligence.
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Never trust client-supplied auth bypass flags.
  app.use((req, _res, next) => {
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      delete (req.body as Record<string, unknown>)._bypassAuth;
    }
    next();
  });

  // Request logging for audit telemetry
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // Mount API routes
  app.use('/api', apiRouter);

  // Vite middleware in dev, static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`JARVIS Business OS server (HTTP & Live WS) running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start JARVIS Business OS server:', err);
  process.exit(1);
});
