import { LABELS, type BuiltEntry, type BuiltGuide } from './build.js';

const DISCLAIMER =
  '> **免责声明**：本指南整理公开的兽医学资料，用于教育和信息参考，**不能代替持证兽医的诊断和治疗**。' +
  '猫出现异常时，医疗紧急程度永远优先于花费。目前所有条目都由 AI 研究整理，**尚未经过兽医审核**。';

function anchor(e: BuiltEntry): string {
  return e.id.toLowerCase();
}

function citation(s: BuiltEntry['sources'][number]): string {
  const authors = s.authors?.length ? `${s.authors[0]}${s.authors.length > 1 ? ' 等' : ''}. ` : '';
  const container = s.container && s.container !== s.organization ? ` *${s.container}*.` : '';
  const doi = s.doi ? ` DOI: [${s.doi}](https://doi.org/${s.doi})` : ` [链接](${s.url})`;
  return `${authors}${s.title}. ${s.organization}, ${s.year}.${container}${doi}`;
}

export function renderEntry(e: BuiltEntry, opts: { headingLevel?: number } = {}): string {
  const h = '#'.repeat(opts.headingLevel ?? 3);
  const ce = e.cost_effectiveness;
  const out: string[] = [];
  out.push(`${h} <a id="${anchor(e)}"></a>${e.type === 'emergency' ? '🚨 ' : ''}${e.title}`);
  out.push('');
  if (e.type === 'emergency') {
    out.push('> [!CAUTION]');
    out.push(`> **${e.summary}**`);
    out.push('>');
    out.push('> 出现这种情况，不要继续浏览指南，请尽快联系兽医或急诊。');
    out.push('');
    out.push('**现在就做：**');
    out.push('');
    for (const a of e.emergency_action ?? []) out.push(`1. ${a}`);
  } else {
    out.push(`**结论：** ${e.summary}`);
  }
  out.push('');

  const meta: string[] = [
    `\`${e.id}\``,
    LABELS.type[e.type]!,
    `证据 **${e.evidence.level}**（${LABELS.evidence[e.evidence.level]}）`,
  ];
  if (ce.graded) meta.push(`性价比 **${ce.grade}**（${LABELS.grade[ce.grade!]}）`);
  if (e.type === 'myth' && e.myth_verdict) meta.push(`判断：**${LABELS.verdict[e.myth_verdict]}**`);
  meta.push(`紧急程度：${LABELS.urgency[e.urgency]}`);
  out.push(meta.join(' · '));
  out.push('');
  if (e.type !== 'emergency') {
    out.push(`适用：${e.applies_to.map((a) => LABELS.applies[a]).join('、')} · 花费：${LABELS.money[e.scores.money_cost]} · 时间 ${e.scores.time_cost}/5 · 难度 ${e.scores.effort}/5 · 收益 ${e.scores.benefit}/5`);
    out.push('');
  }
  if (e.myth_claim && e.type === 'myth') { out.push(`**常见说法：** ${e.myth_claim}`); out.push(''); }
  out.push(`**建议：** ${e.recommendation}`);
  out.push('');
  out.push(`**为什么：** ${e.why_it_matters}`);
  out.push('');
  const list = (title: string, items?: string[]) => {
    if (!items?.length) return;
    out.push(`**${title}：**`);
    out.push('');
    for (const i of items) out.push(`- ${i}`);
    out.push('');
  };
  if (e.type !== 'emergency') list('怎么做', e.how_to_do_it);
  list('不要这样做', e.do_not);
  list('需要警惕的信号', e.warning_signs);
  list('例外与注意', e.exceptions);
  if (e.region_notes) { out.push(`**地区差异：** ${e.region_notes}`); out.push(''); }
  out.push(`**证据说明：** ${e.evidence.summary}`);
  out.push('');
  if (ce.caps.length) { out.push(`*评分说明：${ce.caps.join('；')}。*`); out.push(''); }
  if (e.evidence.gaps?.length) list('尚未解决', e.evidence.gaps);
  out.push('**来源：**');
  out.push('');
  for (const s of e.sources) {
    out.push(`- ${citation(s)}`);
    out.push(`  - 支持内容：${s.supports}（${LABELS.support[s.support_check]}，读到：${LABELS.read[s.verification.read_level]}${s.locator ? `，位置：${s.locator}` : ''}）`);
  }
  out.push('');
  out.push(`*${LABELS.review[e.review_status]} · 最近复核 ${e.last_reviewed}*`);
  out.push('');
  return out.join('\n');
}

export function renderGuideMarkdown(g: BuiltGuide): string {
  const byId = new Map(g.entries.map((e) => [e.id, e]));
  const out: string[] = [];
  out.push('<!-- 本文件由 `npm run build:guide` 从 data/ 自动生成，请勿手动编辑。 -->');
  out.push('');
  out.push('# 高性价比猫猫指南（完整版）');
  out.push('');
  out.push('*The Cost-Effective Cat Guide — Research Preview*');
  out.push('');
  out.push(DISCLAIMER);
  out.push('');
  const ev = g.stats.by_evidence;
  out.push(`共 ${g.stats.entries} 条 · 来源 ${g.stats.sources} 条 · 证据 A ${ev.A ?? 0} / B ${ev.B ?? 0} / C ${ev.C ?? 0} / D ${ev.D ?? 0} · 兽医审核 ${g.stats.vet_reviewed} 条`);
  out.push('');
  out.push('## 先看这里：紧急情况');
  out.push('');
  for (const e of g.entries.filter((x) => x.type === 'emergency')) out.push(`- 🚨 [${e.title}](#${anchor(e)})：${e.summary}`);
  out.push('');
  out.push('## 目录');
  out.push('');
  for (const c of g.categories) {
    if (!c.entry_ids.length) continue;
    out.push(`- **${c.name.zh}**`);
    for (const id of c.entry_ids) {
      const e = byId.get(id)!;
      const tag = e.cost_effectiveness.grade ? ` \`${e.cost_effectiveness.grade}\`` : e.type === 'emergency' ? ' 🚨' : '';
      out.push(`  - [${e.title}](#${anchor(e)})${tag}`);
    }
  }
  out.push('');
  out.push('## 怎么读这份指南');
  out.push('');
  out.push('- **证据等级** A 强 · B 中 · C 有限 · D 不足或有争议。见 [证据方法](docs/evidence-methodology.md)。');
  out.push('- **性价比** S 极高 · A 高 · B 中 · C 较低 · D 通常不值得优先投入。紧急情况和误区不评分。见 [评分方法](docs/scoring-methodology.md)。');
  out.push('- **来源**后面注明了这条来源具体支持什么、我们读到了全文还是摘要、是否已核对。');
  out.push('');
  for (const c of g.categories) {
    if (!c.entry_ids.length) continue;
    out.push(`## ${c.name.zh}`);
    out.push('');
    for (const id of c.entry_ids) out.push(renderEntry(byId.get(id)!));
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
