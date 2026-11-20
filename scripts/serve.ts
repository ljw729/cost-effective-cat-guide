/** Minimal static server for previewing dist/site locally: npm run serve  (PORT=4173) */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { ROOT } from '../src/load.js';

const DIR = join(ROOT, 'dist', 'site');
const PORT = Number(process.env.PORT ?? 4173);
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.epub': 'application/epub+zip',
};

createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]!);
  let file = normalize(join(DIR, url));
  if (!file.startsWith(DIR)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404, { 'content-type': TYPES['.html']! }).end(readFileSync(join(DIR, '404.html'))); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
}).listen(PORT, () => console.log(`serving dist/site at http://localhost:${PORT}/`));
