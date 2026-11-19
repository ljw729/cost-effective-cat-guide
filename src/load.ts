import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import type { Category, Entry, KnowledgeBase, Source, SynonymGroup } from './types.js';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.ya?ml$/.test(name)) out.push(p);
  }
  return out.sort();
}

export function readYaml<T>(path: string): T {
  return parse(readFileSync(path, 'utf8')) as T;
}

export function loadKnowledgeBase(root = ROOT): KnowledgeBase {
  const entries = walk(join(root, 'data/entries')).map((f) => {
    const e = readYaml<Entry>(f);
    e._file = relative(root, f).replaceAll('\\', '/');
    return e;
  });
  const sources = walk(join(root, 'data/sources')).flatMap((f) => readYaml<Source[]>(f) ?? []);
  const categories = readYaml<Category[]>(join(root, 'data/taxonomy/categories.yaml'));
  const synonyms = readYaml<SynonymGroup[]>(join(root, 'data/taxonomy/synonyms.yaml'));
  return { entries, sources, categories, synonyms };
}
