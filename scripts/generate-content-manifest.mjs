#!/usr/bin/env node
// Generates the per-locale content manifests (lib/content/generated/{en,es}.ts)
// from the JSON under content/**. The static export can't read the filesystem at
// runtime, so the merged data is a committed artifact — adding or translating
// content is just dropping a JSON file and re-running this.
//
// Localization model (scope: locale ≠ jurisdiction):
//   • BASE files (spokeo.json) carry the full record, authored in the language
//     named by their optional `baseLocale` (default 'en').
//   • OVERLAY files (spokeo.es.json) sit next to the base and carry ONLY the
//     translatable prose fields for that locale; structural/factual fields
//     (urls, methods, jurisdiction, dates) live only in the base, so a
//     translation can never drift structurally.
//   • For each locale this script merges base+overlay. A base with no overlay
//     for the target locale keeps its original language and gains
//     `untranslated: true`, which the UI surfaces honestly.
//
// Merge semantics: objects merge recursively; arrays of objects merge by `key`
// when the base items carry one, else by index (so a law's specialMechanisms
// overlay carries key + title/summary/status); arrays of strings (steps,
// instructions) replace wholesale; scalars replace.
//
// Run:   npm run generate:content
// CI:    regenerates and fails if the committed manifests are stale (drift
//        guard), so a forgotten regen can never ship content the app doesn't load.

import { readdirSync, statSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES = ['en', 'es'];
const OUT_DIR = 'lib/content/generated';

// Collection -> { dir, TS export name, TS type }.
const COLLECTIONS = [
  { dir: 'content/brokers', name: 'BROKERS', type: 'Broker' },
  { dir: 'content/law', name: 'LAWS', type: 'Law' },
  { dir: 'content/platforms', name: 'PLATFORMS', type: 'Platform' },
  { dir: 'content/records', name: 'RECORDS', type: 'DeadnameRecord' },
  { dir: 'content/discovery', name: 'DISCOVERY_STEPS', type: 'DiscoveryStep' },
  { dir: 'content/queries', name: 'QUERY_TEMPLATES', type: 'QueryTemplate' },
  { dir: 'content/templates', name: 'OPTOUT_TEMPLATES', type: 'OptOutTemplate' },
];

const OVERLAY_RE = /\.([a-z]{2})\.json$/;

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith('.json')) acc.push(p);
  }
  return acc;
}

const loadJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Deep merge an overlay onto a base (see header for the array semantics). */
function mergeOverlay(base, overlay) {
  if (Array.isArray(base) && Array.isArray(overlay)) {
    if (base.every(isPlainObject) && overlay.every(isPlainObject)) {
      // Array of objects: merge item-by-item; the base's length and order win.
      // Keyed items pair by `key` — inserting or reordering base items must
      // never silently shift a translation onto the wrong item (the validator
      // requires overlay keys wherever the base has them).
      return base.map((item, i) => {
        const o =
          typeof item.key === 'string' ? overlay.find((x) => x.key === item.key) : overlay[i];
        return o ? mergeOverlay(item, o) : item;
      });
    }
    return overlay; // array of strings (steps etc.): translated wholesale
  }
  if (isPlainObject(base) && isPlainObject(overlay)) {
    const out = { ...base };
    for (const [k, v] of Object.entries(overlay)) {
      out[k] = k in base ? mergeOverlay(base[k], v) : v;
    }
    return out;
  }
  return overlay;
}

/** Resolve one base file for one locale (merged overlay, or flagged untranslated). */
function localize(basePath, base, locale, overlaysByPath) {
  const baseLocale = base.baseLocale ?? 'en';
  if (baseLocale === locale) return base;
  const overlayPath = basePath.replace(/\.json$/, `.${locale}.json`);
  const overlay = overlaysByPath.get(overlayPath);
  if (overlay) return mergeOverlay(base, overlay);
  return { ...base, untranslated: true };
}

// Deterministic order (by path) so the generated files are stable across
// machines and the CI drift check is meaningful.
const results = new Map(LOCALES.map((l) => [l, []]));
const counts = { base: 0, overlays: 0 };

for (const { dir, name, type } of COLLECTIONS) {
  const files = walk(dir).sort();
  const basePaths = files.filter((f) => !OVERLAY_RE.test(f));
  const overlaysByPath = new Map(files.filter((f) => OVERLAY_RE.test(f)).map((f) => [f, loadJson(f)]));
  counts.base += basePaths.length;
  counts.overlays += overlaysByPath.size;

  for (const locale of LOCALES) {
    const items = basePaths.map((p) => localize(p, loadJson(p), locale, overlaysByPath));
    results.get(locale).push({ name, type, items });
  }
}

mkdirSync(OUT_DIR, { recursive: true });
let changed = 0;
for (const locale of LOCALES) {
  const collections = results.get(locale);
  const lines = [
    '// AUTO-GENERATED by scripts/generate-content-manifest.mjs — do not edit by hand.',
    '// Run `npm run generate:content` after adding, removing, or translating a',
    '// content JSON file. Source of truth: content/**/*.json (+ *.<locale>.json overlays).',
    '',
    "import { Broker, DeadnameRecord, DiscoveryStep, Law, OptOutTemplate, Platform, QueryTemplate } from '../types';",
    '',
    '// Cast at the single chokepoint: the CI content validator (lib/content/validate.mjs)',
    '// is the real schema gate; data-integrity unit tests assert the safety invariants.',
  ];
  for (const { name, type, items } of collections) {
    lines.push(`export const ${name} = ${JSON.stringify(items, null, 2)} as unknown as ${type}[];`);
    lines.push('');
  }
  const outPath = join(OUT_DIR, `${locale}.ts`);
  const next = lines.join('\n');
  const prev = existsSync(outPath) ? readFileSync(outPath, 'utf8') : null;
  if (prev !== next) {
    writeFileSync(outPath, next);
    changed++;
  }
}

console.log(
  `[manifest] ${counts.base} base file(s), ${counts.overlays} overlay(s) → ${LOCALES.length} locale manifest(s)` +
    (changed ? ` (${changed} rewritten).` : ' (up to date).'),
);
