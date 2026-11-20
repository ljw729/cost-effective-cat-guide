import { describe, expect, it } from 'vitest';
import { inflateRawSync } from 'node:zlib';
import { loadKnowledgeBase } from '../src/load.js';
import { buildGuide } from '../src/build.js';
import { buildEpub, renderOffline, renderPrint, zip, type ExportMeta } from '../src/exports.js';

const kb = loadKnowledgeBase();
const guide = buildGuide(kb);
const meta: ExportMeta = { version: '0.0.0', buildDate: '2026-01-01', siteUrl: 'https://example.test/', repoUrl: 'https://github.com/x/y' };

/** Reads a zip produced by our writer (no data descriptors, no zip64). */
function unzip(buf: Buffer) {
  const out: { name: string; method: number; data: Buffer }[] = [];
  let p = 0;
  while (buf.readUInt32LE(p) === 0x04034b50) {
    const method = buf.readUInt16LE(p + 8), size = buf.readUInt32LE(p + 18), nlen = buf.readUInt16LE(p + 26), xlen = buf.readUInt16LE(p + 28);
    const name = buf.subarray(p + 30, p + 30 + nlen).toString('utf8');
    const raw = buf.subarray(p + 30 + nlen + xlen, p + 30 + nlen + xlen + size);
    out.push({ name, method, data: method === 8 ? inflateRawSync(raw) : raw });
    p += 30 + nlen + xlen + size;
  }
  return out;
}

describe('exports', () => {
  it('zip round-trips and is deterministic', () => {
    const files = [{ name: 'a.txt', data: Buffer.from('hello 猫'), store: true }, { name: 'b/c.txt', data: Buffer.from('x'.repeat(1000)) }];
    const z = zip(files);
    expect(unzip(z).map((f) => [f.name, f.data.toString()])).toEqual(files.map((f) => [f.name, f.data.toString()]));
    expect(zip(files).equals(z)).toBe(true);
  });

  it('EPUB starts with an uncompressed mimetype and lists every entry in nav', () => {
    const files = unzip(buildEpub(guide, meta));
    expect(files[0]).toMatchObject({ name: 'mimetype', method: 0 });
    expect(files[0]!.data.toString()).toBe('application/epub+zip');
    const nav = files.find((f) => f.name === 'OEBPS/nav.xhtml')!.data.toString();
    for (const e of guide.entries) expect(nav).toContain(`#${e.id.toLowerCase()}"`);
    // XHTML: no unclosed void elements
    for (const f of files.filter((x) => x.name.endsWith('.xhtml'))) expect(f.data.toString()).not.toMatch(/<(br|hr|img|meta|link)(?![^>]*\/>)[^>]*>/);
  });

  it('offline.html is self-contained and embeds the search index', () => {
    const html = renderOffline(guide, meta, 'body{}', 'void 0', kb.synonyms);
    expect(html).toContain('window.__GUIDE_INDEX__=');
    expect(html).not.toMatch(/<(?:script|link)[^>]+(?:src|href)="https?:/);
    for (const e of guide.entries) expect(html).toContain(`id="${e.id.toLowerCase()}"`);
  });

  it('print.html has a table of contents linking to every entry', () => {
    const html = renderPrint(guide, meta, '');
    for (const e of guide.entries) expect(html).toContain(`href="#${e.id.toLowerCase()}"`);
  });
});
