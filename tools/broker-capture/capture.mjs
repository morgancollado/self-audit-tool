#!/usr/bin/env node
// Local broker opt-out capture aid (maintainer tool — runs on YOUR machine, not
// CI, not the app). Opens each target broker's opt-out page in a REAL browser on
// your residential connection — the thing the build sandbox can't do (its egress
// proxy blocks Chromium, and broker WAFs 403 datacenter/headless clients). For
// each page it captures the final URL, a full-page screenshot, and the visible
// text, then writes ./broker-captures/captures.json.
//
// You read the screenshots/text and make the SAFETY-CRITICAL judgment calls this
// tool can't (does opting out expose the current<->former linkage? is ID
// required?). Send captures.json back and it becomes validated broker JSON.
//
// Usage (from repo root, after `npx playwright install chromium`):
//   node tools/broker-capture/capture.mjs            # headed; press Enter per
//                                                    # page AFTER solving any CAPTCHA
//   node tools/broker-capture/capture.mjs --auto --dwell=6000   # unattended
//   node tools/broker-capture/capture.mjs --only=radaris,mylife # subset
//
// Flags:
//   --auto         don't prompt; just dwell --dwell ms on each page then capture
//   --dwell=MS     wait MS after load before capturing (default 4000)
//   --headless     run headless (you won't be able to solve CAPTCHAs)
//   --only=a,b,c   capture only these slugs

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import readline from 'node:readline';

// The remaining depth-first target set (see scope/docs/14-broker-coverage-runbook.md).
// `find: true` = the opt-out URL had drifted at last check; confirm the current
// one in the browser and note it. Order roughly groups shared-portal families.
const TARGETS = [
  { slug: 'intelius',         name: 'Intelius',          category: 'people-search',    url: 'https://www.intelius.com/opt-out/' },
  { slug: 'truthfinder',      name: 'TruthFinder',       category: 'background-check', url: 'https://www.truthfinder.com/opt-out/' },
  { slug: 'instantcheckmate', name: 'Instant Checkmate', category: 'background-check', url: 'https://www.instantcheckmate.com/opt-out/' },
  { slug: 'ussearch',         name: 'US Search',         category: 'people-search',    url: 'https://www.ussearch.com/opt-out/' },
  { slug: 'peoplesmart',      name: 'PeopleSmart',       category: 'people-search',    url: 'https://www.peoplesmart.com/', find: true },
  { slug: 'zabasearch',       name: 'ZabaSearch',        category: 'people-search',    url: 'https://www.zabasearch.com/block_records/' },
  { slug: 'addresses',        name: 'Addresses.com',     category: 'people-search',    url: 'https://www.addresses.com/optout.php' },
  { slug: 'anywho',           name: 'AnyWho',            category: 'people-search',    url: 'https://www.anywho.com/optout' },
  { slug: 'peoplelooker',     name: 'PeopleLooker',      category: 'background-check', url: 'https://www.peoplelooker.com/', find: true },
  { slug: 'neighborwho',      name: 'NeighborWho',       category: 'people-search',    url: 'https://www.neighborwho.com/', find: true },
  { slug: 'ownerly',          name: 'Ownerly',           category: 'other',            url: 'https://www.ownerly.com/', find: true },
  { slug: 'radaris',          name: 'Radaris',           category: 'people-search',    url: 'https://radaris.com/control/privacy' },
  { slug: 'mylife',           name: 'MyLife',            category: 'people-search',    url: 'https://www.mylife.com/ccpa/index.pubview' },
  { slug: 'peekyou',          name: 'PeekYou',           category: 'people-search',    url: 'https://www.peekyou.com/', find: true },
  { slug: 'nuwber',           name: 'Nuwber',            category: 'people-search',    url: 'https://nuwber.com/removal/link' },
  { slug: 'clustrmaps',       name: 'ClustrMaps',        category: 'people-search',    url: 'https://clustrmaps.com/bl/opt-out' },
  { slug: 'usphonebook',      name: 'USPhoneBook',       category: 'people-search',    url: 'https://www.usphonebook.com/opt-out' },
  { slug: 'truepeoplesearch', name: 'TruePeopleSearch',  category: 'people-search',    url: 'https://www.truepeoplesearch.com/removal' },
  { slug: 'fastpeoplesearch', name: 'FastPeopleSearch',  category: 'people-search',    url: 'https://www.fastpeoplesearch.com/removal' },
  { slug: 'searchpeoplefree', name: 'SearchPeopleFree',  category: 'people-search',    url: 'https://www.searchpeoplefree.com/opt-out' },
];

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (k, d) => { const a = args.find((x) => x.startsWith(`${k}=`)); return a ? a.split('=')[1] : d; };
const AUTO = has('--auto');
const HEADLESS = has('--headless');
const DWELL = Number(val('--dwell', '4000'));
const ONLY = val('--only', '').split(',').map((s) => s.trim()).filter(Boolean);

