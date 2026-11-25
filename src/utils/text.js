const CJK_RE = /[\u3400-\u9fff]/g;

export function detectLocale(text, requested = 'auto') {
  if (requested !== 'auto') return requested;
  const cjk = (text.match(CJK_RE) || []).length;
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  if (cjk === 0) return 'en';
  if (letters === 0) return 'zh-CN';
  return cjk / (cjk + letters) >= 0.18 ? 'zh-CN' : 'en';
}

export function estimateTokens(text) {
  if (!text) return 0;
  const cjk = (text.match(CJK_RE) || []).length;
  const rest = text.length - cjk;
  return Math.ceil(cjk / 1.5 + rest / 4);
}

export function stripCodeFence(text) {
  const trimmed = String(text || '').trim();
  const match = trimmed.match(/^```(?:json|markdown|md|text)?\s*\n?([\s\S]*?)\n?```$/i);
  return match ? match[1].trim() : trimmed;
}

export function parseJsonLoose(text) {
  const cleaned = stripCodeFence(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export function truncateAtBoundary(text, maxChars) {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const boundary = Math.max(
    slice.lastIndexOf('\n## '),
    slice.lastIndexOf('\n\n'),
    slice.lastIndexOf('。'),
    slice.lastIndexOf('. '),
  );
  return boundary > maxChars * 0.7 ? slice.slice(0, boundary).trimEnd() : slice.trimEnd();
}

export function countMatches(text, patterns) {
  return patterns.reduce((count, pattern) => {
    pattern.lastIndex = 0;
    const matched = pattern.test(text);
    pattern.lastIndex = 0;
    return matched ? count + 1 : count;
  }, 0);
}
