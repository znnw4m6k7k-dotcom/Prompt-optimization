import { randomUUID } from 'node:crypto';
import { analyzePrompt } from './analyzer.js';
import { PromptRefineryError, isPromptRefineryError } from './errors.js';
import { buildHeuristicResult } from './heuristic.js';
import { buildCritiqueMessages, buildRewriteMessages, parseRewriteResponse } from './llm.js';
import { normalizeOptions, validateDraft } from './options.js';
import { scorePrompt } from './rubric.js';
import { getTargetProfile } from './templates.js';
import { loadConfig } from '../config.js';
import { createProvider } from '../providers/index.js';
import { VERSION } from '../version.js';

function mergeUsage(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const sum = (x, y) => (Number.isFinite(x) && Number.isFinite(y) ? x + y : null);
  return {
    inputTokens: sum(a.inputTokens, b.inputTokens),
    outputTokens: sum(a.outputTokens, b.outputTokens),
    totalTokens: sum(a.totalTokens, b.totalTokens),
  };
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function optionsFromConfig(config, rawOptions) {
  const provided = Object.fromEntries(
    Object.entries(rawOptions || {}).filter(([, value]) => value !== undefined),
  );
  return normalizeOptions(
    {
      target: provided.target ?? config.target,
      mode: provided.mode ?? config.mode,
      locale: provided.locale ?? config.locale,
      maxChars: provided.maxChars ?? config.maxChars,
      maxInputChars: provided.maxInputChars ?? config.maxInputChars,
      provider: provided.provider ?? config.provider,
      model: provided.model ?? config.model,
      baseUrl: provided.baseUrl ?? config.baseUrl,
      timeoutMs: provided.timeoutMs ?? config.timeoutMs,
      temperature: provided.temperature ?? config.temperature,
      maxTokens: provided.maxTokens ?? config.maxTokens,
      jsonMode: provided.jsonMode ?? config.jsonMode,
      fallbackToHeuristic: provided.fallbackToHeuristic ?? config.fallbackToHeuristic,
    },
  );
}

function buildResult({ draft, analysis, options, provider, content, quality, warnings, usage, degraded = false }) {
  return {
    requestId: randomUUID(),
    enhancedPrompt: content.enhancedPrompt,
    changes: content.changes || [],
    assumptions: content.assumptions || [],
    questions: content.questions || [],
    provider: provider.id,
    model: provider.model,
    mode: options.mode,
    quality,
    meta: {
      version: VERSION,
      target: analysis.target,
      locale: analysis.locale,
      complexity: analysis.complexity,
      missing: analysis.missing,
      durationMs: 0,
      usage: usage || null,
      degraded,
      warnings: dedupe(warnings),
    },
  };
}

async function generateCandidate({ provider, draft, analysis, options, temperature }) {
  const profile = getTargetProfile(analysis.target, analysis.locale);
  const messages = buildRewriteMessages({ draft, analysis, options, profile });
  const response = await provider.generate({
    messages,
    temperature,
    maxTokens: options.maxTokens,
  });
  const parsed = parseRewriteResponse(response.text);
  if (!parsed) {
    throw new PromptRefineryError(
      'INVALID_MODEL_OUTPUT',
      'The model response did not contain a usable enhanced prompt.',
      { status: 502, details: { provider: provider.id } },
    );
  }
  return {
    ...parsed,
    model: response.model,
    usage: response.usage,
  };
}

async function repairCandidate({ provider, draft, analysis, options, candidate, quality }) {
  const profile = getTargetProfile(analysis.target, analysis.locale);
  const messages = buildCritiqueMessages({
    draft,
    analysis,
    options,
    candidate: candidate.enhancedPrompt,
    quality,
    profile,
  });
  const response = await provider.generate({
    messages,
    temperature: 0.1,
    maxTokens: options.maxTokens,
  });
  const parsed = parseRewriteResponse(response.text);
  if (!parsed) return null;
  return { ...parsed, model: response.model, usage: response.usage };
}

export async function enhancePrompt(draft, rawOptions = {}, context = {}) {
  const started = Date.now();
  const config =
    context.config ||
    loadConfig({
      configPath: rawOptions.configPath,
      env: context.env || process.env,
    });
  const options = optionsFromConfig(config, rawOptions);
  const normalizedDraft = validateDraft(draft, options.maxInputChars);
  const analysis = analyzePrompt(normalizedDraft, options);
  const provider = context.provider || createProvider(options, { env: context.env || process.env });
  const warnings = [];

  if (provider.id === 'heuristic') {
    const local = buildHeuristicResult(normalizedDraft, analysis, options);
    const quality = scorePrompt(local.enhancedPrompt, {
      draft: normalizedDraft,
      locale: analysis.locale,
      target: analysis.target,
    });
    const result = buildResult({
      draft: normalizedDraft,
      analysis,
      options,
      provider,
      content: local,
      quality,
      warnings: [...warnings, ...(local.warnings || [])],
      usage: null,
    });
    result.meta.durationMs = Date.now() - started;
    return result;
  }

  let first;
  let usage = null;
  try {
    first = await generateCandidate({
      provider,
      draft: normalizedDraft,
      analysis,
      options,
      temperature: options.temperature,
    });
    usage = mergeUsage(usage, first.usage);
    if (first.warning) warnings.push(first.warning);
  } catch (error) {
    if (options.fallbackToHeuristic && isPromptRefineryError(error)) {
      const local = buildHeuristicResult(normalizedDraft, analysis, options);
      const quality = scorePrompt(local.enhancedPrompt, {
        draft: normalizedDraft,
        locale: analysis.locale,
        target: analysis.target,
      });
      const result = buildResult({
        draft: normalizedDraft,
        analysis,
        options,
        provider: { id: 'heuristic', model: 'deterministic-v1' },
        content: local,
        quality,
        warnings: [
          ...warnings,
          `Provider "${provider.id}" failed; the offline compiler was used instead.`,
          ...(local.warnings || []),
        ],
        usage,
        degraded: true,
      });
      result.meta.durationMs = Date.now() - started;
      return result;
    }
    throw error;
  }

  let quality = scorePrompt(first.enhancedPrompt, {
    draft: normalizedDraft,
    locale: analysis.locale,
    target: analysis.target,
  });
  let best = first;
  let bestQuality = quality;

  if (options.mode === 'quality') {
    try {
      const second = await generateCandidate({
        provider,
        draft: normalizedDraft,
        analysis,
        options,
        temperature: Math.max(0.4, options.temperature),
      });
      usage = mergeUsage(usage, second.usage);
      const secondQuality = scorePrompt(second.enhancedPrompt, {
        draft: normalizedDraft,
        locale: analysis.locale,
        target: analysis.target,
      });
      if (secondQuality.score > bestQuality.score) {
        best = second;
        bestQuality = secondQuality;
      }
    } catch (error) {
      warnings.push(`Candidate generation failed; the first candidate was kept (${error.code || 'ERROR'}).`);
    }
  }

  const repairThreshold = options.mode === 'quality' ? 88 : 85;
  if (options.mode !== 'fast' && bestQuality.score < repairThreshold) {
    try {
      const repaired = await repairCandidate({
        provider,
        draft: normalizedDraft,
        analysis,
        options,
        candidate: best,
        quality: bestQuality,
      });
      if (repaired) {
        usage = mergeUsage(usage, repaired.usage);
        const repairedQuality = scorePrompt(repaired.enhancedPrompt, {
          draft: normalizedDraft,
          locale: analysis.locale,
          target: analysis.target,
        });
        if (repairedQuality.score >= bestQuality.score) {
          best = repaired;
          bestQuality = repairedQuality;
        } else {
          warnings.push('The repair pass did not improve the rubric score; the earlier candidate was kept.');
        }
      } else {
        warnings.push('The repair pass returned an unusable response; the earlier candidate was kept.');
      }
    } catch (error) {
      warnings.push(`The repair pass failed; the earlier candidate was kept (${error.code || 'ERROR'}).`);
    }
  }

  quality = bestQuality;
  if (best.warning) warnings.push(best.warning);
  if (best.enhancedPrompt.length > options.maxChars) {
    warnings.push(
      `The enhanced prompt is ${best.enhancedPrompt.length} characters, above maxChars (${options.maxChars}). It was not truncated to avoid damaging semantics.`,
    );
  }
  warnings.push(...quality.warnings);

  const result = buildResult({
    draft: normalizedDraft,
    analysis,
    options,
    provider: { id: provider.id, model: best.model || provider.model },
    content: best,
    quality,
    warnings,
    usage,
  });
  result.meta.durationMs = Date.now() - started;
  return result;
}
