import { describe, expect, it } from 'vitest';
import { loadKnowledgeBase } from '../src/load.js';
import { validateKnowledgeBase } from '../src/validate.js';
import type { Entry, KnowledgeBase } from '../src/types.js';

const real = loadKnowledgeBase();
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** A KB containing one entry derived from a real golden entry, with a mutation applied. */
function withEntry(mutate: (e: Entry) => void, id = 'CG-0002'): KnowledgeBase {
  const kb = clone(real);
  const e = kb.entries.find((x) => x.id === id)!;
  mutate(e);
  return kb;
}
const rules = (kb: KnowledgeBase) => validateKnowledgeBase(kb).filter((i) => i.level === 'error').map((i) => i.rule);

describe('the real knowledge base', () => {
  it('has no validation errors', () => {
    const errors = validateKnowledgeBase(real).filter((i) => i.level === 'error');
    expect(errors).toEqual([]);
  });
});

describe('validation rules', () => {
  it('rejects unknown source ids (no invented citations)', () => {
    expect(rules(withEntry((e) => { e.sources[0]!.id = 'made-up-2099'; }))).toContain('missing-source');
  });
  it('rejects support claims for sources we only have metadata for', () => {
    expect(rules(withEntry((e) => { e.sources.push({ id: 'freeman-2013-raw-meat-diets', supports: 'raw diets are risky for cats', support_check: 'ai_checked' }); }))).toContain('support-without-reading');
  });
  it('requires a checked Tier 1 source for evidence B', () => {
    expect(rules(withEntry((e) => { for (const s of e.sources) s.support_check = 'pending'; }))).toContain('evidence-checked');
  });
  it('requires a strong source type for evidence A', () => {
    expect(rules(withEntry((e) => { e.evidence.level = 'A'; }))).toContain('evidence-A');
  });
  it('requires medical review flag on high-risk categories', () => {
    expect(rules(withEntry((e) => { e.medical_review_required = false; }, 'CG-0003'))).toContain('medical-review');
  });
  it('rejects drug doses anywhere in an entry', () => {
    expect(rules(withEntry((e) => { e.how_to_do_it = ['每次 5 mg/kg']; }))).toContain('no-doses');
    expect(rules(withEntry((e) => { e.how_to_do_it = ['每次 5 毫克/公斤']; }))).toContain('no-doses');
  });
  it('rejects vet_reviewed without a veterinarian reviewer', () => {
    expect(rules(withEntry((e) => { e.review_status = 'vet_reviewed'; }))).toContain('vet-reviewer');
  });
  it('rejects duplicate ids', () => {
    const kb = clone(real);
    kb.entries.push({ ...clone(kb.entries[0]!), slug: 'another-slug', _file: undefined });
    expect(rules(kb)).toContain('unique-id');
  });
  it('requires conflict notes when evidence conflicts', () => {
    expect(rules(withEntry((e) => { e.evidence.conflict = true; }))).toContain('evidence-conflict');
  });
  it('rejects emergency entries without immediate actions (schema)', () => {
    expect(rules(withEntry((e) => { delete e.emergency_action; }, 'CG-0007'))).toContain('schema');
  });
  it('rejects unverified sources', () => {
    const kb = clone(real);
    kb.sources[0]!.verification.exists = false;
    expect(rules(kb)).toContain('source-exists');
  });
});
