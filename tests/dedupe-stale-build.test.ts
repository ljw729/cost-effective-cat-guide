import { describe, expect, it } from 'vitest';
import { findDuplicates, DUPLICATE_ERROR, normalize } from '../src/dedupe.js';
import { findStale } from '../src/stale.js';
import { loadKnowledgeBase } from '../src/load.js';
import { buildGuide } from '../src/build.js';
import { renderGuideMarkdown } from '../src/render-markdown.js';
import type { SynonymGroup } from '../src/types.js';

const kb = loadKnowledgeBase();
const syn: SynonymGroup[] = [...kb.synonyms, { tag: 'fresh-water', terms: ['换水', '新鲜水', '饮水新鲜', '保持饮水新鲜'] }];
const mk = (id: string, title: string, recommendation: string, tags = ['hydration'], sources = ['cornell-flutd']) =>
  ({ id, title, recommendation, tags, sources: sources.map((s) => ({ id: s, supports: 'x', support_check: 'pending' as const })) });

describe('duplicate detection', () => {
  it('flags the classic "每天换水" triple as duplicates', () => {
    const pairs = findDuplicates([
      mk('CG-9001', '每天换水', '每天给猫换水，保持水碗干净。'),
      mk('CG-9002', '每天给猫换新鲜水', '每天给猫换一次新鲜水。'),
      mk('CG-9003', '保持饮水新鲜', '保持猫的饮水新鲜，每天换水。'),
    ], syn);
    expect(pairs.filter((p) => p.score >= DUPLICATE_ERROR).length).toBe(3);
  });
  it('does not flag unrelated entries', () => {
    const pairs = findDuplicates([
      mk('CG-9001', '每天换水', '每天给猫换水。'),
      mk('CG-9002', '老年猫量血压', '老年猫体检时请兽医测量血压。', ['blood-pressure'], ['isfm-hypertension-2017']),
    ], syn);
    expect(pairs).toEqual([]);
  });
  it('maps colloquial synonyms to the same token', () => {
    expect(normalize('猫尿不出来', kb.synonyms)).toContain('§urethral-obstruction§');
    expect(normalize('尿闭', kb.synonyms)).toContain('§urethral-obstruction§');
  });
  it('finds no unreviewed duplicates in the real knowledge base', () => {
    const allowed = new Set(['CG-0003|CG-0004', 'CG-0004|CG-0003']);
    const bad = findDuplicates(kb.entries, kb.synonyms).filter((p) => p.score >= DUPLICATE_ERROR && !allowed.has(`${p.a}|${p.b}`));
    expect(bad).toEqual([]);
  });
});

describe('stale detection', () => {
  it('reports nothing today and everything far in the future, without modifying entries', () => {
    const before = JSON.stringify(kb.entries);
    expect(findStale(kb, new Date('2026-11-20'))).toEqual([]);
    expect(findStale(kb, new Date('2031-01-01')).length).toBe(kb.entries.length);
    expect(JSON.stringify(kb.entries)).toBe(before);
  });
  it('emergency entries go stale first (12 months)', () => {
    const ids = findStale(kb, new Date('2027-12-01')).map((s) => s.id);
    expect(ids).toContain('CG-0004');
    expect(ids).toContain('CG-0007');
    expect(ids).not.toContain('CG-0001');
  });
});

describe('build', () => {
  const g = buildGuide(kb);
  it('puts emergencies first and never grades them', () => {
    expect(g.entries[0]!.type).toBe('emergency');
    for (const e of g.entries.filter((x) => x.type === 'emergency')) expect(e.cost_effectiveness.grade).toBeNull();
  });
  it('resolves every source with its verification record', () => {
    for (const e of g.entries) for (const s of e.sources) { expect(s.title).toBeTruthy(); expect(s.verification).toBeTruthy(); }
  });
  it('GUIDE.md contains the disclaimer and the urinary emergency', () => {
    const md = renderGuideMarkdown(g);
    expect(md).toContain('不能代替持证兽医');
    expect(md).toContain('猫尿不出来');
    expect(md.indexOf('先看这里：紧急情况')).toBeLessThan(md.indexOf('## 目录'));
  });
});
