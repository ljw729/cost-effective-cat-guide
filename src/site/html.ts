/**
 * Shared HTML rendering for every HTML-based output (website, offline.html, print/PDF, EPUB).
 * Everything here is a pure function of the BuiltGuide, so all formats show the same content.
 */
import { LABELS, type BuiltEntry, type BuiltGuide, type BuiltSource } from '../build.js';

export const SITE_TITLE = '高性价比猫猫指南';
export const SITE_TITLE_EN = 'The Cost-Effective Cat Guide';
export const DISCLAIMER =
  '本指南整理公开的兽医学资料，仅供教育和信息参考，不能代替持证兽医的诊断和治疗。猫出现急症时，医疗紧急程度优先于花费。';

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]!);

export interface LinkContext {
  /** Returns the href for an entry, e.g. "/entries/<slug>/" on the site or "#cg-0001" in a single file. */
  entryHref: (e: Pick<BuiltEntry, 'id' | 'slug'>) => string;
  /** Returns the href for a category, or null when the format has no category pages. */
  categoryHref: (categoryId: string) => string | null;
  /** XHTML output (EPUB) needs self-closing void tags. */
  xhtml?: boolean;
}

export function gradeBadge(e: BuiltEntry): string {
  const ce = e.cost_effectiveness;
  if (e.type === 'myth' && e.myth_verdict) {
    return `<span class="badge verdict verdict-${esc(e.myth_verdict)}" title="误区判定">${esc(LABELS.verdict[e.myth_verdict])}</span>`;
  }
  if (!ce.graded || !ce.grade) return `<span class="badge grade grade-none" title="${esc(ce.reason_not_graded ?? '不评分')}">不评分</span>`;
  return `<span class="badge grade grade-${esc(ce.grade)}" title="性价比 ${esc(ce.grade)}：${esc(LABELS.grade[ce.grade])}">性价比 ${esc(ce.grade)}</span>`;
}

export function evidenceBadge(e: BuiltEntry): string {
  return `<span class="badge evidence evidence-${esc(e.evidence.level)}" title="${esc(LABELS.evidence[e.evidence.level])}">证据 ${esc(e.evidence.level)}</span>`;
}

export function typeBadge(e: BuiltEntry): string {
  return `<span class="badge type type-${esc(e.type)}">${esc(LABELS.type[e.type])}</span>`;
}

const list = (items: string[] | undefined, cls = ''): string =>
  items && items.length ? `<ul${cls ? ` class="${cls}"` : ''}>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '';

function sourceItem(s: BuiltSource): string {
  const meta = [s.organization, s.container && s.container !== s.organization ? s.container : '', String(s.year)].filter(Boolean).join(' · ');
  const doi = s.doi ? ` · DOI <a href="https://doi.org/${esc(s.doi)}" rel="noopener">${esc(s.doi)}</a>` : '';
  const coi = s.conflict_of_interest ? `<div class="coi">利益冲突 / 资助：${esc(s.conflict_of_interest)}</div>` : '';
  return `<li class="source">
