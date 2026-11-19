import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadKnowledgeBase, readYaml, ROOT } from '../src/load.js';
import { findDuplicates, DUPLICATE_ERROR } from '../src/dedupe.js';

/** Pairs a maintainer reviewed and decided are NOT duplicates: [{ a, b, reason }]. */
const allowFile = join(ROOT, 'data/taxonomy/dedupe-allow.yaml');
const allow = existsSync(allowFile) ? (readYaml<{ a: string; b: string; reason: string }[]>(allowFile) ?? []) : [];
const allowed = new Set(allow.flatMap((p) => [`${p.a}|${p.b}`, `${p.b}|${p.a}`]));

const kb = loadKnowledgeBase();
const pairs = findDuplicates(kb.entries, kb.synonyms);
const title = new Map(kb.entries.map((e) => [e.id, e.title]));
let errors = 0;
for (const p of pairs) {
  const ok = allowed.has(`${p.a}|${p.b}`);
  const isErr = p.score >= DUPLICATE_ERROR && !ok;
  if (isErr) errors++;
  console.log(`${isErr ? '✗' : ok ? '·' : '!'} ${p.score.toFixed(2)}  ${p.a} ${title.get(p.a)}  ⇄  ${p.b} ${title.get(p.b)}  (title ${p.parts.title.toFixed(2)}, rec ${p.parts.recommendation.toFixed(2)}, tags ${p.parts.tags.toFixed(2)}, src ${p.parts.sources.toFixed(2)})${ok ? ' [allowed]' : ''}`);
}
console.log(`\n${pairs.length} similar pairs, ${errors} likely duplicates (≥ ${DUPLICATE_ERROR}).`);
if (errors) console.log('Merge them, or add a reviewed exception to data/taxonomy/dedupe-allow.yaml.');
process.exit(errors ? 1 : 0);
