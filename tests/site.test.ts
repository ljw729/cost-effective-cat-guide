import { describe, expect, it } from 'vitest';
import { loadKnowledgeBase } from '../src/load.js';
import { buildGuide } from '../src/build.js';
import { entryPage, homePage, searchIndex, sitemap, type SiteConfig } from '../src/site/pages.js';
import { esc } from '../src/site/html.js';

const kb = loadKnowledgeBase();
const guide = buildGuide(kb);
const cfg: SiteConfig = { base: '/cat/', siteUrl: 'https://example.test/cat/', repoUrl: 'https://github.com/x/y', version: '0.0.0', buildDate: '2026-01-01' };

describe('website', () => {
  it('escapes HTML', () => {
    expect(esc('<a href="x">&\'')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });

  it('home page lists every entry and every emergency, under the configured base path', () => {
    const html = homePage(guide, cfg);
    for (const e of guide.entries) expect(html).toContain(`data-id="${e.id}"`);
    for (const e of guide.entries.filter((x) => x.type === 'emergency')) expect(html).toContain(`/cat/entries/${e.slug}/`);
    expect(html).toContain('尚未经过兽医审核');
  });

  it('pages load no third-party resources (privacy: no trackers, fonts or CDNs)', () => {
    const pages = [homePage(guide, cfg), ...guide.entries.slice(0, 20).map((e) => entryPage(guide, cfg, e))];
    for (const html of pages) {
      const external = [...html.matchAll(/<(?:script|link|img|iframe)[^>]+(?:src|href)="(https?:\/\/[^"]+)"/g)]
        .map((m) => m[1]!)
        .filter((u) => !u.startsWith(cfg.siteUrl));
      expect(external).toEqual([]);
    }
  });

  it('entry pages show the review warning, sources and JSON-LD', () => {
    const e = guide.entries.find((x) => x.type === 'emergency')!;
    const html = entryPage(guide, cfg, e);
    expect(html).toContain('尚未经兽医审核');
    expect(html).toContain('支持了什么');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('<link rel="canonical" href="https://example.test/cat/entries/');
  });

  it('search index carries synonyms and plain text only', () => {
    const idx = searchIndex(guide, cfg, kb.synonyms);
    expect(idx.entries).toHaveLength(guide.entries.length);
    expect(idx.synonyms.find((g) => g.tag === 'urethral-obstruction')?.terms).toContain('尿不出来');
    expect(JSON.stringify(idx)).not.toMatch(/<\w+[^>]*>/);
  });

  it('sitemap includes every entry and is omitted without a site URL', () => {
    const sm = sitemap(guide, cfg, []);
    for (const e of guide.entries) expect(sm).toContain(`https://example.test/cat/entries/${e.slug}/`);
    expect(sitemap(guide, { ...cfg, siteUrl: '' }, [])).toBe('');
  });
});
