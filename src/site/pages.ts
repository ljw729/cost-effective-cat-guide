/**
 * Static website pages. Pure functions: BuiltGuide + config → { path: html }.
 */
import { marked } from 'marked';
import { LABELS, type BuiltEntry, type BuiltGuide } from '../build.js';
import { DISCLAIMER, SITE_TITLE, SITE_TITLE_EN, esc, renderCard, renderEntryBody, type LinkContext } from './html.js';

export interface SiteConfig {
  /** Path prefix the site is served under, always with leading and trailing slash, e.g. "/" or "/cost-effective-cat-guide/". */
  base: string;
  /** Absolute origin + base for canonical URLs, e.g. "https://ljw729.github.io/cost-effective-cat-guide/". Empty → no absolute URLs. */
  siteUrl: string;
  repoUrl: string;
  version: string;
  buildDate: string;
}

export interface DocPage { slug: string; title: string; markdown: string }

export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="猫"><rect width="64" height="64" rx="14" fill="#b45309"/><path d="M14 50V20l10 9h16l10-9v30a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="#fff7ed"/><circle cx="25" cy="38" r="3" fill="#7c2d12"/><circle cx="39" cy="38" r="3" fill="#7c2d12"/><path d="M29 45h6l-3 3z" fill="#7c2d12"/></svg>`;

export function siteLinks(cfg: SiteConfig): LinkContext {
  return {
    entryHref: (e) => `${cfg.base}entries/${e.slug}/`,
    categoryHref: (id) => `${cfg.base}categories/${id}/`,
  };
}

interface LayoutOpts {
  title: string; description: string; path: string; body: string; nav?: string;
  jsonLd?: object; ogType?: 'website' | 'article'; noindex?: boolean;
}

