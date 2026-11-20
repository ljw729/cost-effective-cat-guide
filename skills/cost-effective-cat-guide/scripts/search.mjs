#!/usr/bin/env node
// Search the Cost-Effective Cat Guide and print matching entries as Markdown.
// No dependencies. Usage:
//   node search.mjs 猫一直蹲猫砂盆尿不出来        search (synonym-aware), top results in full
//   node search.mjs --id CG-0007                 one entry in full
//   node search.mjs --emergency                  every emergency entry
//   node search.mjs --category toxins            entries in a category (ids: see --categories)
//   node search.mjs --categories                 list categories
//   options: --limit N (default 5), --full N (how many results to print in full, default 3)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'guide-data.json'), 'utf8'));
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); if (i === -1) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(name); if (i === -1) return false; args.splice(i, 1); return true; };

const LIMIT = Number(opt('--limit', 5));
const FULL = Number(opt('--full', 3));
const ID = opt('--id', null);
const CATEGORY = opt('--category', null);
const EMERGENCY = flag('--emergency');
const CATEGORIES = flag('--categories');
const query = args.join(' ').trim();

const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const LABEL = {
  type: { recommendation: '建议', dont: '不要做', buying_guide: '选购 / 值不值', emergency: '紧急情况', myth: '误区', evidence_gap: '证据不足' },
  evidence: { A: '强证据', B: '中等证据', C: '有限证据', D: '证据不足 / 有争议' },
  verdict: { incorrect: '错误', mostly_incorrect: '大多错误', uncertain: '尚无定论', partly_correct: '部分正确', correct: '正确' },
  review: { draft: '草稿', ai_researched: 'AI 研究整理，尚未经兽医审核', maintainer_reviewed: '维护者已审核，尚未经兽医审核', vet_reviewed: '兽医已审核' },
  support: { pending: '待核对', ai_checked: 'AI 已核对', human_checked: '人工已核对', vet_checked: '兽医已核对' },
  read: { full_text: '全文', abstract: '摘要', page: '网页正文', metadata_only: '仅元数据' },
};

const entries = DATA.entries.map((e) => ({
  ...e,
  _title: norm(e.title), _summary: norm(e.summary),
  _text: norm([e.recommendation, e.why_it_matters, ...(e.how_to_do_it ?? []), ...(e.warning_signs ?? []), ...(e.emergency_action ?? []), ...(e.do_not ?? []), e.myth_claim ?? '', e.category_name].join(' ')),
}));

function groupsFor(token) {
  return DATA.synonyms.filter((g) => g.tag === token || g.terms.some((t) => {
    const n = norm(t);
    return (n.length >= 2 || token.length >= 2) && (token.includes(n) || (token.length >= 2 && n.includes(token)));
  }));
}

function score(e, tokens) {
  let total = 0;
  for (const tok of tokens) {
    let s = 0;
    if (e._title.includes(tok)) s += 6;
    if (e._summary.includes(tok)) s += 3;
    if (e._text.includes(tok)) s += 1;
    for (const g of groupsFor(tok)) {
      if (e.tags.includes(g.tag)) { s += 4; break; }
      if (g.terms.some((t) => e._text.includes(norm(t)))) s += 1;
    }
    if (!s) return 0;
    total += s;
  }
  return total;
}

function search(q) {
  const tokens = norm(q).split(' ').filter(Boolean);
  let rows = entries.map((e) => ({ e, s: score(e, tokens) })).filter((r) => r.s > 0);
  if (!rows.length && tokens.length > 1) {
    // fall back to "any token" so long natural-language questions still find something
    rows = entries.map((e) => ({ e, s: tokens.reduce((a, t) => a + score(e, [t]), 0) })).filter((r) => r.s > 0);
  }
  if (!rows.length && tokens.length === 1 && tokens[0].length > 2) {
    // a single long Chinese phrase: try every 2-character window
    const t = tokens[0];
    const grams = [...new Set(Array.from({ length: t.length - 1 }, (_, i) => t.slice(i, i + 2)))];
    rows = entries.map((e) => ({ e, s: grams.reduce((a, g) => a + score(e, [g]), 0) })).filter((r) => r.s > 0);
  }
  const urgencyBoost = { emergency: 3, urgent: 1 };
  return rows.sort((a, b) => (b.s + (urgencyBoost[b.e.urgency] ?? 0)) - (a.s + (urgencyBoost[a.e.urgency] ?? 0))).map((r) => r.e);
}

