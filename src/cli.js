import { readFile } from 'node:fs/promises';
import { enhancePrompt } from './core/enhancer.js';
import { isPromptRefineryError, toPublicError } from './core/errors.js';
import { MODES, TARGETS } from './core/options.js';
import { loadConfig, configSummary, getConfigPath } from './config.js';
import { createProvider } from './providers/index.js';
import { startServer } from './server.js';
import { startMcpServer } from './mcp.js';
import { VERSION } from './version.js';

const HELP = `Prompt Refinery ${VERSION}
Turn rough requests into executable prompts for desktop AI agents.

Usage:
  prompt-refinery enhance [prompt] [options]
  prompt-refinery serve [--host 127.0.0.1] [--port 4317] [--token <token>]
  prompt-refinery mcp
  prompt-refinery config [path|show] [--json]
  prompt-refinery doctor [--json]
  prompt-refinery <prompt> [options]

If no prompt argument is supplied to "enhance", input is read from stdin.

Enhance options:
  -t, --target <name>       auto|general|code|writing|research|agent|data|image
  -m, --mode <name>         fast|balanced|quality (default: fast)
  -l, --locale <name>       auto|zh-CN|en
      --max-chars <n>       Advisory output limit in characters (default: 12000)
  -f, --file <path>         Read the draft from a file; use "-" for stdin
      --provider <name>     auto|heuristic|openai|anthropic|ollama
      --model <name>        Provider model id
      --base-url <url>      OpenAI-compatible, Anthropic, or Ollama base URL
      --timeout <ms>        Provider request timeout
      --fallback            Use the offline compiler if the provider fails
      --json                Print the full JSON result instead of only the prompt
      --config <path>       Config file path
  -q, --quiet               Suppress warnings on stderr

Server and MCP:
      --host <host>         Bind host (default: 127.0.0.1)
      --port <port>         Bind port (default: 4317)
      --token <token>       Bearer token; prefer PROMPT_REFINERY_SERVER_TOKEN

Examples:
  prfy "把这份表分析一下，给领导汇报" --target data
  cat draft.txt | prfy enhance --mode balanced --json
  prfy serve --port 4317
  prfy mcp

Docs: https://github.com/znnw4m6k7k-dotcom/Prompt-optimization
`;

const COMMANDS = new Set(['enhance', 'serve', 'mcp', 'config', 'doctor', 'help']);
const VALUE_FLAGS = new Map([
  ['-t', 'target'],
  ['--target', 'target'],
  ['-m', 'mode'],
  ['--mode', 'mode'],
  ['-l', 'locale'],
  ['--locale', 'locale'],
  ['--max-chars', 'maxChars'],
  ['-f', 'file'],
  ['--file', 'file'],
  ['--provider', 'provider'],
  ['--model', 'model'],
  ['--base-url', 'baseUrl'],
  ['--timeout', 'timeoutMs'],
  ['--max-tokens', 'maxTokens'],
  ['--config', 'configPath'],
  ['--host', 'host'],
  ['--port', 'port'],
  ['--token', 'token'],
]);
const BOOLEAN_FLAGS = new Map([
  ['--json', 'json'],
  ['--fallback', 'fallbackToHeuristic'],
  ['--no-json-mode', 'noJsonMode'],
  ['-q', 'quiet'],
  ['--quiet', 'quiet'],
  ['-h', 'help'],
  ['--help', 'help'],
  ['-v', 'version'],
  ['--version', 'version'],
]);

export class UsageError extends Error {}

function parseArgs(argv) {
  const options = { positionals: [] };
  let command = null;
  let endOfOptions = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (endOfOptions) {
      options.positionals.push(arg);
      continue;
    }
    if (arg === '--') {
      endOfOptions = true;
      continue;
    }

    const equalsIndex = arg.indexOf('=');
    const key = equalsIndex > 0 && arg.startsWith('--') ? arg.slice(0, equalsIndex) : arg;
    const inlineValue = equalsIndex > 0 && arg.startsWith('--') ? arg.slice(equalsIndex + 1) : null;

    if (BOOLEAN_FLAGS.has(key)) {
      if (inlineValue !== null) throw new UsageError(`${key} does not take a value.`);
      options[BOOLEAN_FLAGS.get(key)] = true;
      continue;
    }

    if (VALUE_FLAGS.has(key)) {
      const value = inlineValue ?? argv[index + 1];
      if (value === undefined || (inlineValue === null && value.startsWith('-'))) {
        throw new UsageError(`${key} requires a value.`);
      }
      options[VALUE_FLAGS.get(key)] = value;
      if (inlineValue === null) index += 1;
      continue;
    }

    if (arg.startsWith('-')) throw new UsageError(`Unknown option: ${arg}`);

    if (!command && COMMANDS.has(arg)) {
      command = arg;
    } else {
      options.positionals.push(arg);
    }
  }

  if (options.json === undefined) options.json = false;
  return { command: command || 'enhance', options };
}

