/**
 * Single-file and e-book outputs: offline.html, print.html (→ PDF) and EPUB 3.
 * All reuse the entry renderer in src/site/html.ts so the content matches the website exactly.
 */
import { deflateRawSync } from 'node:zlib';
import { LABELS, sortEntries, type BuiltEntry, type BuiltGuide } from './build.js';
import { DISCLAIMER, SITE_TITLE, SITE_TITLE_EN, esc, renderCard, renderEntryBody, type LinkContext } from './site/html.js';

export interface ExportMeta { version: string; buildDate: string; siteUrl: string; repoUrl: string }

const anchor = (id: string) => id.toLowerCase();

function grouped(guide: BuiltGuide) {
  const byId = new Map(guide.entries.map((e) => [e.id, e]));
  return guide.categories
    .filter((c) => c.entry_ids.length)
    .map((c) => ({ cat: c, entries: c.entry_ids.map((id) => byId.get(id)!).filter(Boolean).sort(sortEntries) }));
}

function frontMatter(guide: BuiltGuide, meta: ExportMeta): string {
  const st = guide.stats;
  return `<p class="disclaimer"><strong>重要：</strong>${esc(DISCLAIMER)} 目前所有条目都由 AI 研究整理，<strong>尚未经过兽医审核</strong>。</p>
<p>v${esc(meta.version)} · ${esc(meta.buildDate)} · ${st.entries} 条 · ${st.sources} 个已核验来源 · 兽医审核 ${st.vet_reviewed} 条</p>
<p>网站：${meta.siteUrl ? `<a href="${esc(meta.siteUrl)}">${esc(meta.siteUrl)}</a>` : '（未配置）'} · 源代码与纠错：<a href="${esc(meta.repoUrl)}">${esc(meta.repoUrl)}</a></p>
<p class="muted">内容采用 CC BY-SA 4.0 许可；被引用论文和机构资料的版权归原作者。</p>`;
}

function howToRead(): string {
  return `<h2>怎么读</h2>
<ul>
<li><strong>证据等级</strong>：${Object.entries(LABELS.evidence).map(([k, v]) => `${k} ${v}`).join('；')}。</li>
<li><strong>性价比</strong>：S 最高、D 最低；紧急情况和误区不评分。公式公开，见网站“关于与方法”。</li>
<li><strong>来源存在 ≠ 来源支持结论</strong>：每条来源都写明它具体支持了什么、我们读到的是全文、摘要还是网页。</li>
</ul>`;
}

// ---------------------------------------------------------------- offline.html

