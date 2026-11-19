/**
 * Checks that every source URL (and archive URL) responds. Some publishers block bots (403);
 * those are reported as warnings, not failures, because the DOI check covers existence.
 * doi.org URLs are skipped entirely: Crossref verification is the authoritative existence check.
 */
import { loadKnowledgeBase } from '../src/load.js';

const kb = loadKnowledgeBase();
let failed = 0;
for (const s of kb.sources) {
  for (const url of [s.url, s.archive_url].filter(Boolean) as string[]) {
    // doi.org links are verified through Crossref (npm run verify:sources); publishers often block bots.
    if (s.doi && url.startsWith('https://doi.org/')) { console.log(`· ${s.id} DOI link — covered by verify:sources`); continue; }
    try {
      const ctl = AbortSignal.timeout(20000);
      let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctl, headers: { 'User-Agent': 'Mozilla/5.0 (cost-effective-cat-guide link checker)' } });
      if (res.status === 405 || res.status === 403) res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 (cost-effective-cat-guide link checker)' } });
      if (res.ok) console.log(`✓ ${res.status} ${s.id} ${url}`);
      else if ([401, 403, 429].includes(res.status) && s.doi) console.log(`! ${res.status} ${s.id} ${url} (publisher blocks bots; DOI verified separately)`);
      else { failed++; console.log(`✗ ${res.status} ${s.id} ${url}`); }
    } catch (e) {
      if (s.doi) console.log(`! ERR ${s.id} ${url}: ${(e as Error).message} (has DOI)`);
      else { failed++; console.log(`✗ ERR ${s.id} ${url}: ${(e as Error).message}`); }
    }
  }
}
process.exit(failed ? 1 : 0);
