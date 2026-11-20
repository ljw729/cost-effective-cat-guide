/**
 * Builds the downloadable formats into dist/:
 *   offline.html                     single file, searchable, works without network
 *   print.html                       intermediate for the PDF
 *   cost-effective-cat-guide.epub    EPUB 3
 *   cost-effective-cat-guide.pdf     only with --pdf (needs Chrome / Chromium / Edge; see scripts/pdf.ts)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadKnowledgeBase, ROOT } from '../src/load.js';
import { buildGuide } from '../src/build.js';
import { validateKnowledgeBase } from '../src/validate.js';
import { buildEpub, renderOffline, renderPrint, type ExportMeta } from '../src/exports.js';
import { printToPdf } from './pdf.js';

const kb = loadKnowledgeBase();
if (validateKnowledgeBase(kb).some((i) => i.level === 'error')) {
  console.error('✗ refusing to build: validation errors. Run npm run validate.');
  process.exit(1);
}
const guide = buildGuide(kb);
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string };
const meta: ExportMeta = {
  version: pkg.version,
  buildDate: process.env.BUILD_DATE ?? new Date().toISOString().slice(0, 10),
  siteUrl: process.env.SITE_URL ?? 'https://ljw729.github.io/cost-effective-cat-guide/',
  repoUrl: process.env.REPO_URL ?? 'https://github.com/ljw729/cost-effective-cat-guide',
};
const css = readFileSync(join(ROOT, 'src', 'site', 'assets', 'style.css'), 'utf8');
const appJs = readFileSync(join(ROOT, 'src', 'site', 'assets', 'app.js'), 'utf8');
const OUT = join(ROOT, 'dist');
mkdirSync(OUT, { recursive: true });

const offline = renderOffline(guide, meta, css, appJs, kb.synonyms);
writeFileSync(join(OUT, 'offline.html'), offline);
console.log(`✓ dist/offline.html (${(offline.length / 1024).toFixed(0)} KB)`);

const print = renderPrint(guide, meta, css);
writeFileSync(join(OUT, 'print.html'), print);
console.log('✓ dist/print.html');

const epub = buildEpub(guide, meta);
writeFileSync(join(OUT, 'cost-effective-cat-guide.epub'), epub);
console.log(`✓ dist/cost-effective-cat-guide.epub (${(epub.length / 1024).toFixed(0)} KB)`);

if (process.argv.includes('--pdf')) {
  const pdf = await printToPdf(join(OUT, 'print.html'), { title: `高性价比猫猫指南 v${meta.version}` });
  writeFileSync(join(OUT, 'cost-effective-cat-guide.pdf'), pdf);
  console.log(`✓ dist/cost-effective-cat-guide.pdf (${(pdf.length / 1024).toFixed(0)} KB)`);
}
