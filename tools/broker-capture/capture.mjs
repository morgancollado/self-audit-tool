#!/usr/bin/env node
// Local broker opt-out capture aid (maintainer tool — runs on YOUR machine, not
// CI, not the app). Opens each target broker's opt-out page in a REAL browser on
// your residential connection — the thing the build sandbox can't do (its egress
// proxy blocks Chromium, and broker WAFs 403 datacenter/headless clients). For
// each page it captures the final URL, the visible text, the form fields, and a
// full-page screenshot, then writes ./broker-captures/captures.json (+ a compact
// captures.summary.txt that's easy to paste back).
//
// You read the screenshots/text and make the SAFETY-CRITICAL judgment calls this
// tool can't (does opting out expose the current<->former linkage? is ID
// required?). Send captures.json back and it becomes validated broker JSON.
//
// Usage (from repo root, after `npx playwright install chromium`):
//   node tools/broker-capture/capture.mjs            # headed; solve challenges,
//                                                    # press Enter to capture each
//   node tools/broker-capture/capture.mjs --auto --dwell=6000   # unattended
//   node tools/broker-capture/capture.mjs --only=radaris,mylife # subset
//
// Flags:
//   --auto         don't prompt; just dwell --dwell ms then capture
//   --dwell=MS     wait MS after load before capturing (default 4000)
//   --headless     run headless (you won't be able to solve CAPTCHAs)
//   --only=a,b,c   capture only these slugs
//
// v2: re-prompts when a page is still behind a challenge (solve → Enter to retry,
// or 's' to skip); retries DNS/nav failures once and falls back to the site root;
// dedupes shared portals (the whole PeopleConnect family funnels to one
// suppression page); records form fields; writes a pasteable summary.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import readline from 'node:readline';

// The remaining depth-first target set (see scope/docs/14-broker-coverage-runbook.md).
// `find: true` = opt-out URL had drifted; confirm the current one in the browser.
// `portal` groups brands that share one opt-out flow (capture once).
const TARGETS = [
  { slug: 'intelius',         name: 'Intelius',          category: 'people-search',    url: 'https://www.intelius.com/opt-out/',        portal: 'peopleconnect' },
  { slug: 'truthfinder',      name: 'TruthFinder',       category: 'background-check', url: 'https://www.truthfinder.com/opt-out/',     portal: 'peopleconnect' },
  { slug: 'instantcheckmate', name: 'Instant Checkmate', category: 'background-check', url: 'https://www.instantcheckmate.com/opt-out/',portal: 'peopleconnect' },
  { slug: 'ussearch',         name: 'US Search',         category: 'people-search',    url: 'https://www.ussearch.com/opt-out/',        portal: 'peopleconnect' },
  { slug: 'peoplesmart',      name: 'PeopleSmart',       category: 'people-search',    url: 'https://www.peoplesmart.com/',             portal: 'peopleconnect', find: true },
  { slug: 'zabasearch',       name: 'ZabaSearch',        category: 'people-search',    url: 'https://www.intelius.com/opt-out/',        portal: 'peopleconnect', find: true, note: 'PeopleConnect brand; opt out via the shared suppression portal.' },
  { slug: 'addresses',        name: 'Addresses.com',     category: 'people-search',    url: 'https://www.intelius.com/opt-out/',        portal: 'peopleconnect', find: true, note: 'PeopleConnect brand; opt out via the shared suppression portal.' },
  { slug: 'anywho',           name: 'AnyWho',            category: 'people-search',    url: 'https://www.anywho.com/optout' },
  // BeenVerified family shares the /svc/optout/search/optouts opt-out path.
  { slug: 'peoplelooker',     name: 'PeopleLooker',      category: 'background-check', url: 'https://www.peoplelooker.com/svc/optout/search/optouts', find: true },
  { slug: 'radaris',          name: 'Radaris',           category: 'people-search',    url: 'https://radaris.com/control/privacy' },
  { slug: 'mylife',           name: 'MyLife',            category: 'people-search',    url: 'https://www.mylife.com/ccpa', find: true, note: 'Removal historically requires emailing/calling; confirm current route.' },
  { slug: 'peekyou',          name: 'PeekYou',           category: 'people-search',    url: 'https://www.peekyou.com/about/optout', find: true },
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

const WALL_RE = /captcha|cloudflare|are you human|verify you are|attention required|just a moment|enable javascript|ray id|access denied|unusual traffic|press ?& ?hold|checking your browser/i;
const DNS_RE = /ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ERR_TIMED_OUT|net::ERR/i;

const OUT_DIR = 'broker-captures';
mkdirSync(OUT_DIR, { recursive: true });

const rl = AUTO ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => (rl ? rl.question(q, res) : res('')));

const origin = (u) => { try { return new URL(u).origin + '/'; } catch { return u; } };

async function snapshot(page) {
  const title = await page.title().catch(() => '');
  const text = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
  // Form fields are the clearest signal of what the opt-out actually asks for.
  const fields = await page.evaluate(() => {
    const lbl = (el) => (el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || el.value || el.textContent || '').trim().slice(0, 60);
    const out = [];
    for (const el of document.querySelectorAll('input,select,textarea,button,[role=button]')) {
      const t = el.tagName.toLowerCase() + (el.type ? `:${el.type}` : '');
      const l = lbl(el);
      if (l && !/^\s*$/.test(l)) out.push(`${t} ${l}`);
    }
    return [...new Set(out)].slice(0, 25);
  }).catch(() => []);
  return { title, text, fields };
}

