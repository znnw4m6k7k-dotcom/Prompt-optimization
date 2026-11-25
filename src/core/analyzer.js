import { countMatches, detectLocale } from '../utils/text.js';

const TARGET_HINTS = {
  agent: [
    /\bagent\b/i,
    /\bmcp\b/i,
    /智能体/,
    /工作流/,
    /自动化/,
    /调用.*工具/,
    /工具调用/,
    /定时任务/,
    /审批/,
  ],
  code: [
    /\bcode\b/i,
    /\bbug\b/i,
    /\brepo(sitory)?\b/i,
    /\bapi\b/i,
    /\btest(s|ing)?\b/i,
    /代码/,
    /接口/,
    /重构/,
    /修复/,
    /单元测试/,
    /部署/,
  ],
  data: [
    /\bexcel\b/i,
    /\bcsv\b/i,
    /\bsql\b/i,
    /\bdashboard\b/i,
    /表格/,
    /数据/,
    /图表/,
    /指标/,
    /报表/,
    /透视/,
  ],
  image: [
    /\bimage\b/i,
    /\bphoto\b/i,
    /\bposter\b/i,
    /\blogo\b/i,
    /图片/,
    /海报/,
    /摄影/,
    /封面/,
    /视觉/,
    /配色/,
  ],
  research: [
    /\bresearch\b/i,
    /\bsource(s)?\b/i,
    /\bmarket\b/i,
    /\bcompetitor\b/i,
    /调研/,
    /研究/,
    /竞品/,
    /资料/,
    /来源/,
    /市场规模/,
  ],
  writing: [
    /\barticle\b/i,
    /\bcopy\b/i,
    /\bblog\b/i,
    /\breport\b/i,
    /文章/,
    /文案/,
    /报告/,
    /演讲稿/,
    /公众号/,
    /邮件/,
  ],
};

const CONTEXT_RE = [
  /附件/,
  /文件/,
  /数据/,
  /资料/,
  /输入/,
  /基于/,
  /根据/,
  /attached/i,
  /\bfile(s)?\b/i,
  /\bdata\b/i,
  /\bcontext\b/i,
  /\bgiven\b/i,
  /\busing\b/i,
];

const OUTPUT_RE = [
  /输出/,
  /格式/,
  /生成/,
  /写成/,
  /报告/,
  /表格/,
  /PPT|Word|Excel|Markdown|JSON/i,
  /字数/,
  /output/i,
  /\bformat\b/i,
  /\bdeliverable\b/i,
  /\breturn\b/i,
  /\breport\b/i,
];

const CONSTRAINT_RE = [
  /必须/,
  /不要/,
  /不得/,
  /限制/,
  /只能/,
  /风格/,
  /语气/,
  /截止/,
  /字数/,
  /兼容/,
  /must\b/i,
  /\bmust not\b/i,
  /\bonly\b/i,
  /\bavoid\b/i,
  /\bconstraint/i,
  /\btone\b/i,
  /\bdeadline\b/i,
];

const AUDIENCE_RE = [
  /领导/,
  /老板/,
  /客户/,
  /用户/,
  /读者/,
  /团队/,
  /受众/,
  /给.+看/,
  /\baudience\b/i,
  /\bexecutive/i,
  /\bcustomer/i,
  /\bfor (the )?(team|lead|manager|reader)/i,
];

const SUCCESS_RE = [
  /验收/,
  /成功标准/,
  /完成标准/,
  /通过测试/,
  /可运行/,
  /可复现/,
  /acceptance/i,
  /\bsuccess criteria\b/i,
  /\btests? pass/i,
  /\bdefinition of done\b/i,
];

export function detectTarget(text) {
  let best = 'general';
  let bestScore = 0;
  for (const [target, patterns] of Object.entries(TARGET_HINTS)) {
    const score = countMatches(text, patterns);
    if (score > bestScore) {
      best = target;
      bestScore = score;
    }
  }
  return { target: best, score: bestScore };
}

export function analyzePrompt(draft, options = {}) {
  const locale = detectLocale(draft, options.locale || 'auto');
  const detected = detectTarget(draft);
  const target = options.target && options.target !== 'auto' ? options.target : detected.target;

  const chars = draft.length;
  const lines = draft.split('\n').filter((line) => line.trim());
  const numberedItems = lines.filter((line) => /^\s*(\d+[.)、]|[-*])\s+/.test(line)).length;
  const clauseCount = draft.split(/[，,。；;！？!?]|\band\b/i).filter(Boolean).length;
  const constraintHits = countMatches(draft, CONSTRAINT_RE);

  const lengthScore = Math.min(4, Math.ceil(chars / 600));
  const structureScore = Math.min(2, Math.floor(numberedItems / 3));
  const clauseScore = Math.min(2, Math.floor(clauseCount / 8));
  const constraintScore = Math.min(2, Math.ceil(constraintHits / 2));
  const complexity = Math.max(1, Math.min(10, 1 + lengthScore + structureScore + clauseScore + constraintScore));

  const signals = {
    goal: chars >= 10,
    context: countMatches(draft, CONTEXT_RE) > 0,
    output: countMatches(draft, OUTPUT_RE) > 0,
    constraints: constraintHits > 0,
    audience: countMatches(draft, AUDIENCE_RE) > 0,
    success: countMatches(draft, SUCCESS_RE) > 0,
  };

  const missing = Object.entries(signals)
    .filter(([, present]) => !present)
    .map(([slot]) => slot);

  const recommendedMode = complexity <= 3 ? 'fast' : complexity <= 6 ? 'balanced' : 'quality';

  return {
    locale,
    target,
    targetConfidence: detected.score === 0 ? 'low' : detected.score >= 2 ? 'high' : 'medium',
    complexity,
    recommendedMode,
    chars,
    estimatedTokens: Math.ceil(chars / 2.2),
    signals,
    missing,
  };
}
