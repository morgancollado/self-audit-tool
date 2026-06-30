#!/usr/bin/env node
// Staleness report (WARN-ONLY): lists every content file whose `lastVerified` is
// older than the freshness budget. Broker opt-out flows, platform UIs, and law
// rot (scope/docs/06-risk-register.md R5, R17) — this surfaces what's aging so a
// solo maintainer can see the queue. It never fails the build: stale content is
// already flagged in-app via `lastVerified`; this is a maintenance signal, not a
// gate. Pass --max-days=N to override the budget.
//
// Run: npm run report:staleness

import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CONTENT_DIR = 'content';
const arg = process.argv.find((a) => a.startsWith('--max-days='));
const MAX_DAYS = arg ? Number(arg.split('=')[1]) : 180;

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith('.json')) acc.push(p);
  }
  return acc;
}

const today = new Date();
const files = walk(CONTENT_DIR).filter((p) => !p.includes(`${CONTENT_DIR}/schema/`));

const stale = [];
for (const file of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    continue; // shape problems are the validator's job, not ours
  }
  if (!data || typeof data.lastVerified !== 'string') continue;
  const verified = new Date(data.lastVerified);
  if (Number.isNaN(verified.getTime())) continue;
  const ageDays = Math.floor((today - verified) / 86_400_000);
  if (ageDays > MAX_DAYS) stale.push({ file, ageDays, lastVerified: data.lastVerified });
}

if (stale.length === 0) {
  console.log(`[staleness] OK — no content older than ${MAX_DAYS} days.`);
} else {
  stale.sort((a, b) => b.ageDays - a.ageDays);
  console.log(`[staleness] ${stale.length} file(s) past the ${MAX_DAYS}-day budget (warn-only):`);
  for (const s of stale) console.log(`    • ${s.file} — ${s.ageDays}d (lastVerified ${s.lastVerified})`);
}
// Always succeed: this is a signal, not a gate.