const WALL_RE = /captcha|cloudflare|are you human|verify you are|attention required|just a moment|enable javascript|ray id|access denied|unusual traffic|press & hold/i;

const OUT_DIR = 'broker-captures';
mkdirSync(OUT_DIR, { recursive: true });

const rl = AUTO ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => (rl ? rl.question(q, res) : res('')));

const targets = ONLY.length ? TARGETS.filter((t) => ONLY.includes(t.slug)) : TARGETS;

console.log(`\nBroker opt-out capture — ${targets.length} target(s). Output → ./${OUT_DIR}/`);
console.log(AUTO ? `Unattended (${DWELL}ms dwell).` : `Headed: solve any CAPTCHA, then press Enter to capture each page.\n`);

const browser = await chromium.launch({ headless: HEADLESS });
const ctx = await browser.newContext({
  viewport: { width: 1366, height: 900 },
  locale: 'en-US',
  // Default Playwright Chromium UA is fine on a residential IP; don't fake it.
});

const results = [];
for (const t of targets) {
  const page = await ctx.newPage();
  const rec = { slug: t.slug, name: t.name, category: t.category, requestedUrl: t.url, find: !!t.find };
  try {
    const resp = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    rec.status = resp ? resp.status() : null;
    await page.waitForTimeout(DWELL);
    if (!AUTO) {
      console.log(`\n[${t.slug}] ${t.name}${t.find ? '  (URL drifted — confirm the current opt-out URL)' : ''}`);
      await ask('  → solve any challenge in the browser, then press Enter to capture… ');
    }
    rec.finalUrl = page.url();
    rec.title = await page.title().catch(() => '');
    const text = await page.evaluate(() => document.body?.innerText || '');
    rec.text = text.replace(/\n{3,}/g, '\n\n').slice(0, 8000);
    rec.wallDetected = WALL_RE.test(`${rec.title}\n${text}`);
    const shot = join(OUT_DIR, `${t.slug}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    rec.screenshot = shot;
    console.log(`  captured: status=${rec.status} wall=${rec.wallDetected} → ${shot}`);
  } catch (e) {
    rec.error = e.message.split('\n')[0];
    console.log(`  [${t.slug}] ERROR ${rec.error}`);
  } finally {
    await page.close();
    results.push(rec);
    // Write incrementally so a crash/abort still leaves what you captured.
    writeFileSync(join(OUT_DIR, 'captures.json'), JSON.stringify(results, null, 2));
  }
}

rl?.close();
await browser.close();

const ok = results.filter((r) => !r.error && !r.wallDetected).length;
const walled = results.filter((r) => r.wallDetected).length;
const errored = results.filter((r) => r.error).length;
console.log(`\nDone. clean=${ok}  wall=${walled}  error=${errored}`);
console.log(`Review ./${OUT_DIR}/*.png, then send ./${OUT_DIR}/captures.json back to turn into broker JSON.`);
console.log(`(Walled/errored pages: re-run with --only=slug1,slug2 or open them by hand.)\n`);
