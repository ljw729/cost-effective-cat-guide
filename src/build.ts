/**
 * Builds the enriched, output-ready view of the knowledge base.
 * Every output (GUIDE.md, website, PDF/EPUB, AI skill) consumes this — never the YAML directly —
 * so scores, labels and source resolution are computed in exactly one place.
 */
import { score, GRADE_LABELS, type Grade, type ScoreResult } from './scoring.js';
import type { Entry, KnowledgeBase, Source, Category } from './types.js';

export interface BuiltSource extends Source {
  supports: string;
  support_check: string;
  locator?: string;
}

export interface BuiltEntry extends Omit<Entry, 'sources' | '_file'> {
  category_name: string;
  cost_effectiveness: ScoreResult;
  sources: BuiltSource[];
  url_path: string;
}

export interface BuiltGuide {
  schema_version: 1;
  generated_from: string;
  stats: {
    entries: number;
    sources: number;
    by_evidence: Record<string, number>;
    by_grade: Record<string, number>;
    by_type: Record<string, number>;
    vet_reviewed: number;
  };
  categories: (Category & { entry_ids: string[] })[];
  entries: BuiltEntry[];
}

export const LABELS = {
  type: {
    recommendation: '建议', dont: '不要做', buying_guide: '选购 / 值不值', emergency: '紧急情况', myth: '误区', evidence_gap: '证据不足',
  } as Record<string, string>,
  urgency: { routine: '日常', important: '重要', urgent: '尽快', emergency: '紧急' } as Record<string, string>,
  evidence: { A: '强证据', B: '中等证据', C: '有限证据', D: '证据不足 / 有争议' } as Record<string, string>,
  verdict: {
    incorrect: '错误', mostly_incorrect: '大多错误', uncertain: '尚无定论', partly_correct: '部分正确', correct: '正确',
  } as Record<string, string>,
  review: {
    draft: '草稿', ai_researched: 'AI 研究整理，尚未经兽医审核', maintainer_reviewed: '维护者已审核，尚未经兽医审核', vet_reviewed: '兽医已审核',
  } as Record<string, string>,
  support: { pending: '待核对', ai_checked: 'AI 已核对', human_checked: '人工已核对', vet_checked: '兽医已核对' } as Record<string, string>,
  read: { full_text: '全文', abstract: '摘要', page: '网页正文', metadata_only: '仅元数据' } as Record<string, string>,
  applies: {
    all: '所有猫', kitten: '幼猫', adult: '成年猫', senior: '老年猫', indoor: '室内猫', outdoor: '外出猫', 'multi-cat': '多猫家庭', male: '公猫', 'special-condition': '特殊情况',
  } as Record<string, string>,
  money: ['几乎免费', '很低', '低', '中', '高', '很高'],
  grade: GRADE_LABELS as Record<Grade, string>,
};

const GRADE_ORDER = ['S', 'A', 'B', 'C', 'D'];

export function sortEntries(a: BuiltEntry, b: BuiltEntry): number {
  const ea = a.type === 'emergency' ? 0 : 1, eb = b.type === 'emergency' ? 0 : 1;
  if (ea !== eb) return ea - eb;
  const ga = a.cost_effectiveness.grade ? GRADE_ORDER.indexOf(a.cost_effectiveness.grade) : 9;
  const gb = b.cost_effectiveness.grade ? GRADE_ORDER.indexOf(b.cost_effectiveness.grade) : 9;
  if (ga !== gb) return ga - gb;
  return a.id.localeCompare(b.id);
}

export function buildGuide(kb: KnowledgeBase): BuiltGuide {
  const srcById = new Map(kb.sources.map((s) => [s.id, s]));
  const catById = new Map(kb.categories.map((c) => [c.id, c]));
  const entries: BuiltEntry[] = kb.entries.map((e) => {
    const { _file, sources, ...rest } = e;
    return {
      ...rest,
      category_name: catById.get(e.category)?.name.zh ?? e.category,
      cost_effectiveness: score({ type: e.type, ...e.scores, evidence_level: e.evidence.level }),
      sources: sources.map((r) => ({ ...srcById.get(r.id)!, supports: r.supports, support_check: r.support_check, locator: r.locator })),
      url_path: `/entries/${e.slug}/`,
    };
  });
  entries.sort(sortEntries);

  const count = (f: (e: BuiltEntry) => string | null) => {
    const m: Record<string, number> = {};
    for (const e of entries) { const k = f(e); if (k) m[k] = (m[k] ?? 0) + 1; }
    return m;
  };
  const categories = [...kb.categories].sort((a, b) => a.order - b.order).map((c) => ({
    ...c, entry_ids: entries.filter((e) => e.category === c.id).map((e) => e.id),
  }));

  return {
    schema_version: 1,
    generated_from: 'data/ (do not edit generated files by hand)',
    stats: {
      entries: entries.length,
      sources: kb.sources.length,
      by_evidence: count((e) => e.evidence.level),
      by_grade: count((e) => e.cost_effectiveness.grade),
      by_type: count((e) => e.type),
      vet_reviewed: entries.filter((e) => e.review_status === 'vet_reviewed').length,
    },
    categories,
    entries,
  };
}