async function readStdin(limit = 2 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > limit) {
      throw new UsageError('Standard input exceeds 2 MB.');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function resolveDraft(options) {
  if (options.file) {
    if (options.file === '-') return readStdin();
    try {
      return await readFile(options.file, 'utf8');
    } catch (error) {
      throw new UsageError(`Could not read file "${options.file}": ${error.message}`);
    }
  }
  if (options.positionals.length > 0) return options.positionals.join(' ');
  if (!process.stdin.isTTY) return readStdin();
  throw new UsageError('Provide a prompt, --file, or pipe text through stdin.');
}

function enhancementOptions(options, config) {
  return {
    target: options.target ?? config.target,
    mode: options.mode ?? config.mode,
    locale: options.locale ?? config.locale,
    maxChars: options.maxChars ? Number(options.maxChars) : config.maxChars,
    provider: options.provider ?? config.provider,
    model: options.model ?? config.model,
    baseUrl: options.baseUrl ?? config.baseUrl,
    timeoutMs: options.timeoutMs ? Number(options.timeoutMs) : config.timeoutMs,
    maxTokens: options.maxTokens ? Number(options.maxTokens) : config.maxTokens,
    fallbackToHeuristic: Boolean(options.fallbackToHeuristic ?? config.fallbackToHeuristic),
    jsonMode: options.noJsonMode ? false : config.jsonMode,
  };
}

function printWarnings(result, quiet) {
  if (quiet || !result?.meta?.warnings?.length) return;
  for (const warning of result.meta.warnings) {
    process.stderr.write(`warning: ${warning}\n`);
  }
}

export async function runCli(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);

  if (options.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (options.version) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }
  if (command === 'help') {
    process.stdout.write(HELP);
    return 0;
  }

  if (command === 'config') {
    const action = options.positionals[0] || 'show';
    if (!['show', 'path'].includes(action)) {
      throw new UsageError('config accepts "show" or "path".');
    }
    if (action === 'path') {
      process.stdout.write(`${getConfigPath()}\n`);
      return 0;
    }
    const config = loadConfig({ configPath: options.configPath });
    const summary = configSummary(config);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return 0;
  }

  if (command === 'doctor') {
    const config = loadConfig({ configPath: options.configPath });
    let providerInfo;
    let ok = true;
    try {
      const provider = createProvider({
        ...config,
        provider: options.provider ?? config.provider,
        model: options.model ?? config.model,
        baseUrl: options.baseUrl ?? config.baseUrl,
      });
      providerInfo = { provider: provider.id, model: provider.model };
    } catch (error) {
      ok = false;
      providerInfo = { error: toPublicError(error) };
    }
    const report = {
      ok,
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      version: VERSION,
      config: configSummary(config),
      provider: providerInfo,
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return ok ? 0 : 4;
  }

  const config = loadConfig({ configPath: options.configPath });

  if (command === 'serve') {
    const runtimeConfig = {
      ...config,
      server: {
        ...config.server,
        host: options.host ?? config.server.host,
        port: options.port ? Number(options.port) : config.server.port,
      },
    };
    const server = await startServer({
      config: runtimeConfig,
      token: options.token ?? process.env.PROMPT_REFINERY_SERVER_TOKEN,
    });
    process.stderr.write(`Prompt Refinery listening on ${server.url}\n`);
    process.stderr.write(`Provider: ${server.provider.id} (${server.provider.model})\n`);
    process.stderr.write('Press Ctrl+C to stop.\n');

    await new Promise((resolve) => {
      let closing = false;
      const shutdown = async () => {
        if (closing) return;
        closing = true;
        await server.close();
        resolve();
      };
      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);
    });
    return 0;
  }

  if (command === 'mcp') {
    const mcp = startMcpServer({ config });
    process.stderr.write(`Prompt Refinery MCP ready (${mcp.provider.id}/${mcp.provider.model}).\n`);
    await mcp.done;
    return 0;
  }

  const draft = await resolveDraft(options);
  const result = await enhancePrompt(draft, enhancementOptions(options, config), { config });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${result.enhancedPrompt}\n`);
    printWarnings(result, options.quiet);
  }
  return 0;
}

export function exitCodeFor(error) {
  if (error instanceof UsageError) return 2;
  if (!isPromptRefineryError(error)) return 1;
  if (error.code === 'CONFIG_ERROR') return 4;
  if (error.code === 'PROVIDER_ERROR' || error.code === 'INVALID_MODEL_OUTPUT') return 3;
  return 2;
}

export function reportCliError(error, json = false) {
  const payload = error instanceof UsageError
    ? { error: { code: 'USAGE_ERROR', message: error.message } }
    : { error: toPublicError(error) };
  process.stderr.write(json ? `${JSON.stringify(payload, null, 2)}\n` : `error: ${payload.error.message}\n`);
}
