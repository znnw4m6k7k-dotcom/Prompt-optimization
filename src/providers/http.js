import { ProviderError } from '../core/errors.js';

function shortBody(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .slice(0, 240);
}

export async function postJson(url, { headers = {}, body, timeoutMs = 45000, provider = 'unknown' } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new ProviderError(`The ${provider} request timed out after ${timeoutMs} ms.`, {
        details: { provider },
        cause: error,
      });
    }
    throw new ProviderError(`Could not reach the ${provider} endpoint.`, {
      details: { provider },
      cause: error,
    });
  }

  const raw = await response.text();
  if (!response.ok) {
    throw new ProviderError(`The ${provider} endpoint returned HTTP ${response.status}.`, {
      details: {
        provider,
        status: response.status,
        response: shortBody(raw),
      },
    });
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new ProviderError(`The ${provider} endpoint returned invalid JSON.`, {
      details: { provider, status: response.status },
      cause: error,
    });
  }
}

export function normalizeUsage(usage) {
  if (!usage || typeof usage !== 'object') return null;
  const inputTokens = usage.prompt_tokens ?? usage.input_tokens ?? usage.prompt_eval_count ?? null;
  const outputTokens = usage.completion_tokens ?? usage.output_tokens ?? usage.eval_count ?? null;
  return {
    inputTokens,
    outputTokens,
    totalTokens:
      usage.total_tokens ??
      (Number.isFinite(inputTokens) && Number.isFinite(outputTokens)
        ? inputTokens + outputTokens
        : null),
  };
}
