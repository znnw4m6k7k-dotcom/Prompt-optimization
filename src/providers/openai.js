import { postJson, normalizeUsage } from './http.js';
import { ProviderError } from '../core/errors.js';

export class OpenAICompatibleProvider {
  constructor({ id = 'openai', baseUrl, apiKey, model, timeoutMs, jsonMode = true }) {
    this.id = id;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.jsonMode = jsonMode;
  }

  async generate({ messages, temperature = 0.2, maxTokens = 4096 }) {
    const headers = {};
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;

    const body = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    };
    if (this.jsonMode) body.response_format = { type: 'json_object' };

    const data = await postJson(`${this.baseUrl}/chat/completions`, {
      headers,
      body,
      timeoutMs: this.timeoutMs,
      provider: this.id,
    });

    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      throw new ProviderError(`The ${this.id} endpoint returned no message content.`, {
        details: { provider: this.id },
      });
    }

    return {
      text,
      model: data.model || this.model,
      usage: normalizeUsage(data.usage),
    };
  }
}
