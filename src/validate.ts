import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { ROOT } from './load.js';
import type { KnowledgeBase, Entry, Source } from './types.js';

export interface Issue {
  level: 'error' | 'warning';
  where: string;
  rule: string;
  message: string;
}

const STRONG_SOURCE_TYPES = new Set(['systematic_review', 'meta_analysis', 'guideline', 'consensus_statement']);
const STUDY_TYPES = new Set(['rct', 'cohort', 'case_control', 'cross_sectional', 'case_series', 'experimental']);

/** Drug dose patterns. This guide never gives doses (see docs/source-policy.md §2). */
const DOSE_PATTERNS = [
  /\d+(\.\d+)?\s*(mg|ml|mL|μg|ug|IU)\s*\/\s*(kg|公斤)/,
  /\d+(\.\d+)?\s*(毫克|毫升|微克)\s*(\/|每)\s*(千克|公斤|kg)/,
];

function textOf(e: Entry): string {
  return [
    e.title, e.summary, e.recommendation, e.why_it_matters,
    ...(e.how_to_do_it ?? []), ...(e.exceptions ?? []), ...(e.warning_signs ?? []),
    ...(e.emergency_action ?? []), ...(e.do_not ?? []),
  ].join('\n');
}

function compileSchema(name: string) {
  // strictRequired off: if/then branches legitimately require properties declared at the top level.
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  // ajv-formats is CJS; under NodeNext its default export is the module object.
  const addFormats = ((addFormatsModule as unknown as { default?: unknown }).default ?? addFormatsModule) as (a: Ajv2020) => void;
  addFormats(ajv);
  const schema = JSON.parse(readFileSync(join(ROOT, 'schema', name), 'utf8'));
  return ajv.compile(schema);
}

