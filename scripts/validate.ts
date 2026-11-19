import { loadKnowledgeBase } from '../src/load.js';
import { validateKnowledgeBase } from '../src/validate.js';

const kb = loadKnowledgeBase();
const issues = validateKnowledgeBase(kb);
const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');
for (const i of [...errors, ...warnings]) console.log(`${i.level === 'error' ? '✗' : '!'} [${i.rule}] ${i.where}: ${i.message}`);
console.log(`\n${kb.entries.length} entries, ${kb.sources.length} sources — ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
