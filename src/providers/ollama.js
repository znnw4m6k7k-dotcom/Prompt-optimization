import { postJson, normalizeUsage } from './http.js';
import { ProviderError } from '../core/errors.js';

export class OllamaProvider {
  constructor({ baseUrl, model, timeoutMs }) {
    this.id = 'ollama';
    this.baseUrl = baseUrl;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async generate({ messages, temperature = 0.2, maxTokens = 4096 }) {
    const data = await postJson(`${this.baseUrl}/api/chat`, {
      body: {
        model: this.model,
        messages,
        stream: false,
        format: 'json',
        options: {
          temperature,
          num_predict: maxTokens,
        },
      },
      timeoutMs: this.timeoutMs,
      provider: this.id,
    });

    const text = data?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      throw new ProviderError('The ollama endpoint returned no message content.', {
        details: { provider: this.id },
      });
    }

    return {
      text,
      model: data.model || this.model,
      usage: normalizeUsage({
        prompt_eval_count: data.prompt_eval_count,
        eval_count: data.eval_count,
      }),
    };
  }
}