export function validateKnowledgeBase(kb: KnowledgeBase, today = new Date()): Issue[] {
  const issues: Issue[] = [];
  const err = (where: string, rule: string, message: string) => issues.push({ level: 'error', where, rule, message });
  const warn = (where: string, rule: string, message: string) => issues.push({ level: 'warning', where, rule, message });

  // ---- Schema ----
  const entrySchema = compileSchema('entry.schema.json');
  const sourceSchema = compileSchema('source.schema.json');
  if (!sourceSchema(kb.sources)) {
    for (const e of sourceSchema.errors ?? []) err('data/sources', 'schema', `${e.instancePath} ${e.message}`);
  }
  for (const entry of kb.entries) {
    const { _file, ...data } = entry;
    if (!entrySchema(data)) {
      for (const e of entrySchema.errors ?? []) err(_file ?? entry.id, 'schema', `${e.instancePath} ${e.message}`);
    }
  }

  // ---- Sources ----
  const sourceById = new Map<string, Source>();
  for (const s of kb.sources) {
    if (sourceById.has(s.id)) err(`source:${s.id}`, 'unique-source-id', 'duplicate source id');
    sourceById.set(s.id, s);
    if (!s.verification?.exists) err(`source:${s.id}`, 'source-exists', 'source not verified to exist; it cannot be used');
    if (s.verification && !s.verification.metadata_match) err(`source:${s.id}`, 'source-metadata', 'metadata does not match registry (title/year/author)');
    if (s.doi && !s.doi.startsWith('10.')) err(`source:${s.id}`, 'doi', 'malformed DOI');
  }
  const doiSeen = new Map<string, string>();
  for (const s of kb.sources) {
    if (!s.doi) continue;
    const d = s.doi.toLowerCase();
    if (doiSeen.has(d)) err(`source:${s.id}`, 'duplicate-doi', `same DOI as ${doiSeen.get(d)}`);
    doiSeen.set(d, s.id);
  }

  // ---- Entries ----
  const catById = new Map(kb.categories.map((c) => [c.id, c]));
  const ids = new Map<string, string>();
  const slugs = new Map<string, string>();
  const knownTags = new Set(kb.synonyms.map((g) => g.tag));
  for (const g of kb.synonyms) {
    for (const t of g.terms ?? []) if (typeof t !== 'string') err('data/taxonomy/synonyms.yaml', 'synonym-type', `tag "${g.tag}": term ${JSON.stringify(t)} is not a string (quote it in YAML)`);
  }
  const usedSources = new Set<string>();
  // Local calendar date (maintainers write dates in their own time zone); allow +1 day of slack.
  const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
  const todayStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  for (const e of kb.entries) {
    const where = e._file ?? e.id;
    if (ids.has(e.id)) err(where, 'unique-id', `id ${e.id} also used in ${ids.get(e.id)}`);
    ids.set(e.id, where);
    if (slugs.has(e.slug)) err(where, 'unique-slug', `slug ${e.slug} also used in ${slugs.get(e.slug)}`);
    slugs.set(e.slug, where);

    if (e._file) {
      if (basename(e._file).replace(/\.ya?ml$/, '') !== e.slug) err(where, 'filename', 'file name must equal slug');
      if (!e._file.startsWith(`data/entries/${e.category}/`)) err(where, 'folder', `file must live in data/entries/${e.category}/`);
    }

    const cat = catById.get(e.category);
    if (!cat) { err(where, 'category', `unknown category "${e.category}"`); continue; }

    // dates
    if (e.last_reviewed < e.created) err(where, 'dates', 'last_reviewed is before created');
    if (e.last_reviewed > todayStr) err(where, 'dates', 'last_reviewed is in the future');

    // source references
    const refIds = new Set<string>();
    const refs = e.sources ?? [];
    const resolved: { ref: (typeof refs)[number]; src: Source }[] = [];
    for (const ref of refs) {
      if (refIds.has(ref.id)) err(where, 'duplicate-ref', `source ${ref.id} cited twice`);
      refIds.add(ref.id);
      usedSources.add(ref.id);
      const src = sourceById.get(ref.id);
      if (!src) { err(where, 'missing-source', `unknown source id "${ref.id}"`); continue; }
      resolved.push({ ref, src });
      if (src.verification?.read_level === 'metadata_only' && ref.support_check !== 'pending') {
        err(where, 'support-without-reading', `${ref.id}: only metadata was read, support_check must stay "pending"`);
      }
    }
    const tier1 = resolved.filter((r) => r.src.tier === 1);
    const checkedTier1 = tier1.filter((r) => r.ref.support_check !== 'pending');

    // evidence rules
    const lvl = e.evidence?.level;
    if (lvl === 'A') {
      const strong = tier1.some((r) => STRONG_SOURCE_TYPES.has(r.src.source_type));
      const studies = tier1.filter((r) => STUDY_TYPES.has(r.src.source_type)).length;
      if (!strong && studies < 3) err(where, 'evidence-A', 'level A needs a guideline / consensus / systematic review, or ≥3 Tier 1 studies');
    }
    if (lvl === 'A' || lvl === 'B') {
      if (tier1.length === 0) err(where, 'evidence-tier', `level ${lvl} needs at least one Tier 1 source`);
      else if (checkedTier1.length === 0) err(where, 'evidence-checked', `level ${lvl} needs at least one Tier 1 source whose support has been checked`);
    }
    if (resolved.length > 0 && resolved.every((r) => r.ref.support_check === 'pending')) {
      warn(where, 'all-pending', 'no source has been checked to support this entry yet');
    }

    if (e.evidence?.conflict && !e.evidence.conflict_notes) {
      err(where, 'evidence-conflict', 'evidence.conflict is true but conflict_notes are missing — show the disagreement, do not hide it');
    }

    // high-risk rules
    const highRisk = cat.high_risk || e.type === 'emergency';
    if (highRisk) {
      if (!e.medical_review_required) err(where, 'medical-review', 'high-risk entries must set medical_review_required: true');
      if (tier1.length === 0) err(where, 'high-risk-tier1', 'high-risk entries need at least one Tier 1 source');
    }
    const body = textOf(e);
    for (const re of DOSE_PATTERNS) {
      if (re.test(body)) err(where, 'no-doses', 'entries must not contain drug doses');
    }

    // review status
    if (e.review_status === 'vet_reviewed' && !(e.reviewers ?? []).some((r) => r.role === 'veterinarian')) {
      err(where, 'vet-reviewer', 'vet_reviewed requires a veterinarian in reviewers');
    }
    if (e.review_status === 'ai_researched' && resolved.every((r) => r.ref.support_check === 'pending')) {
      err(where, 'review-status', 'ai_researched requires at least one checked source');
    }

    // type-specific
    if (e.type !== 'emergency' && e.urgency === 'emergency') warn(where, 'urgency', 'urgency "emergency" on a non-emergency entry');

    // tags
    for (const t of e.tags) if (!knownTags.has(t)) warn(where, 'tag-synonyms', `tag "${t}" has no synonym group (search will rely on text only)`);
  }

  // cross references
  for (const e of kb.entries) {
    for (const r of [...(e.related ?? []), ...(e.myth_related ?? [])]) {
      if (!ids.has(r)) err(e._file ?? e.id, 'related', `unknown related id ${r}`);
      if (r === e.id) err(e._file ?? e.id, 'related', 'entry relates to itself');
    }
    for (const p of e.evidence?.conflict_notes?.positions ?? []) {
      for (const s of p.sources) if (!refIds(e).has(s)) err(e._file ?? e.id, 'conflict-sources', `conflict position cites ${s}, which is not in sources`);
    }
  }

  for (const s of kb.sources) if (!usedSources.has(s.id)) warn(`source:${s.id}`, 'unused-source', 'source is not cited by any entry');

  const seenStart = new Set<string>();
  for (const item of kb.startHere ?? []) {
    if (!ids.has(item.id)) err('data/taxonomy/start-here.yaml', 'start-here', `unknown entry id ${item.id}`);
    if (seenStart.has(item.id)) err('data/taxonomy/start-here.yaml', 'start-here', `duplicate entry id ${item.id}`);
    seenStart.add(item.id);
  }

  return issues;
}

function refIds(e: Entry): Set<string> {
  return new Set((e.sources ?? []).map((s) => s.id));
}
