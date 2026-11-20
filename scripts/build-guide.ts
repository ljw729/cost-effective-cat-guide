/**
 * Generates GUIDE.md and generated/guide.json from data/.
 *   npm run build:guide            write outputs
 *   npm run build:guide -- --check fail if outputs are out of date (used in CI)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadKnowledgeBase, ROOT } from '../src/load.js';
import { validateKnowledgeBase } from '../src/validate.js';
import { buildGuide } from '../src/build.js';
import { renderGuideMarkdown } from '../src/render-markdown.js';

const check = process.argv.includes('--check');
const kb = loadKnowledgeBase();
const errors = validateKnowledgeBase(kb).filter((i) => i.level === 'error');
if (errors.length) {
  console.error(`Refusing to build: ${errors.length} validation errors. Run npm run validate.`);
  process.exit(1);
}
const guide = buildGuide(kb);
const outputs: Record<string, string> = {
  'GUIDE.md': renderGuideMarkdown(guide),
  'generated/guide.json': JSON.stringify(guide, null, 2) + '\n',
  // Self-contained data for the AI skill: the skill folder works wherever it is copied.
  'skills/cost-effective-cat-guide/data/guide-data.json': JSON.stringify({
    note: 'Generated from data/ by npm run build:guide. Do not edit by hand.',
    stats: guide.stats,
    synonyms: kb.synonyms.map((g) => ({ tag: g.tag, terms: g.terms.map(String) })),
    categories: guide.categories.map((c) => ({ id: c.id, name: c.name, high_risk: c.high_risk })),
    entries: guide.entries,
  }) + '\n',
};

let stale = 0;
for (const [rel, content] of Object.entries(outputs)) {
  const path = join(ROOT, rel);
  const current = existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n') : null;
  if (check) {
    if (current !== content) { stale++; console.error(`✗ ${rel} is out of date — run npm run build:guide`); }
    else console.log(`✓ ${rel}`);
  } else {
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, content);
    console.log(`wrote ${rel}`);
  }
}
const s = guide.stats;
console.log(`${s.entries} entries · grades ${JSON.stringify(s.by_grade)} · evidence ${JSON.stringify(s.by_evidence)}`);
process.exit(stale ? 1 : 0);
