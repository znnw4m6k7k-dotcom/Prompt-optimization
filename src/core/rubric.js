import { countMatches } from '../utils/text.js';

const SECTION_PATTERNS = {
  objective: /^##\s*(?:任务目标|目标|objective|goal)\s*$/im,
  context: /^##\s*(?:已知输入|输入|上下文|available input|input|context)\s*$/im,
  execution: /^##\s*(?:执行要求|执行步骤|步骤|execution requirements|requirements|steps)\s*$/im,
  output: /^##\s*(?:输出要求|输出格式|交付物|output contract|output|deliverable)\s*$/im,
  guardrails: /^##\s*(?:约束与边界|约束|边界|风险|constraints(?: and| &)? boundaries|constraints|boundaries|guardrails)\s*$/im,
};

const SIGNALS = {
  context: [/附件/, /文件/, /数据/, /资料/, /表头/, /输入/, /attached/i, /\bfile\b/i, /\bdata\b/i, /\bcontext\b/i],
  guardrails: [/不得/, /不要/, /避免/, /缺失/, /不编造/, /风险/, /do not/i, /\bavoid\b/i, /\bmissing\b/i, /\brisk\b/i],
  output: [/表格/, /报告/, /列出/, /格式/, /Markdown/i, /JSON/i, /PPT/i, /Word/i, /Excel/i, /先给/, /output/i, /\bformat\b/i, /\btable\b/i],
};

const DIMENSION_LABELS = {
  objective: { zh: '目标明确度', en: 'Objective clarity' },
  context: { zh: '输入与上下文', en: 'Input and context' },
  execution: { zh: '执行可操作性', en: 'Execution specificity' },
  output: { zh: '输出契约', en: 'Output contract' },
  guardrails: { zh: '约束与不确定性', en: 'Guardrails and uncertainty' },
  concision: { zh: '简洁度', en: 'Concision' },
};

const MAX = { objective: 20, context: 15, execution: 20, output: 20, guardrails: 15, concision: 10 };

function clamp(value, max) {
  return Math.max(0, Math.min(max, value));
}

function countHeadings(text) {
  return (text.match(/^##\s+/gm) || []).length;
}

function countNumberedSteps(text) {
  return (text.match(/^\s*\d+[.)、]\s+/gm) || []).length;
}

function countBullets(text) {
  return (text.match(/^\s*[-*]\s+/gm) || []).length;
}

function hasSection(prompt, id) {
  return SECTION_PATTERNS[id].test(prompt);
}

export function scorePrompt(prompt, { draft = '', locale = 'zh-CN' } = {}) {
  const zh = locale === 'zh-CN';
  const steps = countNumberedSteps(prompt);
  const bullets = countBullets(prompt);
  const headings = countHeadings(prompt);
  const dimensions = [];

  const objective = clamp(
    (hasSection(prompt, 'objective') ? 14 : 0) +
      (hasSection(prompt, 'objective') && prompt.length > 120 ? 4 : 0) +
      (/(?:请|需要|目标|完成|write|analyze|create|build|produce)/i.test(prompt) ? 2 : 0),
    MAX.objective,
  );

  const contextHits = countMatches(prompt, SIGNALS.context);
  const context = clamp(
    (hasSection(prompt, 'context') ? 8 : 0) + Math.min(7, contextHits * 2),
    MAX.context,
  );

  const execution = clamp(
    (hasSection(prompt, 'execution') ? 8 : 0) +
      (steps >= 3 ? 8 : steps >= 1 ? 4 : 0) +
      Math.min(4, countMatches(prompt, [/检查/, /计算/, /验证/, /核对/, /先/, /再/, /inspect/i, /verify/i, /calculate/i])),
    MAX.execution,
  );

  const outputHits = countMatches(prompt, SIGNALS.output);
  const output = clamp(
    (hasSection(prompt, 'output') ? 8 : 0) +
      Math.min(6, outputHits * 2) +
      (bullets >= 3 ? 6 : bullets >= 1 ? 2 : 0),
    MAX.output,
  );

  const guardrailHits = countMatches(prompt, SIGNALS.guardrails);
  const guardrails = clamp(
    (hasSection(prompt, 'guardrails') ? 7 : 0) + Math.min(8, guardrailHits * 2),
    MAX.guardrails,
  );

  let concision = 0;
  const ratio = prompt.length / Math.max(1, draft.length);
  if (draft.length < 200) {
    if (prompt.length <= 1600) concision = 10;
    else if (prompt.length <= 2800) concision = 8;
    else if (prompt.length <= 4500) concision = 5;
    else concision = 2;
  } else if (ratio <= 2.5) concision = 10;
  else if (ratio <= 4) concision = 8;
  else if (ratio <= 7) concision = 5;
  else concision = 2;

  const filler = countMatches(prompt, [/值得注意的是/g, /总而言之/g, /please note that/gi, /it is important to note/gi]);
  concision = clamp(concision - filler * 2, MAX.concision);

  const scores = { objective, context, execution, output, guardrails, concision };
  const notes = {
    objective: hasSection(prompt, 'objective') ? (zh ? '检测到目标章节' : 'Objective section found') : (zh ? '未检测到目标章节' : 'No objective section'),
    context: `${contextHits} ${zh ? '个输入信号' : 'input signal(s)'}`,
    execution: `${steps} ${zh ? '个编号步骤' : 'numbered step(s)'}`,
    output: `${outputHits} ${zh ? '个格式信号' : 'format signal(s)'}`,
    guardrails: `${guardrailHits} ${zh ? '个约束信号' : 'guardrail signal(s)'}`,
    concision: zh ? `扩写比例约 ${ratio.toFixed(1)}x` : `Expansion ratio about ${ratio.toFixed(1)}x`,
  };

  for (const id of Object.keys(MAX)) {
    dimensions.push({
      id,
      label: zh ? DIMENSION_LABELS[id].zh : DIMENSION_LABELS[id].en,
      score: scores[id],
      max: MAX[id],
      note: notes[id],
    });
  }

  const total = dimensions.reduce((sum, item) => sum + item.score, 0);
  const band = total >= 85 ? 'excellent' : total >= 70 ? 'good' : total >= 55 ? 'fair' : 'weak';
  const warnings = [];
  if (objective < 12) warnings.push(zh ? '目标不够明确。' : 'The objective is not explicit enough.');
  if (output < 12) warnings.push(zh ? '缺少可检查的输出格式。' : 'No checkable output contract was found.');
  if (guardrails < 8) warnings.push(zh ? '缺少缺信息处理或防编造约束。' : 'Missing-information and anti-fabrication guardrails are weak.');
  if (headings >= 8) warnings.push(zh ? '章节偏多，可能稀释关键约束。' : 'There are many sections; key constraints may be diluted.');
  if (prompt.length > 8000) warnings.push(zh ? '提示词过长，建议压缩。' : 'The prompt is long; consider compressing it.');

  return { score: total, band, dimensions, warnings };
}
