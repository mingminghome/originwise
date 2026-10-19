/**
 * Dev middleware for /api/check when using Vite alone (`npm run dev`).
 * Real multi-provider checks need: npm run pages:dev + keys in .dev.vars
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function checkApiDevPlugin(): Plugin {
  return {
    name: 'originwise-check-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';

        if (url === '/api/check' && req.method === 'GET') {
          json(res, 200, {
            ok: true,
            service: 'originwise-check',
            available: [],
            default: null,
            note: 'Vite-only stub — run `npm run pages:dev` with keys in .dev.vars for real checks.',
          });
          return;
        }

        if (url === '/api/check' && req.method === 'POST') {
          await readBody(req);
          json(res, 503, {
            ok: false,
            error:
              'Check needs Cloudflare Pages Functions + AI API keys. Run: npm run pages:dev (copy .dev.vars.example → .dev.vars and set GEMINI_API_KEY or another provider key).',
            code: 'provider_not_configured',
          });
          return;
        }

        next();
      });
    },
  };
}
