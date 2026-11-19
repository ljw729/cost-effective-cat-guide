import type { EntryType, EvidenceLevel } from './scoring.js';

export type SupportCheck = 'pending' | 'ai_checked' | 'human_checked' | 'vet_checked';
export type ReadLevel = 'full_text' | 'abstract' | 'page' | 'metadata_only';

export interface SourceRef {
  id: string;
  supports: string;
  support_check: SupportCheck;
  locator?: string;
}

export interface Entry {
  id: string;
  slug: string;
  type: EntryType;
  title: string;
  summary: string;
  category: string;
  subcategory?: string;
  tags: string[];
  recommendation: string;
  why_it_matters: string;
  how_to_do_it?: string[];
  exceptions?: string[];
  warning_signs?: string[];
  emergency_action?: string[];
  do_not?: string[];
  applies_to: string[];
  urgency: 'routine' | 'important' | 'urgent' | 'emergency';
  region_notes?: string;
  myth_claim?: string;
  myth_verdict?: 'incorrect' | 'mostly_incorrect' | 'uncertain' | 'partly_correct' | 'correct';
  myth_related?: string[];
  related?: string[];
  scores: {
    benefit: number;
    risk_reduction: number;
    money_cost: number;
    time_cost: number;
    effort: number;
    harm_potential: number;
    rationale?: string;
  };
  evidence: {
    level: EvidenceLevel;
    summary: string;
    conflict?: boolean;
    conflict_notes?: {
      positions: { position: string; sources: string[] }[];
      current_interpretation: string;
    };
    gaps?: string[];
  };
  medical_review_required: boolean;
  review_status: 'draft' | 'ai_researched' | 'maintainer_reviewed' | 'vet_reviewed';
  reviewers?: { name?: string; role: string; credentials?: string; date: string }[];
  created: string;
  last_reviewed: string;
  sources: SourceRef[];
  /** Set by the loader, not by authors. */
  _file?: string;
}

export interface Source {
  id: string;
  title: string;
  organization: string;
  authors?: string[];
  year: number;
  container?: string;
  doi?: string;
  pmid?: string;
  pmcid?: string;
  url: string;
  archive_url?: string;
  source_type: string;
  tier: 1 | 2;
  sample_size?: string;
  conflict_of_interest?: string;
  accessed: string;
  superseded_by?: string;
  notes?: string;
  verification: {
    exists: boolean;
    metadata_match: boolean;
    read_level: ReadLevel;
    checked: string;
    method?: string;
  };
}

export interface Category {
  id: string;
  order: number;
  name: Record<string, string>;
  high_risk: boolean;
  review_months: number;
}

export interface SynonymGroup {
  tag: string;
  terms: string[];
}

export interface KnowledgeBase {
  entries: Entry[];
  sources: Source[];
  categories: Category[];
  synonyms: SynonymGroup[];
}
