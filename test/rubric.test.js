import test from 'node:test';
import assert from 'node:assert/strict';
import { scorePrompt } from '../src/core/rubric.js';

test('a structured prompt scores higher than a vague draft', () => {
  const draft = '分析一下这个表';
  const weak = '分析一下这个表';
  const strong = `你是数据分析师。请完成以下任务。

## 任务目标
分析销售表，找出异常并给出建议。

## 已知输入
使用随附的 Excel 文件；字段含义以表头为准。

## 执行要求
1. 检查缺失值和异常值。
2. 计算月度趋势和各渠道占比。
3. 对关键结论做交叉核对。

## 输出要求
- 先给三条核心发现。
- 用 Markdown 表格列出指标、口径和数值。
- 单列数据缺口和风险。

## 约束与边界
- 不得编造数据或字段。
- 数据不足时明确说明，不要用假设填补。

## 完成标准
结论可追溯到原始数据，且每个建议都有对应证据。`;

  const weakScore = scorePrompt(weak, { draft, locale: 'zh-CN', target: 'data' });
  const strongScore = scorePrompt(strong, { draft, locale: 'zh-CN', target: 'data' });
  assert.ok(strongScore.score > weakScore.score);
  assert.ok(strongScore.score >= 75);
  assert.equal(strongScore.band === 'weak', false);
});

test('rubric returns six weighted dimensions and warnings', () => {
  const result = scorePrompt('写个东西', { draft: '写个东西', locale: 'zh-CN' });
  assert.equal(result.dimensions.length, 6);
  assert.equal(result.dimensions.reduce((sum, item) => sum + item.max, 0), 100);
  assert.ok(result.warnings.length > 0);
});