export function renderOffline(guide: BuiltGuide, meta: ExportMeta, css: string, appJs: string, synonyms: { tag: string; terms: string[] }[]): string {
  const ctx: LinkContext = { entryHref: (e) => `#${anchor(e.id)}`, categoryHref: (id) => `#cat-${id}` };
  const groups = grouped(guide);
  const index = {
    synonyms: synonyms.map((g) => ({ tag: g.tag, terms: g.terms.map(String) })),
    entries: guide.entries.map((e) => ({
      id: e.id, title: e.title, summary: e.summary, href: `#${anchor(e.id)}`, category: e.category, type: e.type,
      grade: e.cost_effectiveness.grade, evidence: e.evidence.level, urgency: e.urgency, applies_to: e.applies_to, tags: e.tags,
      text: [e.recommendation, e.why_it_matters, ...(e.how_to_do_it ?? []), ...(e.warning_signs ?? []), ...(e.emergency_action ?? []), ...(e.do_not ?? []), e.myth_claim ?? '', e.category_name].join(' '),
    })),
  };
  const em = guide.entries.filter((e) => e.type === 'emergency');
  const finder = `<section id="finder" aria-label="搜索">
<div class="search"><input type="search" data-filter="q" placeholder="搜一搜：尿不出来、吐、不吃饭、百合……" autocomplete="off" aria-label="搜索"></div>
<div class="filters">
<label>分类<select data-filter="category"><option value="">全部</option>${groups.map((g) => `<option value="${esc(g.cat.id)}">${esc(g.cat.name.zh)}</option>`).join('')}</select></label>
<label>类型<select data-filter="type"><option value="">全部</option>${Object.entries(LABELS.type).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
<label>性价比<select data-filter="grade"><option value="">全部</option>${['S', 'A', 'B', 'C', 'D'].map((g) => `<option value="${g}">${g}</option>`).join('')}<option value="none">不评分</option></select></label>
</div>
<div class="toolbar"><button class="btn" type="button" data-random>🎲 随机一条</button><button class="btn" type="button" data-only-favs aria-pressed="false">★ 只看收藏</button><button class="btn" type="button" data-reset>清除</button><span class="result-count" aria-live="polite"></span></div>
<ul class="cards">${guide.entries.map((e) => renderCard(e, ctx)).join('\n')}</ul>
</section>`;
  const body = groups.map((g) => `<section id="cat-${esc(g.cat.id)}"><h2 class="cat-heading">${esc(g.cat.name.zh)}</h2>
${g.entries.map((e) => `<article class="entry print-entry" id="${anchor(e.id)}">${renderEntryBody(e, guide, ctx, 3)}<p><a href="#top">↑ 回到顶部</a></p></article>`).join('\n')}</section>`).join('\n');
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${esc(SITE_TITLE)}（离线版 v${esc(meta.version)}）</title>
<style>${css}</style>
</head>
<body>
<header class="site-header"><div class="wrap"><a class="brand" href="#top">${esc(SITE_TITLE)} · 离线版</a><nav class="nav"><a href="#emergency">🚨 紧急情况</a><a href="#finder">搜索</a><a href="#contents">目录</a><button class="theme-toggle" type="button" aria-label="切换深色 / 浅色">◐</button></nav></div></header>
<main id="top"><div class="wrap">
<h1>${esc(SITE_TITLE)} <span class="muted">${esc(SITE_TITLE_EN)}</span></h1>
${frontMatter(guide, meta)}
<section class="emergency-strip" id="emergency"><h2>🚨 出现这些情况，先别看指南，联系兽医</h2><ul>${em.map((e) => `<li><a href="#${anchor(e.id)}">${esc(e.title)}</a></li>`).join('')}</ul></section>
${finder}
<h2 id="contents">目录</h2>
<ul class="cat-grid">${groups.map((g) => `<li><a href="#cat-${esc(g.cat.id)}"><span>${esc(g.cat.name.zh)}</span><span class="count">${g.entries.length}</span></a></li>`).join('')}</ul>
${howToRead()}
${body}
</div></main>
<footer class="site-footer"><div class="wrap"><p>${esc(DISCLAIMER)}</p></div></footer>
<script>window.__GUIDE_INDEX__=${JSON.stringify(index).replace(/</g, '\\u003c')};</script>
<script>${appJs}</script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- print.html (PDF)

export function renderPrint(guide: BuiltGuide, meta: ExportMeta, css: string): string {
  const ctx: LinkContext = { entryHref: (e) => `#${anchor(e.id)}`, categoryHref: (id) => `#cat-${id}` };
  const groups = grouped(guide);
  const toc = groups.map((g) => `<li><a href="#cat-${esc(g.cat.id)}">${esc(g.cat.name.zh)}</a><ol>${g.entries.map((e) => `<li><a href="#${anchor(e.id)}">${esc(e.title)}</a> <span class="muted">${esc(e.id)}</span></li>`).join('')}</ol></li>`).join('');
  const body = groups.map((g) => `<section class="print-cat" id="cat-${esc(g.cat.id)}"><h1 class="cat-heading">${esc(g.cat.name.zh)}</h1>
${g.entries.map((e) => `<article class="entry print-entry" id="${anchor(e.id)}">${renderEntryBody(e, guide, ctx, 2)}</article>`).join('\n')}</section>`).join('\n');
  const printCss = `
@page { size: A4; margin: 18mm 16mm 20mm; }
body { background: #fff; color: #000; font-size: 10.5pt; line-height: 1.6; }
.wrap { max-width: none; padding: 0; }
.cover { height: 240mm; display: flex; flex-direction: column; justify-content: center; }
.cover h1 { font-size: 30pt; margin-bottom: 4mm; }
.cover .sub { font-size: 14pt; color: #444; }
.toc { break-before: page; }
.toc ol { padding-left: 1.4em; }
.toc > ol > li { margin-top: 3mm; font-weight: 600; }
.toc > ol > li li { font-weight: normal; }
.print-cat { break-before: page; }
.print-cat > .print-entry:first-of-type { break-before: avoid; }
.print-entry { break-before: page; }
.entry { border: 0; box-shadow: none; padding: 0; }
.source { break-inside: avoid; }
a { color: #7c2d12; }
details > summary { list-style: none; }
`;
  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>${esc(SITE_TITLE)} v${esc(meta.version)}</title>
<style>${css}\n${printCss}</style></head>
<body><div class="wrap">
<section class="cover"><h1>${esc(SITE_TITLE)}</h1><p class="sub">${esc(SITE_TITLE_EN)}</p>${frontMatter(guide, meta)}</section>
<section class="toc"><h1>目录</h1><ol>${toc}</ol></section>
<section class="print-entry">${howToRead()}</section>
${body}
</div></body></html>
`;
}

// ---------------------------------------------------------------- EPUB 3

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Minimal ZIP writer (stored or deflated), enough for a valid EPUB container. */
export function zip(files: { name: string; data: Buffer; store?: boolean }[]): Buffer {
  const local: Buffer[] = [], central: Buffer[] = [];
  let offset = 0;
  const DOS_TIME = 0, DOS_DATE = (2026 - 1980) << 9 | 1 << 5 | 1; // fixed timestamp → reproducible output
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const body = f.store ? f.data : deflateRawSync(f.data, { level: 9 });
    const method = f.store ? 0 : 8;
    const crc = crc32(f.data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(DOS_TIME, 10); lh.writeUInt16LE(DOS_DATE, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(f.data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    local.push(lh, name, body);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(DOS_TIME, 12); ch.writeUInt16LE(DOS_DATE, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20);
    ch.writeUInt32LE(f.data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
    central.push(ch, name);
    offset += lh.length + name.length + body.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, cd, end]);
}

const xhtmlDoc = (title: string, body: string) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="zh-CN" lang="zh-CN">
<head><meta charset="utf-8" /><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="style.css" /></head>
<body>${body}</body></html>
`;

const EPUB_CSS = `body { font-family: serif; line-height: 1.7; margin: 0 4%; }
h1 { font-size: 1.5em; } h2 { font-size: 1.2em; margin-top: 1.4em; } h3 { font-size: 1.05em; }
.badge { font-size: .8em; border: 1px solid #999; border-radius: 1em; padding: 0 .4em; margin-right: .3em; }
.entry-id, .muted, .source-meta, .source-check, .entry-footer { color: #555; font-size: .9em; }
.recommendation { font-weight: bold; }
.emergency-box { border: 2px solid #b91c1c; padding: .5em 1em; }
.review-warning, .disclaimer { border-left: 4px solid #b45309; padding-left: .6em; }
.entry { page-break-before: always; }
table { border-collapse: collapse; } th, td { border-bottom: 1px solid #ccc; padding: 2px 8px 2px 0; text-align: left; }
`;

export function buildEpub(guide: BuiltGuide, meta: ExportMeta): Buffer {
  const groups = grouped(guide);
  const fileFor = new Map<string, string>();
  groups.forEach((g, i) => g.entries.forEach((e) => fileFor.set(e.id, `c${String(i + 1).padStart(2, '0')}.xhtml`)));
  const ctx: LinkContext = { entryHref: (e) => `${fileFor.get(e.id)}#${anchor(e.id)}`, categoryHref: () => null, xhtml: true };
  const uid = `urn:uuid:${uuidFrom(`cost-effective-cat-guide-${meta.version}`)}`;
  const modified = `${meta.buildDate}T00:00:00Z`;

  const chapters = groups.map((g, i) => ({
    file: `c${String(i + 1).padStart(2, '0')}.xhtml`, title: g.cat.name.zh ?? g.cat.id,
    html: xhtmlDoc(g.cat.name.zh ?? g.cat.id, `<section epub:type="chapter"><h1>${esc(g.cat.name.zh)}</h1>${g.entries.map((e) => `<section class="entry" id="${anchor(e.id)}">${renderEntryBody(e, guide, ctx, 2)}</section>`).join('\n')}</section>`),
    entries: g.entries,
  }));
  const intro = xhtmlDoc(SITE_TITLE, `<section epub:type="frontmatter"><h1>${esc(SITE_TITLE)}</h1><p>${esc(SITE_TITLE_EN)}</p>${frontMatter(guide, meta)}${howToRead()}
<h2>🚨 紧急情况</h2><ul>${guide.entries.filter((e) => e.type === 'emergency').map((e) => `<li><a href="${ctx.entryHref(e)}">${esc(e.title)}</a></li>`).join('')}</ul></section>`);
  const nav = xhtmlDoc('目录', `<nav epub:type="toc" id="toc"><h1>目录</h1><ol><li><a href="intro.xhtml">前言与使用说明</a></li>${chapters.map((c) => `<li><a href="${c.file}">${esc(c.title)}</a><ol>${c.entries.map((e) => `<li><a href="${c.file}#${anchor(e.id)}">${esc(e.title)}</a></li>`).join('')}</ol></li>`).join('')}</ol></nav>`);
  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="zh-CN">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">${uid}</dc:identifier>
<dc:title>${esc(SITE_TITLE)}</dc:title>
<dc:language>zh-CN</dc:language>
<dc:creator>高性价比猫猫指南贡献者</dc:creator>
<dc:rights>CC BY-SA 4.0</dc:rights>
<dc:description>${esc(DISCLAIMER)}</dc:description>
<meta property="dcterms:modified">${modified.replace(/\.\d+Z$/, 'Z')}</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="css" href="style.css" media-type="text/css"/>
<item id="intro" href="intro.xhtml" media-type="application/xhtml+xml"/>
${chapters.map((c, i) => `<item id="c${i + 1}" href="${c.file}" media-type="application/xhtml+xml"/>`).join('\n')}
</manifest>
<spine>
<itemref idref="intro"/>
<itemref idref="nav"/>
${chapters.map((_, i) => `<itemref idref="c${i + 1}"/>`).join('\n')}
</spine>
</package>
`;
  const container = `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>
`;
  const b = (s: string) => Buffer.from(s, 'utf8');
  return zip([
    { name: 'mimetype', data: b('application/epub+zip'), store: true },
    { name: 'META-INF/container.xml', data: b(container) },
    { name: 'OEBPS/content.opf', data: b(opf) },
    { name: 'OEBPS/nav.xhtml', data: b(nav) },
    { name: 'OEBPS/style.css', data: b(EPUB_CSS) },
    { name: 'OEBPS/intro.xhtml', data: b(intro) },
    ...chapters.map((c) => ({ name: `OEBPS/${c.file}`, data: b(c.html) })),
  ]);
}

/** Deterministic UUID-shaped id from a string (not cryptographic; just stable per version). */
function uuidFrom(s: string): string {
  const h = [0, 1, 2, 3].map((i) => crc32(Buffer.from(`${i}:${s}`)).toString(16).padStart(8, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export type { BuiltEntry };
