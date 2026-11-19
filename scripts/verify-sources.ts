/**
 * Verifies that every DOI resolves on Crossref and that title / year / first author match the registry.
 * Reports only; it never edits data. Usage: npm run verify:sources [-- source-id ...]
 * Note: "exists + metadata match" says nothing about whether the source SUPPORTS a claim.
 */
import { loadKnowledgeBase } from '../src/load.js';
import { compareMetadata } from '../src/citations.js';

const only = new Set(process.argv.slice(2));
const kb = loadKnowledgeBase();
let failed = 0;
for (const s of kb.sources) {
  if (only.size && !only.has(s.id)) continue;
  if (!s.doi) { console.log(`· ${s.id}: no DOI (check URL with npm run check:links)`); continue; }
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(s.doi)}`, { headers: { 'User-Agent': 'cost-effective-cat-guide-verifier/0.1' } });
    if (!res.ok) { failed++; console.log(`✗ ${s.id}: Crossref HTTP ${res.status} for ${s.doi}`); continue; }
    const msg = (await res.json()).message;
    const problems = compareMetadata(s, msg);
    if (problems.length) { failed++; console.log(`✗ ${s.id}: ${problems.join('; ')}`); }
    else console.log(`✓ ${s.id}`);
  } catch (e) { failed++; console.log(`✗ ${s.id}: ${(e as Error).message}`); }
  await new Promise((r) => setTimeout(r, 250));
}
process.exit(failed ? 1 : 0);