export function layout(cfg: SiteConfig, o: LayoutOpts): string {
  const canonical = cfg.siteUrl ? cfg.siteUrl.replace(/\/$/, '') + '/' + o.path.replace(/^\//, '') : '';
  const fullTitle = o.path === '' ? `${SITE_TITLE} · ${SITE_TITLE_EN}` : `${o.title} · ${SITE_TITLE}`;
  const nav = (p: string, label: string) => `<a href="${cfg.base}${p}"${o.nav === p ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(o.description)}">
<meta name="base-path" content="${esc(cfg.base)}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#b45309">
${o.noindex ? '<meta name="robots" content="noindex">' : ''}
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:site_name" content="${esc(SITE_TITLE)}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:type" content="${o.ogType ?? 'website'}">
<meta property="og:locale" content="zh_CN">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
<link rel="icon" href="${cfg.base}icon.svg" type="image/svg+xml">
<link rel="manifest" href="${cfg.base}manifest.webmanifest">
<link rel="stylesheet" href="${cfg.base}assets/style.css?v=${esc(cfg.version)}">
${o.jsonLd ? `<script type="application/ld+json">${JSON.stringify(o.jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body>
<a class="skip" href="#main">跳到正文</a>
<header class="site-header"><div class="wrap">
<a class="brand" href="${cfg.base}">${ICON_SVG}<span>${esc(SITE_TITLE)}</span></a>
<nav class="nav" aria-label="主导航">${nav('emergency/', '🚨 紧急情况')}${nav('categories/', '分类')}${nav('downloads/', '下载')}${nav('about/', '关于与方法')}<button class="theme-toggle" type="button" aria-label="切换深色 / 浅色">◐</button></nav>
</div></header>
<main id="main"><div class="wrap">
${o.body}
</div></main>
<footer class="site-footer"><div class="wrap">
<p>${esc(DISCLAIMER)}</p>
<p>v${esc(cfg.version)} · 构建于 ${esc(cfg.buildDate)} · 无账号、无追踪、无广告；收藏只保存在你的浏览器里。 · <a href="${esc(cfg.repoUrl)}">GitHub</a> · 内容 CC BY-SA 4.0 · 代码 MIT</p>
</div></footer>
<script src="${cfg.base}assets/app.js?v=${esc(cfg.version)}" defer></script>
</body>
</html>
`;
}

function emergencyStrip(guide: BuiltGuide, ctx: LinkContext): string {
  const em = guide.entries.filter((e) => e.type === 'emergency');
  return `<section class="emergency-strip" aria-labelledby="em-h"><h2 id="em-h">🚨 出现这些情况，先别看指南，联系兽医</h2><ul>${em
    .map((e) => `<li><a href="${esc(ctx.entryHref(e))}">${esc(e.title)}</a></li>`)
    .join('')}</ul></section>`;
}

function option(v: string, label: string) { return `<option value="${esc(v)}">${esc(label)}</option>`; }

function finder(guide: BuiltGuide, ctx: LinkContext, entries: BuiltEntry[] = guide.entries, showCategory = true): string {
  const cats = guide.categories.filter((c) => c.entry_ids.length);
  return `<section id="finder" aria-label="搜索和筛选">
<div class="search"><label class="skip" for="q">搜索</label><input id="q" type="search" data-filter="q" placeholder="搜一搜：尿不出来、吐、不吃饭、百合、猫砂盆……" autocomplete="off" enterkeyhint="search"></div>
<div class="filters">
${showCategory ? `<label>分类<select data-filter="category">${option('', '全部')}${cats.map((c) => option(c.id, `${c.name.zh}（${c.entry_ids.length}）`)).join('')}</select></label>` : ''}
<label>适用<select data-filter="audience">${option('', '全部')}${Object.entries(LABELS.applies).filter(([k]) => k !== 'all').map(([k, v]) => option(k, v)).join('')}</select></label>
<label>类型<select data-filter="type">${option('', '全部')}${Object.entries(LABELS.type).map(([k, v]) => option(k, v)).join('')}</select></label>
<label>性价比<select data-filter="grade">${option('', '全部')}${['S', 'A', 'B', 'C', 'D'].map((g) => option(g, `${g} · ${LABELS.grade[g as 'S']}`)).join('')}${option('none', '不评分（急症 / 误区）')}</select></label>
<label>证据<select data-filter="evidence">${option('', '全部')}${Object.entries(LABELS.evidence).map(([k, v]) => option(k, `${k} · ${v}`)).join('')}</select></label>
<label>紧急程度<select data-filter="urgency">${option('', '全部')}${Object.entries(LABELS.urgency).map(([k, v]) => option(k, v)).join('')}</select></label>
<label>花钱<select data-filter="money">${option('', '不限')}${option('0', '几乎免费')}${option('1', '很低及以下')}${option('2', '低及以下')}${option('3', '中及以下')}</select></label>
</div>
<div class="toolbar"><button class="btn" type="button" data-random>🎲 随机学一条</button><button class="btn" type="button" data-only-favs aria-pressed="false">★ 只看收藏</button><button class="btn" type="button" data-reset>清除筛选</button><span class="result-count" aria-live="polite">${entries.length} 条</span></div>
<ul class="cards">${entries.map((e) => renderCard(e, ctx)).join('\n')}</ul>
</section>`;
}

export function homePage(guide: BuiltGuide, cfg: SiteConfig): string {
  const ctx = siteLinks(cfg);
  const st = guide.stats;
  const body = `<section class="hero">
<h1>${esc(SITE_TITLE)}</h1>
<p class="lead">用合理的钱、时间和精力，让猫更健康、更安全。每条建议都写明证据等级、性价比和来源，以及来源具体支持了什么。</p>
<ul class="stats"><li>${st.entries} 条</li><li>${st.sources} 个已核验来源</li><li>证据 B 级 ${st.by_evidence.B ?? 0} · C 级 ${st.by_evidence.C ?? 0}</li><li>兽医审核 ${st.vet_reviewed} 条</li></ul>
</section>
<p class="disclaimer">${esc(DISCLAIMER)} 目前所有条目都由 AI 研究整理，<strong>尚未经过兽医审核</strong>。</p>
${emergencyStrip(guide, ctx)}
${finder(guide, ctx)}
<h2>按分类浏览</h2>${categoryGrid(guide, cfg)}`;
  return layout(cfg, {
    title: SITE_TITLE, path: '', description: '循证、结构化的养猫知识库：哪些钱不能省，哪些可以省，哪些东西基本没必要买。每条都有证据等级、性价比和来源。', body,
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_TITLE, alternateName: SITE_TITLE_EN, inLanguage: 'zh-CN', ...(cfg.siteUrl ? { url: cfg.siteUrl } : {}) },
  });
}

function categoryGrid(guide: BuiltGuide, cfg: SiteConfig): string {
  return `<ul class="cat-grid">${guide.categories.filter((c) => c.entry_ids.length).map((c) => `<li><a href="${cfg.base}categories/${c.id}/"><span>${esc(c.name.zh)}</span><span class="count">${c.entry_ids.length}</span></a></li>`).join('')}</ul>`;
}

export function categoriesIndexPage(guide: BuiltGuide, cfg: SiteConfig): string {
  const empty = guide.categories.filter((c) => !c.entry_ids.length);
  const body = `<h1>分类</h1>${categoryGrid(guide, cfg)}${empty.length ? `<p class="muted">还没有条目的分类：${empty.map((c) => esc(c.name.zh)).join('、')}。宁可少收录，也不为了凑数降低可靠性。</p>` : ''}`;
  return layout(cfg, { title: '分类', path: 'categories/', nav: 'categories/', description: '按主题浏览高性价比猫猫指南的全部条目。', body });
}

export function categoryPage(guide: BuiltGuide, cfg: SiteConfig, catId: string): string {
  const ctx = siteLinks(cfg);
  const cat = guide.categories.find((c) => c.id === catId)!;
  const byId = new Map(guide.entries.map((e) => [e.id, e]));
  const entries = cat.entry_ids.map((id) => byId.get(id)!).filter(Boolean);
  const body = `<p class="breadcrumb"><a href="${cfg.base}">首页</a> / <a href="${cfg.base}categories/">分类</a></p>
<h1>${esc(cat.name.zh)} <span class="muted">${esc(cat.name.en)}</span></h1>
${cat.high_risk ? '<p class="review-warning">本分类属于高风险医疗主题：条目必须有 Tier 1 来源，不写剂量，急救只写“识别 → 避免错误操作 → 尽快就医”。</p>' : ''}
<ul class="cards">${entries.map((e) => renderCard(e, ctx)).join('\n')}</ul>`;
  return layout(cfg, { title: cat.name.zh ?? cat.id, path: `categories/${cat.id}/`, nav: 'categories/', description: `${cat.name.zh}：${entries.length} 条循证养猫建议。`, body });
}

export function emergencyPage(guide: BuiltGuide, cfg: SiteConfig): string {
  const ctx = siteLinks(cfg);
  const em = guide.entries.filter((e) => e.type === 'emergency' || e.urgency === 'emergency');
  const urgent = guide.entries.filter((e) => e.urgency === 'urgent' && e.type !== 'emergency');
  const body = `<h1>🚨 紧急情况</h1>
<p class="disclaimer"><strong>先联系兽医或急诊，再看这里。</strong>本页只写“识别 → 避免错误操作 → 尽快就医”，不提供家庭治疗方法和药物剂量。提前把附近 24 小时动物医院的电话存进手机。</p>
<h2>立即就医</h2><ul class="cards">${em.map((e) => renderCard(e, ctx)).join('\n')}</ul>
<h2>尽快就医（当天或尽早预约）</h2><ul class="cards">${urgent.map((e) => renderCard(e, ctx)).join('\n')}</ul>`;
  return layout(cfg, { title: '紧急情况', path: 'emergency/', nav: 'emergency/', description: '猫的急症识别：呼吸困难、尿不出来、中毒、吞线、中暑……先联系兽医。', body });
}

export function entryPage(guide: BuiltGuide, cfg: SiteConfig, e: BuiltEntry): string {
  const ctx = siteLinks(cfg);
  const path = `entries/${e.slug}/`;
  const body = `<p class="breadcrumb"><a href="${cfg.base}">首页</a> / <a href="${cfg.base}categories/${e.category}/">${esc(e.category_name)}</a></p>
<article class="entry${e.type === 'emergency' ? ' entry-emergency' : ''}" id="${esc(e.id.toLowerCase())}">
${renderEntryBody(e, guide, ctx, 1)}
<div class="entry-actions" data-fav-entry="${esc(e.id)}"><a class="btn" href="${esc(cfg.repoUrl)}/issues/new?template=2-correction.yml&title=${encodeURIComponent(`[纠错] ${e.id} ${e.title}`)}" rel="noopener">纠错 / 补充来源</a></div>
</article>`;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article', headline: e.title, description: e.summary, inLanguage: 'zh-CN',
    dateCreated: e.created, dateModified: e.last_reviewed, articleSection: e.category_name, keywords: e.tags.join(', '),
    isPartOf: { '@type': 'WebSite', name: SITE_TITLE }, license: 'https://creativecommons.org/licenses/by-sa/4.0/',
    citation: e.sources.map((s) => ({ '@type': 'CreativeWork', name: s.title, url: s.url, publisher: s.organization })),
    ...(cfg.siteUrl ? { url: cfg.siteUrl.replace(/\/$/, '') + '/' + path } : {}),
  };
  return layout(cfg, { title: e.title, path, description: e.summary, body, jsonLd, ogType: 'article' });
}

export function downloadsPage(cfg: SiteConfig): string {
  const body = `<h1>下载</h1>
<p>所有版本都由同一份数据自动生成，内容一致。</p>
<ul class="cards">
<li class="card"><a class="card-link" href="${cfg.base}downloads/cost-effective-cat-guide.pdf"><span class="card-title">PDF</span><span class="card-summary">带目录、页码和来源链接，适合打印或在平板上看。</span></a></li>
<li class="card"><a class="card-link" href="${cfg.base}downloads/cost-effective-cat-guide.epub"><span class="card-title">EPUB</span><span class="card-summary">电子书格式，适合 Apple Books、多看、Kindle（需转换）等阅读器。</span></a></li>
<li class="card"><a class="card-link" href="${cfg.base}downloads/offline.html"><span class="card-title">离线单文件 offline.html</span><span class="card-summary">一个文件，没有网络也能打开和搜索。可以保存到手机或 U 盘。</span></a></li>
<li class="card"><a class="card-link" href="${cfg.base}downloads/guide.json"><span class="card-title">结构化数据 guide.json</span><span class="card-summary">给开发者和 AI 工具使用；字段说明见仓库 docs/architecture.md。</span></a></li>
<li class="card"><a class="card-link" href="${esc(cfg.repoUrl)}/blob/main/GUIDE.md"><span class="card-title">GUIDE.md</span><span class="card-summary">在 GitHub 上直接阅读的 Markdown 版。</span></a></li>
</ul>
<p class="muted">网站本身也支持离线：用支持 PWA 的浏览器访问过一次后，没有网络也能打开已缓存的页面。</p>`;
  return layout(cfg, { title: '下载', path: 'downloads/', nav: 'downloads/', description: '下载高性价比猫猫指南的 PDF、EPUB、离线单文件和结构化数据。', body });
}

export function aboutPage(cfg: SiteConfig, docs: DocPage[]): string {
  const body = `<h1>关于与方法</h1>
<div class="prose">
<p>《高性价比猫猫指南》是一个开源的循证养猫知识库。它不是猫粮排行榜，不是导购，也不是 AI 批量生成的百科。它想回答：<strong>对普通养猫人来说，到底什么事情真正重要？</strong></p>
<ul>
<li><strong>来源存在 ≠ 来源支持结论</strong>：每条引用都写明来源具体支持了什么、我们读到的是全文、摘要还是网页。</li>
<li><strong>AI 研究 ≠ 兽医审核</strong>：目前所有条目由 AI 研究整理，页面会明确标注。</li>
<li><strong>医疗紧急程度优先于成本</strong>：紧急情况不评性价比。</li>
<li><strong>商业中立</strong>：不推荐品牌，不接受付费排名。</li>
<li><strong>隐私</strong>：本网站没有账号、追踪、广告和第三方资源；收藏只存在你的浏览器里。</li>
</ul>
<h2>方法文档</h2>
<ul>${docs.map((d) => `<li><a href="${cfg.base}docs/${d.slug}/">${esc(d.title)}</a></li>`).join('')}</ul>
<h2>参与</h2>
<p>欢迎纠错、补充来源、提出新问题，特别欢迎执业兽医参与审核：<a href="${esc(cfg.repoUrl)}">${esc(cfg.repoUrl)}</a></p>
</div>`;
  return layout(cfg, { title: '关于与方法', path: 'about/', nav: 'about/', description: '高性价比猫猫指南的原则、证据等级、性价比评分和来源政策。', body });
}

/** Markdown docs → HTML. Links to other docs become site links; other repo files link to GitHub. */
export function docPage(cfg: SiteConfig, doc: DocPage, allDocs: DocPage[]): string {
  const known = new Set(allDocs.map((d) => d.slug));
  let html = marked.parse(doc.markdown, { async: false, gfm: true }) as string;
  html = html.replace(/href="([^"#:]+?\.md)(#[^"]*)?"/g, (_m, p: string, hash = '') => {
    const name = p.split('/').pop()!.replace(/\.md$/, '');
    if (known.has(name)) return `href="${cfg.base}docs/${name}/${hash}"`;
    const fromRoot = p.startsWith('../');
    const clean = p.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
    return `href="${cfg.repoUrl}/blob/main/${fromRoot ? clean : 'docs/' + clean}${hash}"`;
  });
  html = html.replace(/href="((?:\.\.\/)*(?:data|schema|src|scripts|generated)\/[^"]*)"/g, (_m, p: string) => `href="${cfg.repoUrl}/blob/main/${p.replace(/^(\.\.\/)+/, '')}"`);
  const body = `<p class="breadcrumb"><a href="${cfg.base}">首页</a> / <a href="${cfg.base}about/">关于与方法</a></p><article class="prose">${html}</article>`;
  return layout(cfg, { title: doc.title, path: `docs/${doc.slug}/`, nav: 'about/', description: `${doc.title} — 高性价比猫猫指南方法文档。`, body });
}

export function notFoundPage(cfg: SiteConfig): string {
  return layout(cfg, { title: '页面不存在', path: '404.html', noindex: true, description: '页面不存在', body: `<h1>页面不存在</h1><p>可能是链接已经变更。<a href="${cfg.base}">回到首页搜索</a>。</p><p class="disclaimer">如果你的猫正处于紧急情况，请直接联系兽医或急诊。<a href="${cfg.base}emergency/">紧急情况识别</a></p>` });
}

/** Lightweight index for client search: text only, no HTML. */
export function searchIndex(guide: BuiltGuide, cfg: SiteConfig, synonyms: { tag: string; terms: string[] }[]) {
  const ctx = siteLinks(cfg);
  return {
    version: cfg.version,
    synonyms: synonyms.map((g) => ({ tag: g.tag, terms: g.terms.map(String) })),
    entries: guide.entries.map((e) => ({
      id: e.id, title: e.title, summary: e.summary, href: ctx.entryHref(e), category: e.category, type: e.type,
      grade: e.cost_effectiveness.grade, evidence: e.evidence.level, urgency: e.urgency, applies_to: e.applies_to, tags: e.tags, money: e.scores.money_cost,
      text: [e.recommendation, e.why_it_matters, ...(e.how_to_do_it ?? []), ...(e.warning_signs ?? []), ...(e.emergency_action ?? []), ...(e.do_not ?? []), e.myth_claim ?? '', e.category_name].join(' '),
    })),
  };
}

export function sitemap(guide: BuiltGuide, cfg: SiteConfig, extraPaths: string[]): string {
  if (!cfg.siteUrl) return '';
  const root = cfg.siteUrl.replace(/\/$/, '') + '/';
  const urls = ['', ...extraPaths, ...guide.categories.filter((c) => c.entry_ids.length).map((c) => `categories/${c.id}/`), ...guide.entries.map((e) => `entries/${e.slug}/`)];
  const lastmod = new Map(guide.entries.map((e) => [`entries/${e.slug}/`, e.last_reviewed]));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `<url><loc>${esc(root + u)}</loc>${lastmod.has(u) ? `<lastmod>${lastmod.get(u)}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>\n`;
}

export function serviceWorker(cfg: SiteConfig, precache: string[]): string {
  return `// Offline cache. Network-first for pages (so updates show), cache fallback when offline.
const CACHE = 'cat-guide-${cfg.version}-${cfg.buildDate}';
const PRECACHE = ${JSON.stringify(precache.map((p) => cfg.base + p))};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
    .catch(() => caches.match(req).then((r) => r || caches.match(${JSON.stringify(cfg.base)}))));
});
`;
}

export function manifest(cfg: SiteConfig): string {
  return JSON.stringify({
    name: SITE_TITLE, short_name: '猫猫指南', description: '循证、结构化的养猫知识库', lang: 'zh-CN',
    start_url: cfg.base, scope: cfg.base, display: 'standalone', background_color: '#fbfaf7', theme_color: '#b45309',
    icons: [{ src: `${cfg.base}icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }, null, 2);
}
