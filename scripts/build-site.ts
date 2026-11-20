/**
 * Builds the static website into dist/site/.
 *
 *   SITE_BASE=/cost-effective-cat-guide/ SITE_URL=https://<user>.github.io/cost-effective-cat-guide/ npm run build:site
 *
 * Defaults: base "/", no absolute URLs (canonical / OpenGraph url / sitemap are omitted).
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadKnowledgeBase, ROOT } from '../src/load.js';
import { buildGuide } from '../src/build.js';
import { validateKnowledgeBase } from '../src/validate.js';
import {
  aboutPage, budgetPage, categoriesIndexPage, categoryPage, docPage, downloadsPage, emergencyPage, entryPage, homePage,
  ICON_SVG, manifest, notFoundPage, searchIndex, serviceWorker, sitemap, type DocPage, type SiteConfig,
} from '../src/site/pages.js';

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string };
const normBase = (b: string) => ('/' + b.replace(/^\/+|\/+$/g, '') + '/').replace(/^\/\/$/, '/');
const cfg: SiteConfig = {
  base: normBase(process.env.SITE_BASE ?? '/'),
  siteUrl: process.env.SITE_URL ?? '',
  repoUrl: process.env.REPO_URL ?? 'https://github.com/ljw729/cost-effective-cat-guide',
  version: pkg.version,
  buildDate: process.env.BUILD_DATE ?? new Date().toISOString().slice(0, 10),
};

const kb = loadKnowledgeBase();
const errors = validateKnowledgeBase(kb).filter((i) => i.level === 'error');
if (errors.length) {
  console.error(`✗ refusing to build: ${errors.length} validation error(s). Run npm run validate.`);
  process.exit(1);
}
const guide = buildGuide(kb);
const OUT = join(ROOT, 'dist', 'site');
rmSync(OUT, { recursive: true, force: true });

const written: string[] = [];
function put(rel: string, content: string) {
  const file = join(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  written.push(rel);
}

const DOCS: [string, string][] = [
  ['evidence-methodology', 'docs/evidence-methodology.md'],
  ['scoring-methodology', 'docs/scoring-methodology.md'],
  ['source-policy', 'docs/source-policy.md'],
  ['budget-priority', 'docs/budget-priority.md'],
  ['content-workflow', 'docs/content-workflow.md'],
  ['architecture', 'docs/architecture.md'],
  ['2026-11-round-1', 'docs/verification/2026-11-round-1.md'],
  ['2026-11-round-3', 'docs/verification/2026-11-round-3.md'],
  ['2026-11-round-4', 'docs/verification/2026-11-round-4.md'],
];
const docs: DocPage[] = DOCS.filter(([, p]) => existsSync(join(ROOT, p))).map(([slug, p]) => {
  const markdown = readFileSync(join(ROOT, p), 'utf8');
  const title = (markdown.match(/^#\s+(.+)$/m)?.[1] ?? slug).trim();
  return { slug, title, markdown };
});

put('index.html', homePage(guide, cfg));
put('emergency/index.html', emergencyPage(guide, cfg));
put('categories/index.html', categoriesIndexPage(guide, cfg));
for (const c of guide.categories) if (c.entry_ids.length) put(`categories/${c.id}/index.html`, categoryPage(guide, cfg, c.id));
for (const e of guide.entries) put(`entries/${e.slug}/index.html`, entryPage(guide, cfg, e));
put('downloads/index.html', downloadsPage(cfg));
put('budget/index.html', budgetPage(guide, cfg));
put('about/index.html', aboutPage(cfg, docs));
for (const d of docs) put(`docs/${d.slug}/index.html`, docPage(cfg, d, docs));
put('404.html', notFoundPage(cfg));
put('search-index.json', JSON.stringify(searchIndex(guide, cfg, kb.synonyms)));
put('downloads/guide.json', readFileSync(join(ROOT, 'generated', 'guide.json'), 'utf8'));
put('icon.svg', ICON_SVG);
put('manifest.webmanifest', manifest(cfg));
put('robots.txt', `User-agent: *\nAllow: /\n${cfg.siteUrl ? `Sitemap: ${cfg.siteUrl.replace(/\/$/, '')}/sitemap.xml\n` : ''}`);
const sm = sitemap(guide, cfg, ['emergency/', 'categories/', 'budget/', 'downloads/', 'about/', ...docs.map((d) => `docs/${d.slug}/`)]);
if (sm) put('sitemap.xml', sm);
put('.nojekyll', '');

// copyFileSync rather than cpSync: cpSync crashes natively on Windows paths with non-ASCII characters.
mkdirSync(join(OUT, 'assets'), { recursive: true });
for (const f of readdirSync(join(ROOT, 'src', 'site', 'assets'))) copyFileSync(join(ROOT, 'src', 'site', 'assets', f), join(OUT, 'assets', f));

// Offline: precache every HTML page plus the assets and search index (all small, text only).
const precache = ['', 'assets/style.css', 'assets/app.js', 'search-index.json', 'icon.svg',
  ...written.filter((p) => p.endsWith('index.html') && p !== 'index.html').map((p) => p.replace(/index\.html$/, ''))];
put('sw.js', serviceWorker(cfg, [...new Set(precache)]));

// Downloads built by other scripts (PDF / EPUB / offline.html) are copied in if present.
for (const f of ['cost-effective-cat-guide.pdf', 'cost-effective-cat-guide.epub', 'offline.html']) {
  const src = join(ROOT, 'dist', f);
  if (existsSync(src)) { copyFileSync(src, join(OUT, 'downloads', f)); written.push(`downloads/${f}`); }
}

console.log(`wrote ${written.length} files to dist/site (base ${cfg.base}${cfg.siteUrl ? `, url ${cfg.siteUrl}` : ''})`);
