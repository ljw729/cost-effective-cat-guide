/**
 * Cost-effectiveness scoring — the single implementation used by validation,
 * the website, PDF/EPUB and the AI skill. Documented in docs/scoring-methodology.md.
 * Any change here must update that document and the CHANGELOG.
 */

export type EvidenceLevel = 'A' | 'B' | 'C' | 'D';
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';
export type EntryType =
  | 'recommendation'
  | 'dont'
  | 'buying_guide'
  | 'emergency'
  | 'myth'
  | 'evidence_gap';

export interface ScoreInput {
  type: EntryType;
  benefit: number; // 1–5
  risk_reduction: number; // 1–5
  money_cost: number; // 0–5
  time_cost: number; // 1–5
  effort: number; // 1–5
  harm_potential: number; // 0–3: how much harm the action itself can cause if done wrong
  evidence_level: EvidenceLevel;
}

export interface ScoreResult {
  graded: boolean;
  grade: Grade | null;
  /** Grade before caps were applied. */
  uncapped_grade: Grade | null;
  score: number | null;
  breakdown: {
    value: number;
    confidence: number;
    burden: number;
    harm_penalty: number;
  } | null;
  caps: string[];
  reason_not_graded?: string;
}

export const EVIDENCE_CONFIDENCE: Record<EvidenceLevel, number> = {
  A: 1.0,
  B: 0.85,
  C: 0.65,
  D: 0.4,
};

export const WEIGHTS = {
  benefit: 0.6,
  risk_reduction: 0.4,
  money: 0.5,
  time: 0.25,
  effort: 0.25,
  burden: 0.45,
  harm: 0.75,
} as const;

/** Lower bound (inclusive) of each grade. */
export const THRESHOLDS: ReadonlyArray<[Grade, number]> = [
  ['S', 3.4],
  ['A', 2.6],
  ['B', 1.8],
  ['C', 1.0],
  ['D', -Infinity],
];

const ORDER: Grade[] = ['S', 'A', 'B', 'C', 'D'];

/** Entry types for which a cost-effectiveness grade is meaningless or harmful. */
export const UNGRADED_TYPES: Record<string, string> = {
  emergency: '紧急情况不按性价比决策：先联系兽医。',
  myth: '误区条目给出的是“真伪判断”，不是行动建议。',
  evidence_gap: '证据不足，无法可靠评估收益。',
};

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function gradeOf(score: number): Grade {
  for (const [g, lo] of THRESHOLDS) if (score >= lo) return g;
  return 'D';
}

function capAt(g: Grade, max: Grade): Grade {
  return ORDER.indexOf(g) < ORDER.indexOf(max) ? max : g;
}

function checkRange(name: string, v: number, lo: number, hi: number) {
  if (!Number.isInteger(v) || v < lo || v > hi) {
    throw new RangeError(`${name} must be an integer in [${lo}, ${hi}], got ${v}`);
  }
}

export function score(input: ScoreInput): ScoreResult {
  if (input.type in UNGRADED_TYPES) {
    return {
      graded: false,
      grade: null,
      uncapped_grade: null,
      score: null,
      breakdown: null,
      caps: [],
      reason_not_graded: UNGRADED_TYPES[input.type],
    };
  }
  checkRange('benefit', input.benefit, 1, 5);
  checkRange('risk_reduction', input.risk_reduction, 1, 5);
  checkRange('money_cost', input.money_cost, 0, 5);
  checkRange('time_cost', input.time_cost, 1, 5);
  checkRange('effort', input.effort, 1, 5);
  checkRange('harm_potential', input.harm_potential, 0, 3);

  const value = WEIGHTS.benefit * input.benefit + WEIGHTS.risk_reduction * input.risk_reduction;
  const confidence = EVIDENCE_CONFIDENCE[input.evidence_level];
  const burden =
    WEIGHTS.money * input.money_cost +
    WEIGHTS.time * (input.time_cost - 1) +
    WEIGHTS.effort * (input.effort - 1);
  const harm_penalty = WEIGHTS.harm * input.harm_potential;
  const s = value * confidence - WEIGHTS.burden * burden - harm_penalty;

  const uncapped = gradeOf(s);
  let g = uncapped;
  const caps: string[] = [];
  if (input.evidence_level === 'D') {
    if (capAt(g, 'C') !== g) caps.push('证据等级 D：性价比最高为 C');
    g = capAt(g, 'C');
  } else if (input.evidence_level === 'C') {
    if (capAt(g, 'A') !== g) caps.push('证据等级 C：性价比最高为 A');
    g = capAt(g, 'A');
  }
  if (input.harm_potential >= 2) {
    if (capAt(g, 'C') !== g) caps.push('操作本身有明显伤害风险：性价比最高为 C');
    g = capAt(g, 'C');
  }

  return {
    graded: true,
    grade: g,
    uncapped_grade: uncapped,
    score: round(s),
    breakdown: {
      value: round(value),
      confidence,
      burden: round(burden),
      harm_penalty: round(harm_penalty),
    },
    caps,
  };
}

export const GRADE_LABELS: Record<Grade, string> = {
  S: '极高',
  A: '高',
  B: '中等',
  C: '较低',
  D: '通常不值得优先投入',
};