const grade = (e) => e.type === 'myth' && e.myth_verdict ? `误区判定：${LABEL.verdict[e.myth_verdict]}`
  : e.cost_effectiveness.graded ? `性价比 ${e.cost_effectiveness.grade}` : '不评分';
const li = (xs) => (xs ?? []).map((x) => `- ${x}`).join('\n');

function full(e) {
  const out = [`### ${e.id} ${e.title}`, '',
    `**类型** ${LABEL.type[e.type]} · **${grade(e)}** · **证据 ${e.evidence.level}**（${LABEL.evidence[e.evidence.level]}） · **审核** ${LABEL.review[e.review_status]}`, '',
    `**一句话结论**：${e.summary}`, ''];
  if (e.emergency_action?.length) out.push('**现在就做**', li(e.emergency_action), '');
  if (e.myth_claim) out.push(`**常见说法**：${e.myth_claim}`, '');
  out.push(`**建议**：${e.recommendation}`, '', `**为什么**：${e.why_it_matters}`, '');
  if (e.how_to_do_it?.length) out.push('**怎么做**', li(e.how_to_do_it), '');
  if (e.do_not?.length) out.push('**不要做**', li(e.do_not), '');
  if (e.warning_signs?.length) out.push('**需要就医的信号**', li(e.warning_signs), '');
  if (e.region_notes) out.push(`**地区差异**：${e.region_notes}`, '');
  out.push(`**证据说明**：${e.evidence.summary}`, '');
  if (e.evidence.gaps?.length) out.push('**还不知道 / 待补充**', li(e.evidence.gaps), '');
  out.push('**来源**');
  for (const s of e.sources) {
    out.push(`- ${s.title}（${s.organization}，${s.year}）${s.doi ? ` DOI ${s.doi}` : ''} ${s.url}`,
      `  - 支持了什么：${s.supports}`,
      `  - 核对：${LABEL.support[s.support_check]}；读到：${LABEL.read[s.verification.read_level]}${s.locator ? `；位置：${s.locator}` : ''}${s.conflict_of_interest ? `；利益冲突：${s.conflict_of_interest}` : ''}`);
  }
  out.push('', `网页：${e.url_path}`);
  return out.join('\n');
}
const brief = (e) => `- ${e.id} ${e.title}（${LABEL.type[e.type]} · ${grade(e)} · 证据 ${e.evidence.level}）— ${e.summary}`;

const header = `> 来源：《高性价比猫猫指南》知识库（${DATA.stats.entries} 条；兽医审核 ${DATA.stats.vet_reviewed} 条）。以下内容不能代替兽医诊断。`;
const print = (s) => process.stdout.write(s + '\n');

if (CATEGORIES) {
  print(DATA.categories.map((c) => `- ${c.id}：${c.name.zh}（${entries.filter((e) => e.category === c.id).length} 条）${c.high_risk ? ' [高风险]' : ''}`).join('\n'));
} else if (ID) {
  const e = entries.find((x) => x.id.toLowerCase() === ID.toLowerCase());
  print(e ? `${header}\n\n${full(e)}` : `未找到 ${ID}。`);
} else if (EMERGENCY) {
  print(`${header}\n\n## 紧急情况条目\n\n${entries.filter((e) => e.type === 'emergency' || e.urgency === 'emergency').map(brief).join('\n')}`);
} else if (CATEGORY) {
  print(`${header}\n\n${entries.filter((e) => e.category === CATEGORY).map(brief).join('\n') || '该分类没有条目。'}`);
} else if (query) {
  const res = search(query).slice(0, LIMIT);
  if (!res.length) {
    print(`${header}\n\n没有找到与“${query}”相关的条目。**指南中没有这方面的内容**——如果你回答，请明确说明那是模型自身知识，不是本指南的内容。`);
  } else {
    const em = res.filter((e) => e.type === 'emergency' || e.urgency === 'emergency');
    const parts = [header];
    if (em.length) parts.push(`> 🚨 匹配到紧急情况条目（${em.map((e) => e.id).join('、')}）。先给出“现在就做”的行动建议，再解释其他内容。`);
    parts.push(`## 匹配结果（${res.length}）`, ...res.slice(0, FULL).map(full));
    if (res.length > FULL) parts.push('## 其他相关条目', res.slice(FULL).map(brief).join('\n'), '（用 --id CG-xxxx 查看全文）');
    print(parts.join('\n\n'));
  }
} else {
  print('用法：node search.mjs <问题或关键词> | --id CG-0007 | --emergency | --category <id> | --categories');
  process.exitCode = 2;
}
