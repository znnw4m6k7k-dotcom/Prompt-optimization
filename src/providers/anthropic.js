import { postJson, normalizeUsage } from './http.js';
import { ProviderError } from '../core/errors.js';

export class AnthropicProvider {
  constructor({ baseUrl, apiKey, model, timeoutMs }) {
    this.id = 'anthropic';
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async generate({ messages, temperature = 0.2, maxTokens = 4096 }) {
    const system = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');
    const rest = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content }));

    const data = await postJson(`${this.baseUrl}/messages`, {
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model: this.model,
        system,
        messages: rest,
        temperature,
        max_tokens: maxTokens,
      },
      timeoutMs: this.timeoutMs,
      provider: this.id,
    });

    const text = Array.isArray(data.content)
      ? data.content
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join('')
      : '';

    if (!text.trim()) {
      throw new ProviderError('The anthropic endpoint returned no text content.', {
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
