#!/usr/bin/env node
// Browser smoke test: prove the STATIC EXPORT actually runs under its own
// enforced Content-Security-Policy. A successful `next build` and "hashes were
// injected" are NOT proof the app works — the scripts still have to load and
// React still has to hydrate under the CSP. This is the gate that would have
// caught the strict-dynamic self-block (the framework chunks being refused,
// leaving a dead, un-hydrated shell with an inert panic button).
//
// We serve ./out with ONLY the <meta> CSP applied (no _headers) — the
// "any static host / fully offline" case the export explicitly targets and the
// strictest realistic delivery. Then, in real Chromium, we assert:
//   1. zero CSP violations and zero blocked scripts,
//   2. the app HYDRATED (left the SSR "Loading…" shell for real content),
//   3. first load leaves NO durable trace before consent — no IndexedDB
//      database is created and persistence is not granted until the user opts in.
//
// Run: npm run test:csp   (builds the static export first, then this)

import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const OUT = 'out';
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.txt': 'text/plain', '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

function fail(msg) {
  console.error(`[csp-smoke] FAIL — ${msg}`);
  process.exitCode = 1;
}

if (!existsSync(join(OUT, 'index.html'))) {
  console.error(`[csp-smoke] No ./${OUT}/index.html. Run \`npm run build:static\` first.`);
  process.exit(1);
}

// Static server that deliberately does NOT honor _headers, so the <meta> CSP is
// the only policy in force (the offline / dumb-host scenario).
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  let fp = join(OUT, p);
  if (existsSync(fp) && statSync(fp).isDirectory()) fp = join(fp, 'index.html');
  // Clean-URL fallback (/discover -> discover.html), as static hosts serve.
  if (!existsSync(fp) && existsSync(fp + '.html')) fp = fp + '.html';
  if (!existsSync(fp)) { res.statusCode = 404; res.end('not found'); return; }
  res.setHeader('Content-Type', TYPES[extname(fp)] || 'application/octet-stream');
  res.end(readFileSync(fp));
});

await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const blockedScripts = [];
  page.on('requestfailed', (r) => {
    if (r.failure()?.errorText?.includes('csp')) blockedScripts.push(r.url().replace(base, '/'));
  });
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__csp.push(`${e.effectiveDirective || e.violatedDirective} blocked ${e.blockedURI || 'inline'}`);
    });
  });

  await page.goto(base, { waitUntil: 'networkidle' });
  // Hydration: the SSR shell renders "Loading…"; it only becomes real content
  // once the client scripts run. Give it a bounded window to get there.
  let hydrated = true;
  try {
    await page.getByText('Find what’s published about you', { exact: false }).waitFor({ timeout: 8000 });
  } catch {
    hydrated = false;
  }

  const probe = await page.evaluate(async () => {
    let dbs = [];
    try { dbs = (await indexedDB.databases()).map((d) => d.name); } catch { dbs = ['<error>']; }
    let persisted = null;
    try { persisted = await navigator.storage.persisted(); } catch { /* ignore */ }
    const main = (document.querySelector('#main')?.innerText || '').replace(/\s+/g, ' ').trim();
    return { violations: window.__csp || [], dbs, persisted, main };
  });

  console.log(`[csp-smoke] #main: ${JSON.stringify(probe.main.slice(0, 90))}`);
  console.log(`[csp-smoke] CSP violations: ${probe.violations.length}  blocked scripts: ${blockedScripts.length}`);
  console.log(`[csp-smoke] IndexedDB databases at first load: ${JSON.stringify(probe.dbs)}  persisted: ${probe.persisted}`);

  if (probe.violations.length || blockedScripts.length) {
    for (const v of probe.violations.slice(0, 12)) console.error(`    • ${v}`);
    for (const s of blockedScripts.slice(0, 12)) console.error(`    • blocked ${s}`);
    fail('the static export violates its own CSP (scripts refused).');
  }
  if (!hydrated || probe.main.includes('Loading')) {
    fail('the static export did not hydrate under the CSP (stuck on the SSR shell).');
  }
  // No durable trace may be written before the user consents on the safety intro.
  if (probe.dbs.length > 0) {
    fail(`first load created IndexedDB database(s) before consent: ${JSON.stringify(probe.dbs)}.`);
  }
  if (probe.persisted === true) {
    fail('first load was granted persistent storage before consent.');
  }

  // ---- /discover: safety gate + deadname-query routing (M1 hardening) ----
  const dctx = await browser.newContext();
  const dpage = await dctx.newPage();
  await dpage.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__csp.push(`${e.effectiveDirective || e.violatedDirective} ${e.blockedURI || 'inline'}`));
  });
  await dpage.goto(base + 'discover', { waitUntil: 'networkidle' });

  // A fresh visitor deep-linking to /discover must hit the safety intro, NOT the
  // deadname inputs.
  let introGate = false;
  try {
    await dpage.getByText('Before you start').waitFor({ timeout: 8000 });
    introGate = true;
  } catch { /* intro not shown */ }
  const deadnameBefore = await dpage.getByLabel('Former name (deadname)').count();
  if (!introGate) fail('/discover did not show the safety intro for a fresh visitor (deep-link bypass).');
  if (deadnameBefore > 0) fail('/discover exposed the deadname input before the safety intro was acknowledged.');

  // Acknowledge (session-only) → the discover UI appears. Enter a deadname and
  // confirm every resulting "Run" link goes to DuckDuckGo, never Google.
  await dpage.getByRole('button', { name: /session-only/i }).click();
  await dpage.getByLabel('Former name (deadname)').waitFor({ timeout: 8000 });
  await dpage.getByLabel('Former name (deadname)').fill('Deadname McTest');
  await dpage.waitForTimeout(300);
  const runHrefs = await dpage.locator('a.query-run').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  const dviol = await dpage.evaluate(() => window.__csp || []);
  const toGoogle = runHrefs.filter((h) => h && h.includes('google.com'));
  console.log(`[csp-smoke] /discover: intro-gated=${introGate}, run links=${runHrefs.length}, →google=${toGoogle.length}`);
  console.log(`[csp-smoke] /discover first run link: ${runHrefs[0]}`);
  if (dviol.length) fail('/discover violated its CSP.');
  if (runHrefs.length === 0) fail('/discover produced no run links after a deadname was entered.');
  if (toGoogle.length > 0) fail(`a deadname "Run" link points at Google: ${toGoogle[0]}`);
  if (!runHrefs.every((h) => h && h.includes('duckduckgo.com'))) fail('a deadname "Run" link is not routed to DuckDuckGo.');
  await dctx.close();

  if (!process.exitCode) {
    console.log('[csp-smoke] OK — static export runs under its CSP, leaves no pre-consent trace,');
    console.log('[csp-smoke]      gates /discover behind the safety intro, and routes deadname searches to DuckDuckGo.');
  }
} finally {
  await browser.close();
  server.close();
}
