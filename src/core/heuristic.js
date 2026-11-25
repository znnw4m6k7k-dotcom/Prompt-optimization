import { getTargetProfile } from './templates.js';
import { truncateAtBoundary } from '../utils/text.js';

function bullets(items, marker = '-') {
  return items.map((item) => `${marker} ${item}`).join('\n');
}

function numbered(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

export function buildHeuristicResult(draft, analysis, options) {
  const zh = analysis.locale === 'zh-CN';
  const profile = getTargetProfile(analysis.target, analysis.locale);
  const warnings = [];

  const questions = analysis.missing.length > 0 ? profile.questions.slice(0, 3) : [];
  const sections = zh
    ? [
        `你是${profile.role}。请完成以下任务，并用与原始需求相同的语言输出。`,
        `## 任务目标\n${draft}`,
        `## 已知输入\n以本次任务随附的文件、数据、链接和对话上下文为准。若关键信息未提供，请明确列出缺口，不得自行补造。`,
        `## 执行要求\n${numbered(profile.requirements)}`,
        `## 输出要求\n${bullets(profile.output)}`,
        `## 约束与边界\n${bullets(profile.constraints)}`,
        `## 完成标准\n${bullets([
          '交付物能够直接使用，而不是只给建议或提纲（除非用户明确要求提纲）。',
          '覆盖原始需求中的每一项要求，并遵守全部明确约束。',
          '对无法验证、无法完成或存在风险的部分作出明确说明。',
        ])}`,
        ...(questions.length > 0
          ? [`## 需要确认的信息\n如果以下信息会显著影响结果，请先询问或在结果开头说明你的假设：\n${bullets(questions)}`]
          : []),
      ]
    : [
        `You are a ${profile.role}. Complete the task below and respond in the same language as the original request.`,
        `## Objective\n${draft}`,
        `## Available input\nUse the files, data, links, and conversation context supplied with this task. If critical information is missing, state the gap explicitly; do not invent it.`,
        `## Execution requirements\n${numbered(profile.requirements)}`,
        `## Output contract\n${bullets(profile.output)}`,
        `## Constraints and boundaries\n${bullets(profile.constraints)}`,
        `## Definition of done\n${bullets([
          'The deliverable is directly usable, not merely advice or an outline unless one was requested.',
          'Every requirement in the original request is addressed and every explicit constraint is respected.',
          'Anything unverifiable, incomplete, or risky is called out clearly.',
        ])}`,
        ...(questions.length > 0
          ? [`## Information to confirm\nIf the following would materially change the result, ask first or state your assumptions at the top of the answer:\n${bullets(questions)}`]
          : []),
      ];

  let enhancedPrompt = sections.join('\n\n').trim();

  if (enhancedPrompt.length > options.maxChars) {
    const compact = zh
      ? [
          `你是${profile.role}。请完成以下任务。`,
          `## 目标\n${draft}`,
          `## 要求\n${numbered(profile.requirements.slice(0, 3))}`,
          `## 输出\n${bullets(profile.output.slice(0, 2))}`,
          `## 边界\n${bullets(profile.constraints)}`,
        ].join('\n\n')
      : [
          `You are a ${profile.role}. Complete the task below.`,
          `## Objective\n${draft}`,
          `## Requirements\n${numbered(profile.requirements.slice(0, 3))}`,
          `## Output\n${bullets(profile.output.slice(0, 2))}`,
          `## Boundaries\n${bullets(profile.constraints)}`,
        ].join('\n\n');
    enhancedPrompt = compact;
    warnings.push('The output exceeded maxChars, so a compact template was used.');
  }

  if (enhancedPrompt.length > options.maxChars) {
    enhancedPrompt = truncateAtBoundary(enhancedPrompt, options.maxChars);
    warnings.push('The enhanced prompt was truncated at a section boundary to respect maxChars.');
  }

  const changes = zh
    ? [
        '把原始诉求明确为单一任务目标。',
        `按“${analysis.target}”场景补充了执行步骤与领域约束。`,
        '增加了可检查的输出格式与完成标准。',
        '增加了信息缺口处理规则，降低编造风险。',
      ]
    : [
        'Turned the rough request into one explicit objective.',
        `Added execution steps and domain constraints for the "${analysis.target}" target.`,
        'Added a checkable output contract and definition of done.',
        'Added a rule for handling missing information to reduce fabrication risk.',
      ];

  return {
    enhancedPrompt,
    changes,
    assumptions: [],
    questions,
    provider: 'heuristic',
    model: 'deterministic-v1',
    usage: null,
    warnings,
  };
}
