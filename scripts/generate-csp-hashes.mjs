#!/usr/bin/env node
// Build-time CSP for the STATIC export (self-host / offline).
//
// A pure static artifact can't mint per-request nonces, so after
// `STATIC_EXPORT=1 next build` we scan the emitted HTML in ./out for inline
// <script> blocks, hash each (sha256, base64), and bake a hash-based CSP into:
//
//   1. a <meta http-equiv="Content-Security-Policy"> tag in every HTML file
//      (the most portable option — works on ANY static host and fully offline),
//   2. an ./out/_headers file (Netlify / Cloudflare Pages header syntax),
//
// Header delivery is preferred where available (some directives like
// frame-ancestors are ignored in <meta>), so we emit both; the _headers file
// wins on hosts that read it, and the meta tag is the offline/last-resort.
//
// This is intentionally the *fallback* path: the primary Vercel deploy uses the
// nonce middleware, which is far less brittle than chasing inline-script hashes.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const OUT_DIR = 'out';
const HIBP_RANGE_ORIGIN = 'https://api.pwnedpasswords.com';

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (p.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

function collectHashes(htmlFiles) {
  const hashes = new Set();
  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    let m;
    while ((m = INLINE_SCRIPT.exec(html)) !== null) {
      const body = m[1];
      if (body.trim() === '') continue;
      const digest = createHash('sha256').update(body, 'utf8').digest('base64');
      hashes.add(digest);
    }
  }
  return [...hashes];
}

function buildCsp(hashes) {
  const proxy = process.env.NEXT_PUBLIC_HIBP_PROXY_URL;
  const cdn = process.env.NEXT_PUBLIC_CONTENT_CDN_URL;
  const connect = ["'self'", HIBP_RANGE_ORIGIN, proxy, cdn].filter(Boolean).join(' ');
  const scriptSrc = ["'self'", ...hashes.map((h) => `'sha256-${h}'`), "'strict-dynamic'"].join(' ');
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${connect}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

function injectMeta(htmlFiles, csp) {
  // Note: frame-ancestors is ignored when delivered via <meta>; that's why we
  // ALSO emit _headers. The meta tag guarantees the artifact is safe offline.
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp.replace(/"/g, '&quot;')}">`;
  for (const file of htmlFiles) {
    let html = readFileSync(file, 'utf8');
    if (html.includes('http-equiv="Content-Security-Policy"')) continue;
    html = html.replace(/<head([^>]*)>/i, `<head$1>${meta}`);
    writeFileSync(file, html);
  }
}

function writeHeadersFile(csp) {
  const body = `/*
  Content-Security-Policy: ${csp}
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Permissions-Policy: geolocation=(), camera=(), microphone=()
`;
  writeFileSync(join(OUT_DIR, '_headers'), body);
}

function main() {
  let htmlFiles;
  try {
    htmlFiles = walk(OUT_DIR);
  } catch {
    console.error(`[csp] No ./${OUT_DIR} directory. Run \`STATIC_EXPORT=1 next build\` first.`);
    process.exit(1);
  }
  const hashes = collectHashes(htmlFiles);
  const csp = buildCsp(hashes);
  injectMeta(htmlFiles, csp);
  writeHeadersFile(csp);
  console.log(`[csp] ${htmlFiles.length} HTML files, ${hashes.length} unique inline-script hashes.`);
  console.log('[csp] Injected <meta> CSP and wrote out/_headers.');
}

main();
