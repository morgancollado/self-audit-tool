#!/usr/bin/env node
// CI gate: fail the build if a known phone-home / tracker package appears in
// the dependency tree. The blocklist names @vercel/analytics and
// @vercel/speed-insights explicitly — they are the most likely accidental
// reintroduction on our host (scope/docs/06-risk-register.md R6).

import { readFileSync } from 'node:fs';

const BLOCKLIST = [
  '@vercel/analytics',
  '@vercel/speed-insights',
  'react-ga',
  'react-ga4',
  'mixpanel-browser',
  'posthog-js',
  '@segment/analytics-next',
  'amplitude-js',
  '@amplitude/analytics-browser',
  'hotjar',
  '@sentry/browser',
  '@sentry/nextjs',
  'logrocket',
  'fullstory',
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function collectDeps() {
  const pkg = readJson('package.json');
  const direct = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
    ...(pkg.optionalDependencies || {}),
  };
  const all = new Set(Object.keys(direct));
  // Also scan the lockfile if present, to catch transitive trackers.
  try {
    const lock = readFileSync('package-lock.json', 'utf8');
    for (const name of BLOCKLIST) {
      // Match an installed package path (including nested node_modules) or a
      // dependency-declaration key — not just any quoted occurrence of the name.
      if (lock.includes(`node_modules/${name}"`) || lock.includes(`"${name}":`)) all.add(name);
    }
  } catch {
    /* no lockfile yet — direct deps only */
  }
  return all;
}

const present = collectDeps();
const hits = BLOCKLIST.filter((name) => present.has(name));

if (hits.length > 0) {
  console.error('[no-tracker] BLOCKED — phone-home/tracker package(s) present:');
  for (const h of hits) console.error(`  • ${h}`);
  console.error('Errata ships zero analytics/trackers. Remove these to proceed.');
  process.exit(1);
}

console.log('[no-tracker] OK — no blocklisted tracker packages found.');