async function navigate(page, t) {
  // Try the URL, then the site root on a network failure (drifted/blocked path).
  for (const url of [t.url, origin(t.url)]) {
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      return { status: resp ? resp.status() : null, navError: null };
    } catch (e) {
      const msg = e.message.split('\n')[0];
      if (!DNS_RE.test(msg) || url !== t.url) return { status: null, navError: msg };
      // else: fall through and retry at the site root
    }
  }
  return { status: null, navError: 'navigation failed' };
}

const targets = ONLY.length ? TARGETS.filter((t) => ONLY.includes(t.slug)) : TARGETS;

console.log(`\nBroker opt-out capture v2 — ${targets.length} target(s). Output → ./${OUT_DIR}/`);
console.log(AUTO ? `Unattended (${DWELL}ms dwell).` : `Headed: solve any challenge, then press Enter to capture. If a page is still walled, you'll be asked to solve+retry or skip.\n`);

const browser = await chromium.launch({ headless: HEADLESS });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'en-US' });

const results = [];
const portalSeen = new Map(); // portal key -> slug already captured
for (const t of targets) {
  const rec = { slug: t.slug, name: t.name, category: t.category, requestedUrl: t.url, find: !!t.find, note: t.note };
  const page = await ctx.newPage();
  try {
    const { status, navError } = await navigate(page, t);
    rec.status = status;
    if (navError) {
      rec.error = navError;
      console.log(`  [${t.slug}] ERROR ${navError}${DNS_RE.test(navError) ? '  (privacy DNS may be blocking this domain — try normal DNS)' : ''}`);
      continue;
    }
    await page.waitForTimeout(DWELL);

    // Solve-and-retry loop for challenge pages (headed only).
    let snap = await snapshot(page);
    let walled = WALL_RE.test(`${snap.title}\n${snap.text}`);
    if (!AUTO) {
      const fam = t.portal ? `  [shared ${t.portal} portal]` : '';
      console.log(`\n[${t.slug}] ${t.name}${t.find ? '  (confirm current opt-out URL)' : ''}${fam}`);
      while (true) {
        const hint = walled ? 'STILL LOOKS WALLED — solve the challenge, then Enter to retry (or "s" to skip): ' : 'solve any challenge, then Enter to capture (or "s" to skip): ';
        const ans = (await ask(`  → ${hint}`)).trim().toLowerCase();
        if (ans === 's') { rec.skipped = true; break; }
        snap = await snapshot(page);
        walled = WALL_RE.test(`${snap.title}\n${snap.text}`);
        if (!walled) break;
      }
    }
    if (rec.skipped) { console.log('  skipped.'); continue; }

    rec.finalUrl = page.url();
    rec.title = snap.title;
    rec.fields = snap.fields;
    rec.text = snap.text.replace(/\n{3,}/g, '\n\n').slice(0, 8000);
    rec.wallDetected = walled;

    // Dedupe shared portals: note it instead of treating as a distinct flow.
    if (t.portal) {
      const key = `${t.portal}|${origin(rec.finalUrl)}`;
      if (portalSeen.has(key)) rec.sharesPortalWith = portalSeen.get(key);
      else portalSeen.set(key, t.slug);
    }

    const shot = join(OUT_DIR, `${t.slug}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    rec.screenshot = shot;
    console.log(`  captured: status=${rec.status} wall=${rec.wallDetected} finalUrl=${rec.finalUrl}${rec.sharesPortalWith ? ` (same portal as ${rec.sharesPortalWith})` : ''}`);
  } catch (e) {
    rec.error = e.message.split('\n')[0];
    console.log(`  [${t.slug}] ERROR ${rec.error}`);
  } finally {
    await page.close();
    results.push(rec);
    writeFileSync(join(OUT_DIR, 'captures.json'), JSON.stringify(results, null, 2));
    // Compact, pasteable summary.
    const summary = results.map((r) =>
      `## ${r.slug} (${r.name})\n` +
      `status=${r.status ?? '-'} wall=${r.wallDetected ?? '-'}${r.skipped ? ' SKIPPED' : ''}${r.error ? ` ERROR=${r.error}` : ''}${r.sharesPortalWith ? ` sharesPortalWith=${r.sharesPortalWith}` : ''}\n` +
      `finalUrl: ${r.finalUrl ?? '-'}\n` +
      (r.fields?.length ? `fields: ${r.fields.join(' | ')}\n` : '') +
      (r.text ? `text: ${r.text.slice(0, 600).replace(/\n/g, ' ')}\n` : '')
    ).join('\n');
    writeFileSync(join(OUT_DIR, 'captures.summary.txt'), summary);
  }
}

rl?.close();
await browser.close();

const ok = results.filter((r) => r.finalUrl && !r.wallDetected && !r.skipped).length;
const walled = results.filter((r) => r.wallDetected).length;
const errored = results.filter((r) => r.error).length;
const skipped = results.filter((r) => r.skipped).length;
console.log(`\nDone. usable=${ok}  wall=${walled}  error=${errored}  skipped=${skipped}`);
console.log(`Send ./${OUT_DIR}/captures.json (or paste captures.summary.txt) back to turn into broker JSON.`);
console.log(`Re-run gaps: node tools/broker-capture/capture.mjs --only=slug1,slug2\n`);
