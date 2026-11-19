import type { KnowledgeBase } from './types.js';

export interface StaleItem {
  id: string;
  title: string;
  last_reviewed: string;
  due: string;
  months_overdue: number;
  reason: string;
}

function addMonths(date: string, months: number): Date {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/**
 * Finds entries that need re-review. It NEVER changes content — it only reports.
 * Reasons: review period elapsed; a cited source has been marked superseded.
 */
export function findStale(kb: KnowledgeBase, today = new Date()): StaleItem[] {
  const months = new Map(kb.categories.map((c) => [c.id, c.review_months]));
  const superseded = new Map(kb.sources.filter((s) => s.superseded_by).map((s) => [s.id, s.superseded_by!]));
  const out: StaleItem[] = [];
  for (const e of kb.entries) {
    const period = e.type === 'emergency' ? 12 : (months.get(e.category) ?? 24);
    const due = addMonths(e.last_reviewed, period);
    if (due <= today) {
      const overdue = (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      out.push({ id: e.id, title: e.title, last_reviewed: e.last_reviewed, due: due.toISOString().slice(0, 10), months_overdue: Math.floor(overdue), reason: `review period of ${period} months elapsed` });
    }
    for (const ref of e.sources) {
      const by = superseded.get(ref.id);
      if (by) out.push({ id: e.id, title: e.title, last_reviewed: e.last_reviewed, due: e.last_reviewed, months_overdue: 0, reason: `cites ${ref.id}, superseded by ${by}` });
    }
  }
  return out;
}
