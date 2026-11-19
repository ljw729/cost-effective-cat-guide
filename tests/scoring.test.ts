import { describe, expect, it } from 'vitest';
import { score, type ScoreInput } from '../src/scoring.js';

const base: ScoreInput = { type: 'recommendation', benefit: 3, risk_reduction: 3, money_cost: 1, time_cost: 1, effort: 1, harm_potential: 0, evidence_level: 'B' };

describe('scoring — worked examples in docs/scoring-methodology.md', () => {
  const cases: [string, Partial<ScoreInput>, number, string][] = [
    ['no lilies (A evidence)', { benefit: 5, risk_reduction: 5, money_cost: 0, time_cost: 1, effort: 1, evidence_level: 'A' }, 5.0, 'S'],
    ['microchip', { benefit: 4, risk_reduction: 4, money_cost: 2, time_cost: 1, effort: 1, evidence_level: 'B' }, 2.95, 'A'],
    ['window screens', { benefit: 5, risk_reduction: 5, money_cost: 2, time_cost: 1, effort: 2, evidence_level: 'C' }, 2.69, 'A'],
    ['toothbrushing', { benefit: 4, risk_reduction: 3, money_cost: 1, time_cost: 3, effort: 4, evidence_level: 'B' }, 2.27, 'B'],
    ['water fountain', { benefit: 2, risk_reduction: 2, money_cost: 3, time_cost: 2, effort: 2, evidence_level: 'C' }, 0.4, 'D'],
  ];
  for (const [name, input, expected, grade] of cases) {
    it(name, () => {
      const r = score({ ...base, ...input });
      expect(r.score).toBeCloseTo(expected, 2);
      expect(r.grade).toBe(grade);
    });
  }
});

describe('scoring — safety properties', () => {
  it('a free but dangerous remedy cannot score high', () => {
    const r = score({ ...base, benefit: 5, risk_reduction: 5, money_cost: 0, harm_potential: 3, evidence_level: 'A' });
    expect(['C', 'D']).toContain(r.grade);
  });
  it('harm_potential ≥ 2 caps at C even with perfect inputs', () => {
    const r = score({ ...base, benefit: 5, risk_reduction: 5, money_cost: 0, harm_potential: 2, evidence_level: 'A' });
    expect(r.grade).toBe('C');
  });
  it('evidence D caps at C (max uncapped score with D is 2.0 = B)', () => {
    const r = score({ ...base, benefit: 5, risk_reduction: 5, money_cost: 0, evidence_level: 'D' });
    expect(r.score).toBeCloseTo(2.0, 2);
    expect(r.uncapped_grade).toBe('B');
    expect(r.grade).toBe('C');
    expect(r.caps.length).toBe(1);
  });
  it('evidence C can never reach S (max 3.25); the C→A cap is a safety net for future weight changes', () => {
    const r = score({ ...base, benefit: 5, risk_reduction: 5, money_cost: 0, evidence_level: 'C' });
    expect(r.score).toBeCloseTo(3.25, 2);
    expect(r.grade).toBe('A');
    expect(r.caps).toEqual([]);
  });
  it('emergencies, myths and evidence gaps are never graded', () => {
    for (const type of ['emergency', 'myth', 'evidence_gap'] as const) {
      const r = score({ ...base, type });
      expect(r.graded).toBe(false);
      expect(r.grade).toBeNull();
      expect(r.reason_not_graded).toBeTruthy();
    }
  });
  it('weaker evidence never raises the score', () => {
    const levels = ['A', 'B', 'C', 'D'] as const;
    const scores = levels.map((l) => score({ ...base, evidence_level: l }).score!);
    for (let i = 1; i < scores.length; i++) expect(scores[i]!).toBeLessThan(scores[i - 1]!);
  });
  it('higher cost never raises the score', () => {
    for (const k of ['money_cost', 'time_cost', 'effort'] as const) {
      const lo = score({ ...base, [k]: 2 }).score!;
      const hi = score({ ...base, [k]: 4 }).score!;
      expect(hi).toBeLessThan(lo);
    }
  });
  it('rejects out-of-range inputs', () => {
    expect(() => score({ ...base, benefit: 6 })).toThrow(RangeError);
    expect(() => score({ ...base, money_cost: -1 })).toThrow(RangeError);
    expect(() => score({ ...base, effort: 2.5 })).toThrow(RangeError);
  });
});
