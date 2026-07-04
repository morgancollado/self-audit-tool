#!/usr/bin/env node
// Prove the DYNAMIC (Vercel) build's per-request CSP nonce actually reaches
// the served HTML. csp-smoke.mjs guards the static export's hash-based CSP;
// this guards the other delivery mode, where middleware mints a fresh nonce
// per request and every rendered route must carry it on its scripts. Under
// `strict-dynamic` a non-nonced <script> is refused outright — a route that
// prerenders nonce-less HTML ships a page whose scripts never run (exactly
// how the '/' chooser broke: its layout didn't read x-nonce, so Next served
// static HTML while middleware promised a nonce the markup didn't have).
//
// No browser needed: the CSP header + script attributes are the contract.
// Asserts, for every route (including '/' and a legacy forwarder):
//   1. the response carries a nonce'd, strict-dynamic CSP header,
//   2. every EXECUTING <script> tag carries that exact nonce
//      (data blocks like type="application/json" don't execute — exempt),
//   3. the nonce rotates between requests (i.e. the route is truly
//      rendered per-request, not cached prerendered HTML).
//
// Run: npm run test:csp-dynamic   (needs a prior `npm run build`)

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const PORT = process.env.PORT || 3199;
const BASE = `http://localhost:${PORT}`;
// Every route shape: the chooser, a legacy forwarder, both locale landings,
// and a deep flow route.
const ROUTES = ['/', '/discover', '/en', '/es', '/en/remediate'];

if (!existsSync('.next/BUILD_ID')) {
  console.error('[dynamic-csp] No .next build. Run `npm run build` first.');
  process.exit(1);
}

let failed = false;
function fail(msg) {
  console.error(`[dynamic-csp] FAIL — ${msg}`);
  failed = true;
}

const server = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stderr.on('data', (d) => process.stderr.write(`[next] ${d}`));

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(BASE + '/en');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('server did not become ready');
}

function nonceFromCsp(csp) {
  return csp?.match(/'nonce-([^']+)'/)?.[1];
}

/** All <script ...> open tags that would execute (skip pure data blocks). */
function executingScriptTags(html) {
  return [...html.matchAll(/<script\b[^>]*/g)]
    .map((m) => m[0])
    .filter((tag) => !/type="application\/(?:ld\+)?json"/.test(tag));
}

async function checkRoute(route) {
  const res = await fetch(BASE + route);
  const csp = res.headers.get('content-security-policy');
  const html = await res.text();

  if (res.status !== 200) return fail(`${route} returned ${res.status}, expected 200.`);
  if (!csp) return fail(`${route} has no Content-Security-Policy header.`);
  if (!csp.includes("'strict-dynamic'")) return fail(`${route} CSP lacks 'strict-dynamic'.`);
  const nonce = nonceFromCsp(csp);
  if (!nonce) return fail(`${route} CSP carries no nonce.`);

  const tags = executingScriptTags(html);
  const bare = tags.filter((t) => !t.includes(`nonce="${nonce}"`));
  console.log(`[dynamic-csp] ${route}: ${tags.length} script tag(s), ${bare.length} without the CSP nonce`);
  if (tags.length === 0) return fail(`${route} served no script tags at all — nothing would hydrate.`);
  if (bare.length > 0) {
    for (const t of bare.slice(0, 4)) console.error(`    • ${t.slice(0, 100)}`);
    return fail(
      `${route}: ${bare.length} script tag(s) lack the response CSP nonce — strict-dynamic refuses them (route likely prerendered).`,
    );
  }

  // Per-request rendering: a second fetch must mint a different nonce.
  const nonce2 = nonceFromCsp((await fetch(BASE + route)).headers.get('content-security-policy'));
  if (nonce2 === nonce) fail(`${route}: nonce did not rotate between requests (cached response?).`);
}

try {
  await waitForServer();
  for (const route of ROUTES) await checkRoute(route);
  if (!failed) {
    console.log('[dynamic-csp] OK — every route serves per-request nonce’d scripts under strict-dynamic.');
  }
} catch (e) {
  fail(e.message);
} finally {
  server.kill('SIGTERM');
}
process.exit(failed ? 1 : 0);
