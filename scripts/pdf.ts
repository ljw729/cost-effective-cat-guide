/**
 * Prints an HTML file to PDF with a local Chrome / Chromium / Edge over the DevTools protocol.
 * Using the protocol (not --print-to-pdf) lets us control the footer: page numbers only,
 * never the local file path, plus a PDF outline (bookmarks) and tagged PDF.
 *
 * Browser lookup: CHROME_PATH env, then common install locations.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter((p): p is string => !!p);

export function findBrowser(): string {
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new Error('No Chrome/Chromium/Edge found. Set CHROME_PATH.');
  return found;
}

export async function printToPdf(htmlFile: string, opts: { title: string }): Promise<Buffer> {
  const profile = mkdtempSync(join(tmpdir(), 'cat-guide-pdf-'));
  const proc = spawn(findBrowser(), [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  try {
    const wsUrl = await new Promise<string>((resolve, reject) => {
      let buf = '';
      const t = setTimeout(() => reject(new Error('browser did not start')), 30000);
      proc.stderr!.on('data', (d: Buffer) => {
        buf += d.toString();
        const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
        if (m) { clearTimeout(t); resolve(m[1]!); }
      });
      proc.on('exit', (c) => reject(new Error(`browser exited (${c})`)));
    });
    const ws = new WebSocket(wsUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0;
    const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
    const listeners: ((msg: any) => void)[] = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id)!; pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result);
      } else listeners.forEach((l) => l(msg));
    };
    const send = (method: string, params: object = {}, sessionId?: string) => new Promise<any>((resolve, reject) => {
      const n = ++id; pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
    });

    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId);
    const loaded = new Promise<void>((r) => listeners.push((m) => { if (m.method === 'Page.loadEventFired' && m.sessionId === sessionId) r(); }));
    await send('Page.navigate', { url: pathToFileURL(htmlFile).href }, sessionId);
    await loaded;
    // Expand <details> so "还不知道 / 待补充" is printed.
    await send('Runtime.evaluate', { expression: 'document.querySelectorAll("details").forEach(d => d.open = true)' }, sessionId);
    const footer = `<div style="font-size:8px;width:100%;text-align:center;color:#666;font-family:sans-serif">${opts.title.replace(/</g, '&lt;')} · <span class="pageNumber"></span> / <span class="totalPages"></span></div>`;
    const res = await send('Page.printToPDF', {
      printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
      headerTemplate: '<span></span>', footerTemplate: footer,
      generateDocumentOutline: true, generateTaggedPDF: true,
    }, sessionId);
    ws.close();
    return Buffer.from(res.data, 'base64');
  } finally {
    proc.kill();
    await new Promise((r) => setTimeout(r, 500));
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* browser may still hold files on Windows */ }
  }
}
