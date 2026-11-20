/**
 * Duplicate detection without external services.
 *
 * "Semantic" similarity is approximated by: (1) mapping colloquial synonyms to a canonical tag token
 * using data/taxonomy/synonyms.yaml, then (2) TF-IDF weighted cosine over character bigrams (works for
 * Chinese without a tokenizer) and ASCII words. Combined with tag and source overlap.
 * Limitations are documented in docs/content-workflow.md; an embedding-based check can be added later
 * behind the same interface.
 */
import type { Entry, SynonymGroup } from './types.js';

export interface DuplicatePair {
  a: string;
  b: string;
  score: number;
  parts: { title: number; recommendation: number; tags: number; sources: number };
}

const WEIGHTS = { title: 0.35, recommendation: 0.35, tags: 0.15, sources: 0.15 };
export const DUPLICATE_ERROR = 0.55;
export const DUPLICATE_WARN = 0.4;

const STOP = new Set(['的', '了', '和', '与', '在', '是', '要', '让', '给', '把', '对', '猫', '猫咪', '一个', '可以', '应该']);

export function normalize(text: string, synonyms: SynonymGroup[]): string {
  let t = text.toLowerCase();
  // longest terms first so "尿不出来" wins over "尿"
  const tags = synonyms.map((g) => g.tag);
  const pairs = synonyms.flatMap((g, gi) => g.terms.map((term) => [String(term).toLowerCase(), gi] as const));
  pairs.sort((x, y) => y[0].length - x[0].length);
  // Replace with private-use placeholders first, so a later (shorter) term can never
  // match inside an already-inserted token (e.g. "ate" inside "§fresh-water§").
  for (const [term, gi] of pairs) if (term.length >= 2) t = t.split(term).join(`${gi}`);
  return t.replace(/(\d+)/g, (_, i: string) => ` §${tags[Number(i)]}§ `);
}

export function features(text: string): Map<string, number> {
  const m = new Map<string, number>();
  const add = (k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const tok of text.match(/§[a-z0-9-]+§/g) ?? []) add(tok);
  const rest = text.replace(/§[a-z0-9-]+§/g, ' ');
  for (const w of rest.match(/[a-z0-9]{2,}/g) ?? []) add(`w:${w}`);
  const han = (rest.match(/[一-鿿]+/g) ?? []).map((s) => [...s].filter((c) => !STOP.has(c)).join(''));
  for (const run of han) {
    if (run.length === 1) add(`c:${run}`);
    for (let i = 0; i < run.length - 1; i++) add(`b:${run.slice(i, i + 2)}`);
  }
  return m;
}

function idf(docs: Map<string, number>[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const d of docs) for (const k of d.keys()) df.set(k, (df.get(k) ?? 0) + 1);
  const n = docs.length;
  const out = new Map<string, number>();
  for (const [k, v] of df) out.set(k, Math.log((n + 1) / (v + 0.5)) + 1);
  return out;
}

export function cosine(a: Map<string, number>, b: Map<string, number>, w?: Map<string, number>): number {
  let dot = 0, na = 0, nb = 0;
  const wt = (k: string) => w?.get(k) ?? 1;
  for (const [k, v] of a) { const x = v * wt(k); na += x * x; const y = b.get(k); if (y) dot += x * y * wt(k); }
  for (const [k, v] of b) { const y = v * wt(k); nb += y * y; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function jaccard<T>(a: T[], b: T[]): number {
  const A = new Set(a), B = new Set(b);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export function findDuplicates(entries: Pick<Entry, 'id' | 'title' | 'recommendation' | 'tags' | 'sources'>[], synonyms: SynonymGroup[]): DuplicatePair[] {
  const titles = entries.map((e) => features(normalize(e.title, synonyms)));
  const recs = entries.map((e) => features(normalize(`${e.title} ${e.recommendation}`, synonyms)));
  const wTitle = idf(titles), wRec = idf(recs);
  const out: DuplicatePair[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]!, b = entries[j]!;
      const parts = {
        title: cosine(titles[i]!, titles[j]!, wTitle),
        recommendation: cosine(recs[i]!, recs[j]!, wRec),
        tags: jaccard(a.tags, b.tags),
        sources: jaccard(a.sources.map((s) => s.id), b.sources.map((s) => s.id)),
      };
      const score = WEIGHTS.title * parts.title + WEIGHTS.recommendation * parts.recommendation + WEIGHTS.tags * parts.tags + WEIGHTS.sources * parts.sources;
      if (score >= DUPLICATE_WARN) out.push({ a: a.id, b: b.id, score: Math.round(score * 100) / 100, parts });
    }
  }
  return out.sort((x, y) => y.score - x.score);
}
