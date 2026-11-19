import type { Source } from './types.js';

export function normTitle(t: string): string {
  return t.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

interface CrossrefWork {
  title?: string[];
  author?: { family?: string; name?: string }[];
  issued?: { 'date-parts'?: number[][] };
  'published-print'?: { 'date-parts'?: number[][] };
  'published-online'?: { 'date-parts'?: number[][] };
}

/** Returns a list of mismatches between our registry and Crossref metadata (empty = match). */
export function compareMetadata(s: Source, w: CrossrefWork): string[] {
  const problems: string[] = [];
  const title = w.title?.[0] ?? '';
  const a = normTitle(s.title), b = normTitle(title);
  if (!(a === b || a.includes(b) || b.includes(a))) problems.push(`title mismatch: "${title}"`);
  const years = [w.issued, w['published-print'], w['published-online']]
    .map((d) => d?.['date-parts']?.[0]?.[0]).filter((y): y is number => typeof y === 'number');
  if (years.length && !years.includes(s.year)) problems.push(`year mismatch: Crossref ${years.join('/')}`);
  const first = s.authors?.[0];
  if (first && w.author?.length) {
    const fam = w.author.map((x) => (x.family ?? x.name ?? '').toLowerCase());
    if (!fam.some((f) => f.includes(first.toLowerCase()))) problems.push(`author mismatch: Crossref ${fam.slice(0, 3).join(', ')}`);
  }
  return problems;
}
