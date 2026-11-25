import { createInterface } from 'node:readline';
import { enhancePrompt } from './core/enhancer.js';
import { toPublicError } from './core/errors.js';
import { MODES, TARGETS } from './core/options.js';
import { loadConfig } from './config.js';
import { createProvider } from './providers/index.js';
import { VERSION } from './version.js';

const PROTOCOL_VERSIONS = ['2024-11-05', '2025-03-26', '2025-06-18'];
const LATEST_PROTOCOL = PROTOCOL_VERSIONS[PROTOCOL_VERSIONS.length - 1];

const ENHANCE_TOOL = {
  name: 'enhance_prompt',
  title: 'Enhance a prompt',
  description:
    'Rewrite a rough user request into a clear, executable prompt for a downstream AI agent. This tool does not execute the request; it only returns an improved prompt, change notes, assumptions, questions, and a deterministic quality score.',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['prompt'],
    properties: {
      prompt: {
        type: 'string',
        minLength: 1,
        maxLength: 20000,
        description: 'The rough request or draft prompt to improve.',
      },
      target: {
        type: 'string',
        enum: TARGETS,
        default: 'auto',
        description: 'Downstream task profile. "auto" detects it from the draft.',
      },
      mode: {
        type: 'string',
        enum: MODES,
        default: 'fast',
        description: 'fast: one model call; balanced: repair weak results; quality: two candidates plus repair.',
      },
      locale: {
        type: 'string',
        enum: ['auto', 'zh-CN', 'en'],
        default: 'auto',
        description: 'Output language. "auto" follows the draft.',
      },
      maxChars: {
        type: 'integer',
        minimum: 500,
        maximum: 60000,
        default: 12000,
        description: 'Advisory maximum output length in characters.',
      },
    },
  },
  outputSchema: {
    type: 'object',
    properties: {
      enhancedPrompt: { type: 'string' },
      changes: { type: 'array', items: { type: 'string' } },
      assumptions: { type: 'array', items: { type: 'string' } },
      questions: { type: 'array', items: { type: 'string' } },
      provider: { type: 'string' },
      model: { type: 'string' },
      quality: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          band: { type: 'string' },
        },
      },
    },
  },
  annotations: {
    title: 'Enhance a prompt',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id, code, message, data) {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  };
}

export function createMcpHandler({ config: suppliedConfig, provider: suppliedProvider, enhancer = enhancePrompt } = {}) {
  const config = suppliedConfig || loadConfig();
  const provider = suppliedProvider || createProvider(config);

  return async function handleMessage(message) {
    if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
      return rpcError(message?.id ?? null, -32600, 'Invalid Request');
    }

    const { id, method, params } = message;
    const isNotification = !('id' in message);

    if (method === 'initialize') {
      const requested = params?.protocolVersion;
      const protocolVersion = PROTOCOL_VERSIONS.includes(requested) ? requested : LATEST_PROTOCOL;
      return rpcResult(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'prompt-refinery', title: 'Prompt Refinery', version: VERSION },
        instructions:
          'Use enhance_prompt to turn a rough request into an executable prompt before delegating complex work. The tool never executes the request itself.',
      });
    }

    if (isNotification) return null;

    if (method === 'ping') return rpcResult(id, {});

    if (method === 'tools/list') {
      return rpcResult(id, { tools: [ENHANCE_TOOL] });
    }

    if (method === 'tools/call') {
      if (params?.name !== 'enhance_prompt') {
        return rpcError(id, -32602, 'Unknown tool', { name: params?.name });
      }
      const args = params?.arguments;
      if (!args || typeof args.prompt !== 'string') {
        return rpcError(id, -32602, 'Invalid tool arguments: prompt is required.');
      }

      try {
        const result = await enhancer(
          args.prompt,
          {
            target: args.target,
            mode: args.mode,
            locale: args.locale,
            maxChars: args.maxChars,
          },
          { config, provider },
        );
        return rpcResult(id, {
          content: [{ type: 'text', text: result.enhancedPrompt }],
          structuredContent: result,
          isError: false,
        });
      } catch (error) {
        const publicError = toPublicError(error);
        return rpcResult(id, {
          content: [
            {
              type: 'text',
              text: `Prompt enhancement failed: ${publicError.message}`,
            },
          ],
          structuredContent: { error: publicError },
          isError: true,
        });
      }
    }

    return rpcError(id, -32601, 'Method not found', { method });
  };
}

export function startMcpServer(options = {}) {
  const config = options.config || loadConfig();
  const provider = options.provider || createProvider(config);
  const handler = createMcpHandler({ config, provider, enhancer: options.enhancer });
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  let chain = Promise.resolve();

  function write(payload) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  }

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.length > 2 * 1024 * 1024) {
      write(rpcError(null, -32600, 'Request exceeds the 2 MB line limit'));
      return;
    }
    chain = chain.then(async () => {
      let message;
      try {
        message = JSON.parse(trimmed);
      } catch {
        write(rpcError(null, -32700, 'Parse error'));
        return;
      }
      try {
        const response = await handler(message);
        if (response) write(response);
      } catch (error) {
        const publicError = toPublicError(error);
        write(rpcError(message?.id ?? null, -32603, 'Internal error', publicError));
      }
    });
  });

  return {
    provider,
    close: () => rl.close(),
    done: new Promise((resolve) => rl.once('close', resolve)),
  };
}
