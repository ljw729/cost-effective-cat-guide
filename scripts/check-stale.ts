import { loadKnowledgeBase } from '../src/load.js';
import { findStale } from '../src/stale.js';

const items = findStale(loadKnowledgeBase());
for (const s of items) console.log(`${s.id} ${s.title} — last reviewed ${s.last_reviewed}, due ${s.due}: ${s.reason}`);
console.log(`\n${items.length} entries in the review queue. (Report only — nothing was changed.)`);
// Stale content is a maintenance signal, not a build failure.
