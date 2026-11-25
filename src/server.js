import { createServer as createHttpServer } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { enhancePrompt } from './core/enhancer.js';
import { ConfigError, PromptRefineryError, toPublicError } from './core/errors.js';
import { MODES, TARGETS } from './core/options.js';
import { loadConfig } from './config.js';
import { createProvider } from './providers/index.js';
import { VERSION } from './version.js';

const MAX_BODY_BYTES = 1024 * 1024;

function json(res, status, payload, requestId) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-request-id': requestId,
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let length = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', (chunk) => {
      length += chunk.length;
      if (length > MAX_BODY_BYTES) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) {
        reject(
          new PromptRefineryError('PAYLOAD_TOO_LARGE', 'Request body exceeds 1 MB.', {
            status: 413,
          }),
        );
        return;
      }
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isLoopback(host) {
  return ['127.0.0.1', '::1', 'localhost'].includes(host);
}

function loadOpenApi() {
  try {
    return readFileSync(new URL('../openapi/openapi.yaml', import.meta.url), 'utf8');
  } catch {
    return null;
  }
}

const OPENAPI = loadOpenApi();

export function createServer({ config: suppliedConfig, provider: suppliedProvider, token } = {}) {
  const config = suppliedConfig || loadConfig();
  const provider = suppliedProvider || createProvider(config);
  const authToken = token ?? process.env.PROMPT_REFINERY_SERVER_TOKEN ?? null;

  if (!isLoopback(config.server.host) && !authToken) {
    throw new ConfigError(
      'Refusing to bind a non-loopback address without PROMPT_REFINERY_SERVER_TOKEN or --token.',
    );
  }

  const server = createHttpServer(async (req, res) => {
    const suppliedRequestId = req.headers['x-request-id'];
    const requestId =
      typeof suppliedRequestId === 'string' && suppliedRequestId.length <= 128
        ? suppliedRequestId
        : randomUUID();

    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

      if (req.method === 'GET' && url.pathname === '/healthz') {
        return json(res, 200, { status: 'ok', version: VERSION, provider: provider.id }, requestId);
      }

      if (req.method === 'GET' && url.pathname === '/v1/capabilities') {
        return json(
          res,
          200,
          {
            name: 'prompt-refinery',
            version: VERSION,
            targets: TARGETS,
            modes: MODES,
            provider: provider.id,
            model: provider.model,
            maxBodyBytes: MAX_BODY_BYTES,
            endpoints: ['POST /v1/enhance', 'GET /v1/capabilities', 'GET /healthz', 'GET /openapi.yaml'],
          },
          requestId,
        );
      }

      if (req.method === 'GET' && url.pathname === '/openapi.yaml' && OPENAPI) {
        res.writeHead(200, {
          'content-type': 'application/yaml; charset=utf-8',
          'cache-control': 'no-store',
          'x-request-id': requestId,
        });
        return res.end(OPENAPI);
      }

      if (url.pathname.startsWith('/v1/') && authToken) {
        const auth = req.headers.authorization || '';
        const supplied = auth.startsWith('Bearer ') ? auth.slice(7) : '';
        if (!safeEqual(supplied, authToken)) {
          return json(
            res,
            401,
            {
              error: { code: 'UNAUTHORIZED', message: 'A valid bearer token is required.' },
              requestId,
            },
            requestId,
          );
        }
      }

      if (req.method === 'POST' && url.pathname === '/v1/enhance') {
        if (!String(req.headers['content-type'] || '').includes('application/json')) {
          throw new PromptRefineryError('UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.', {
            status: 415,
          });
        }

        const raw = await readBody(req);
        let input;
        try {
          input = JSON.parse(raw);
        } catch {
          throw new PromptRefineryError('INVALID_JSON', 'Request body is not valid JSON.');
        }
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
          throw new PromptRefineryError('INVALID_INPUT', 'Request body must be a JSON object.');
        }

        const result = await enhancePrompt(
          input.prompt,
          {
            target: input.target,
            mode: input.mode,
            locale: input.locale,
            maxChars: input.maxChars,
          },
          { config, provider },
        );
        result.requestId = requestId;
        return json(res, 200, result, requestId);
      }

      if (req.method === 'OPTIONS') {
        return json(
          res,
          405,
          { error: { code: 'METHOD_NOT_ALLOWED', message: 'CORS is disabled by default.' }, requestId },
          requestId,
        );
      }

      return json(
        res,
        404,
        { error: { code: 'NOT_FOUND', message: 'Unknown endpoint.' }, requestId },
        requestId,
      );
    } catch (error) {
      const status = error instanceof PromptRefineryError ? error.status : 500;
      return json(
        res,
        status,
        { error: toPublicError(error), requestId },
        requestId,
      );
    }
  });

  return { server, config, provider, token: authToken };
}

export async function startServer(options = {}) {
  const created = createServer(options);
  const host = options.host || created.config.server.host;
  const port = options.port ?? created.config.server.port;

  await new Promise((resolve, reject) => {
    const onError = (error) => {
      created.server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      created.server.off('error', onError);
      resolve();
    };
    created.server.once('error', onError);
    created.server.once('listening', onListening);
    created.server.listen(port, host);
  });

  const address = created.server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  const displayHost = host.includes(':') ? `[${host}]` : host;

  return {
    ...created,
    host,
    port: actualPort,
    url: `http://${displayHost}:${actualPort}`,
    close: () =>
      new Promise((resolve, reject) => {
        created.server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