<div class="source-title"><a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a></div>
<div class="source-meta">${esc(meta)}${doi} · Tier ${esc(s.tier)}</div>
<div class="source-supports"><strong>支持了什么：</strong>${esc(s.supports)}</div>
<div class="source-check">${esc(LABELS.support[s.support_check] ?? s.support_check)} · 读到：${esc(LABELS.read[s.verification.read_level] ?? s.verification.read_level)}${s.locator ? ` · 位置：${esc(s.locator)}` : ''}</div>
${coi}</li>`;
}

function scoreTable(e: BuiltEntry): string {
  const s = e.scores;
  const ce = e.cost_effectiveness;
  const rows: [string, string][] = [
    ['收益', `${s.benefit} / 5`],
    ['降低风险', `${s.risk_reduction} / 5`],
    ['花钱', `${s.money_cost} / 5（${LABELS.money[s.money_cost] ?? ''}）`],
    ['花时间', `${s.time_cost} / 5`],
    ['难度', `${s.effort} / 5`],
    ['潜在伤害', `${s.harm_potential} / 3`],
  ];
  const result = ce.graded && ce.grade
    ? `<p class="score-result">综合得分 ${ce.score?.toFixed(2)} → <strong>${esc(ce.grade)}</strong>（${esc(LABELS.grade[ce.grade])}）${ce.caps.length ? `；封顶规则：${esc(ce.caps.join('；'))}` : ''}</p>`
    : `<p class="score-result">${esc(ce.reason_not_graded ?? '不评分')}</p>`;
  return `<table class="scores"><tbody>${rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>${result}${s.rationale ? `<p class="muted">${esc(s.rationale)}</p>` : ''}`;
}

/** Full entry body. `headingLevel` lets single-file formats nest entries under category headings. */
export function renderEntryBody(e: BuiltEntry, guide: BuiltGuide, ctx: LinkContext, headingLevel = 1): string {
  const h = (n: number) => `h${Math.min(6, headingLevel + n)}`;
  const byId = new Map(guide.entries.map((x) => [x.id, x]));
  const related = (e.related ?? []).map((id) => byId.get(id)).filter((x): x is BuiltEntry => !!x);
  const catHref = ctx.categoryHref(e.category);
  const isEmergency = e.type === 'emergency';
  const reviewWarn = e.review_status !== 'vet_reviewed' && (e.medical_review_required || isEmergency)
    ? `<p class="review-warning" role="note">⚠️ 本条涉及医疗内容，${esc(LABELS.review[e.review_status])}。</p>`
    : `<p class="review-status">${esc(LABELS.review[e.review_status])}</p>`;
  const parts: string[] = [];
  parts.push(`<${h(0)} class="entry-title">${esc(e.title)}</${h(0)}>`);
  parts.push(`<div class="entry-meta"><span class="entry-id">${esc(e.id)}</span>${typeBadge(e)}${gradeBadge(e)}${evidenceBadge(e)}<span class="badge urgency urgency-${esc(e.urgency)}">${esc(LABELS.urgency[e.urgency])}</span>${catHref ? `<a class="badge category" href="${esc(catHref)}">${esc(e.category_name)}</a>` : `<span class="badge category">${esc(e.category_name)}</span>`}</div>`);
  parts.push(`<p class="summary">${esc(e.summary)}</p>`);
  parts.push(reviewWarn);
  if (isEmergency && e.emergency_action) {
    parts.push(`<section class="emergency-box" aria-label="紧急处理"><${h(1)}>🚨 现在就做</${h(1)}>${list(e.emergency_action, 'steps')}${e.do_not?.length ? `<${h(2)}>不要做</${h(2)}>${list(e.do_not, 'donts')}` : ''}</section>`);
  }
  if (e.type === 'myth' && e.myth_claim) {
    parts.push(`<section class="myth-box"><p><strong>常见说法：</strong>${esc(e.myth_claim)}</p><p><strong>判定：</strong>${esc(LABELS.verdict[e.myth_verdict ?? 'uncertain'])}</p></section>`);
  }
  parts.push(`<section><${h(1)}>结论 / 建议</${h(1)}><p class="recommendation">${esc(e.recommendation)}</p></section>`);
  parts.push(`<section><${h(1)}>为什么重要</${h(1)}><p>${esc(e.why_it_matters)}</p></section>`);
  if (e.how_to_do_it?.length) parts.push(`<section><${h(1)}>怎么做</${h(1)}>${list(e.how_to_do_it)}</section>`);
  if (!isEmergency && e.do_not?.length) parts.push(`<section><${h(1)}>不要做</${h(1)}>${list(e.do_not, 'donts')}</section>`);
  if (e.warning_signs?.length) parts.push(`<section class="warning-signs"><${h(1)}>需要就医的信号</${h(1)}>${list(e.warning_signs)}</section>`);
  if (e.exceptions?.length) parts.push(`<section><${h(1)}>例外</${h(1)}>${list(e.exceptions)}</section>`);
  if (e.region_notes) parts.push(`<section class="region"><${h(1)}>地区差异</${h(1)}><p>${esc(e.region_notes)}</p></section>`);
  parts.push(`<section><${h(1)}>适用</${h(1)}><p>${e.applies_to.map((a) => esc(LABELS.applies[a] ?? a)).join('、')}</p></section>`);
  parts.push(`<section><${h(1)}>证据：${esc(e.evidence.level)}（${esc(LABELS.evidence[e.evidence.level])}）</${h(1)}><p>${esc(e.evidence.summary)}</p>${e.evidence.gaps?.length ? `<details><summary>还不知道 / 待补充（${e.evidence.gaps.length}）</summary>${list(e.evidence.gaps)}</details>` : ''}</section>`);
  parts.push(`<section><${h(1)}>性价比</${h(1)}>${scoreTable(e)}</section>`);
  parts.push(`<section><${h(1)}>来源（${e.sources.length}）</${h(1)}><ol class="sources">${e.sources.map(sourceItem).join('')}</ol><p class="muted">来源存在 ≠ 来源支持结论。“支持了什么”是我们对来源内容的转述；“AI 已核对”不等于兽医审核。</p></section>`);
  if (related.length) parts.push(`<section><${h(1)}>相关条目</${h(1)}><ul class="related">${related.map((r) => `<li><a href="${esc(ctx.entryHref(r))}">${esc(r.title)}</a></li>`).join('')}</ul></section>`);
  parts.push(`<p class="entry-footer muted">创建 ${esc(e.created)} · 最近复核 ${esc(e.last_reviewed)}</p>`);
  let html = parts.join('\n');
  if (ctx.xhtml) html = html.replace(/<(br|hr|img|meta|link)([^>]*?)(?<!\/)>/g, '<$1$2 />');
  return html;
}

/** Compact card used in lists. */
export function renderCard(e: BuiltEntry, ctx: LinkContext): string {
  return `<li class="card${e.type === 'emergency' ? ' card-emergency' : ''}" data-id="${esc(e.id)}">
<a class="card-link" href="${esc(ctx.entryHref(e))}"><span class="card-title">${esc(e.title)}</span>
<span class="card-summary">${esc(e.summary)}</span></a>
<div class="card-meta">${typeBadge(e)}${gradeBadge(e)}${evidenceBadge(e)}<span class="badge category">${esc(e.category_name)}</span></div></li>`;
}
