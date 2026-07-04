#!/usr/bin/env node
// Content validation gate (CI). Validates every JSON file under /content/**
// (excluding /content/schema) against its type schema, and enforces the
// no-dead-end rule and a few cross-field invariants the JSON Schema can't.
//
// Usage: node lib/content/validate.mjs   (exits non-zero on any failure)

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const SCHEMA_DIR = 'content/schema';
const CONTENT_DIR = 'content';

// Map content subdirectory -> schema file.
const TYPE_BY_DIR = {
  brokers: 'broker.schema.json',
  platforms: 'platform.schema.json',
  law: 'law.schema.json',
  records: 'record.schema.json',
  templates: 'template.schema.json',
  discovery: 'discovery-step.schema.json',
  queries: 'query-template.schema.json',
};

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

// Translation overlays: <base>.<locale>.json next to the base file, carrying
// ONLY translatable prose. Structural/factual fields (urls, methods,
// jurisdiction, dates, flags) may never appear in an overlay — that's what
// keeps a translation from silently shadowing a base-file correction.
const OVERLAY_RE = /\.([a-z]{2})\.json$/;
const OVERLAY_LOCALES = new Set(['en', 'es']);

// Per type: which fields an overlay may carry. `true` = translatable leaf
// (string or array of strings); nested object = recurse; for arrays of objects
// the node describes each item's allowed keys. When the base items carry a
// `key`, overlay items must carry it too and are paired by key (never by
// position — a base insertion must not silently shift every translation);
// keyless arrays must match the base's length exactly.
const TRANSLATABLE = {
  'broker.schema.json': { notes: true, optOut: { leaveItGuidance: true, steps: true }, network: { note: true } },
  'law.schema.json': {
    title: true,
    summary: true,
    disclaimer: true,
    specialMechanisms: { title: true, summary: true, status: true },
  },
  'platform.schema.json': {
    deadnameRemoval: { tool: true, steps: true, limits: true, escalation: true },
    hardening: { steps: true },
  },
  'record.schema.json': { whatItIs: true, actions: true, harmReduction: true, disclaimer: true },
  'discovery-step.schema.json': { title: true, why: true, instructions: true, deadnamePrompts: true },
  'query-template.schema.json': { label: true, notes: true },
  'template.schema.json': { subject: true, body: true, disclaimer: true },
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStringy = (v) => typeof v === 'string' || (Array.isArray(v) && v.every((x) => typeof x === 'string'));

function checkOverlayKeys(node, allowed, base, path, errors) {
  if (!isPlainObject(node)) {
    errors.push(`overlay: '${path || '/'}' must be an object of translatable fields.`);
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    const p = path ? `${path}.${k}` : k;
    const rule = allowed?.[k];
    const baseValue = isPlainObject(base) ? base[k] : undefined;
    if (!rule) {
      errors.push(`overlay: '${p}' is not a translatable field (structural fields live only in the base file).`);
    } else if (rule === true) {
      if (!isStringy(v)) errors.push(`overlay: '${p}' must be a string or array of strings.`);
    } else if (Array.isArray(v)) {
      // Array of objects (e.g. specialMechanisms). Alignment is the danger
      // here: pairing a translation with the WRONG base item ships prose about
      // a different mechanism. Keyed base arrays pair by key; keyless ones
      // must match the base 1:1.
      const baseItems = Array.isArray(baseValue) ? baseValue : [];
      const baseKeys = baseItems.map((b) => (isPlainObject(b) ? b.key : undefined));
      if (baseKeys.length > 0 && baseKeys.every((bk) => typeof bk === 'string')) {
        const seen = new Set();
        v.forEach((item, i) => {
          const ip = `${p}[${i}]`;
          if (!isPlainObject(item)) {
            errors.push(`overlay: '${ip}' must be an object of translatable fields.`);
            return;
          }
          const { key, ...rest } = item;
          if (typeof key !== 'string') {
            errors.push(`overlay: '${ip}' must carry the base item's 'key' (translations pair by key, not position).`);
          } else if (!baseKeys.includes(key)) {
            errors.push(`overlay: '${ip}' names key '${key}', which no base item has.`);
          } else if (seen.has(key)) {
            errors.push(`overlay: '${p}' translates key '${key}' twice.`);
          } else {
            seen.add(key);
          }
          const baseItem = baseItems.find((b) => isPlainObject(b) && b.key === key);
          checkOverlayKeys(rest, rule, baseItem, ip, errors);
        });
      } else {
        if (v.length !== baseItems.length) {
          errors.push(
            `overlay: '${p}' has ${v.length} item(s) but the base has ${baseItems.length} — keyless arrays must align 1:1.`,
          );
        }
        v.forEach((item, i) => checkOverlayKeys(item, rule, baseItems[i], `${p}[${i}]`, errors));
      }
    } else {
      checkOverlayKeys(v, rule, baseValue, p, errors);
    }
  }
}

function overlayChecks(file, data, type, baseByPath, errors) {
  const locale = file.match(OVERLAY_RE)[1];
  if (!OVERLAY_LOCALES.has(locale)) {
    errors.push(`overlay: unknown locale '${locale}'.`);
  }
  const basePath = file.replace(OVERLAY_RE, '.json');
  const base = baseByPath.get(basePath);
  if (!base) {
    errors.push(`overlay: no base file '${basePath}' — an orphan translation can never load.`);
    return;
  }
  if ((base.baseLocale ?? 'en') === locale) {
    errors.push(`overlay: base file is already authored in '${locale}' (baseLocale) — this overlay would never apply.`);
  }
  checkOverlayKeys(data, TRANSLATABLE[type], base, '', errors);
  // A translated opt-out letter must keep the base's placeholder contract.
  if (type === 'template.schema.json') {
    const text = `${data.subject ?? ''}\n${data.body ?? ''}`;
    const used = new Set([...text.matchAll(PLACEHOLDER_RE)].map((m) => m[1]));
    const declared = new Set(base.placeholders ?? []);
    for (const u of used) {
      if (!declared.has(u)) errors.push(`overlay: uses {{${u}}} not declared in the base template.`);
    }
  }
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function setupAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  for (const file of readdirSync(SCHEMA_DIR)) {
    if (file.endsWith('.json')) ajv.addSchema(loadJson(join(SCHEMA_DIR, file)));
  }
  return ajv;
}

function walkJson(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walkJson(p, acc);
    else if (p.endsWith('.json')) acc.push(p);
  }
  return acc;
}

function typeForPath(path) {
  const parts = path.split('/');
  const idx = parts.indexOf(CONTENT_DIR);
  const sub = parts[idx + 1];
  return TYPE_BY_DIR[sub];
}

// Cross-field invariants beyond JSON Schema.
function extraChecks(type, data, errors) {
  if (type === 'law.schema.json') {
    // A region-specific right must declare its region.
    if (data.appliesNationally === false && !data.jurisdiction?.region) {
      errors.push('law: appliesNationally=false requires jurisdiction.region (which state grants it).');
    }
  }
  if (type === 'broker.schema.json') {
    // If a method is web-form/email/mail, the matching contact field should exist.
    const m = data.optOut?.methods ?? [];
    if (m.includes('web-form') && !data.optOut?.webFormUrl) {
      errors.push('broker: method web-form requires optOut.webFormUrl.');
    }
    if (m.includes('email') && !data.optOut?.email) {
      errors.push('broker: method email requires optOut.email.');
    }
    if (m.includes('mail') && !data.optOut?.mailingAddress) {
      errors.push('broker: method mail requires optOut.mailingAddress.');
    }
    // R13 no-dead-end for the opt-out paradox: if opting out itself exposes the
    // current<->former linkage, the broker MUST carry "leave it" guidance, so the
    // UI can surface the leave-it outcome as a real choice rather than a blind
    // submit (scope/docs/06-risk-register.md R13).
    if (data.optOut?.optOutExposesLinkage === true && !data.optOut?.leaveItGuidance?.trim()) {
      errors.push('broker: optOutExposesLinkage=true requires optOut.leaveItGuidance (R13: offer the leave-it choice).');
    }
  }
  if (type === 'platform.schema.json') {
    // No-dead-end: a deadname-removal block must carry at least one step, even
    // when the platform can't change the thing directly (offer what still helps).
    if (data.deadnameRemoval && !(data.deadnameRemoval.steps?.length > 0)) {
      errors.push('platform: deadnameRemoval requires at least one step (no dead-end).');
    }
  }
  if (type === 'record.schema.json') {
    if (data.monitorOnly === true && data.actions?.length) {
      errors.push('record: monitorOnly items should not also list actions (pick one).');
    }
  }
  if (type === 'query-template.schema.json') {
    const used = new Set([...String(data.template).matchAll(PLACEHOLDER_RE)].map((m) => m[1]));
    const declared = new Set(data.placeholders ?? []);
    for (const u of used) {
      if (!declared.has(u)) errors.push(`query-template: template uses {{${u}}} not listed in placeholders.`);
    }
    for (const d of declared) {
      if (!used.has(d)) errors.push(`query-template: placeholder '${d}' declared but not used in template.`);
    }
  }
  if (type === 'template.schema.json') {
    // Opt-out template: every {{placeholder}} in subject/body must be declared,
    // and every declared placeholder must be used somewhere (no dead config).
    const text = `${data.subject ?? ''}\n${data.body ?? ''}`;
    const used = new Set([...text.matchAll(PLACEHOLDER_RE)].map((m) => m[1]));
    const declared = new Set(data.placeholders ?? []);
    for (const u of used) {
      if (!declared.has(u)) errors.push(`template: uses {{${u}}} not listed in placeholders.`);
    }
    for (const d of declared) {
      if (!used.has(d)) errors.push(`template: placeholder '${d}' declared but not used in subject/body.`);
    }
  }
}

// Cross-file reference integrity: discovery steps must point at content that exists.
function crossRefChecks(byType) {
  const errors = [];
  const queryKeys = new Set((byType['query-template.schema.json'] ?? []).map((d) => d.data.key));
  const templateKeys = new Set((byType['template.schema.json'] ?? []).map((d) => d.data.key));
  // Brokers and platforms share one slug namespace (discovery refIds and the
  // remediation tracker key on it), so a collision would silently shadow an entry
  // or mis-route a remediation. Enforce uniqueness across the combined set.
  const slugEntries = [
    ...(byType['broker.schema.json'] ?? []),
    ...(byType['platform.schema.json'] ?? []),
  ];
  const seenSlug = new Map();
  for (const { file, data } of slugEntries) {
    if (seenSlug.has(data.slug)) {
      errors.push(`${file}: duplicate slug '${data.slug}' (also in ${seenSlug.get(data.slug)}).`);
    } else {
      seenSlug.set(data.slug, file);
    }
  }
  const slugs = new Set(slugEntries.map((d) => d.data.slug));
  for (const { file, data } of byType['discovery-step.schema.json'] ?? []) {
    for (const k of data.queryTemplateKeys ?? []) {
      if (!queryKeys.has(k)) errors.push(`${file}: queryTemplateKeys references unknown query '${k}'.`);
    }
    for (const r of data.refIds ?? []) {
      if (!slugs.has(r)) errors.push(`${file}: refIds references unknown broker/platform '${r}'.`);
    }
  }
  // A broker that names an opt-out template must point at one that exists, or the
  // remediation generator silently has nothing to render (a dead-end).
  for (const { file, data } of byType['broker.schema.json'] ?? []) {
    const k = data.optOut?.templateKey;
    if (k && !templateKeys.has(k)) {
      errors.push(`${file}: optOut.templateKey references unknown template '${k}'.`);
    }
  }
  // Network grouping consistency: one key must mean one display name and one
  // coverage level everywhere (a divergent name would render as two different
  // "networks" for one backbone; divergent coverage would make the tracking
  // semantics depend on which member happened to be read first), a single-member
  // network is a mislabel — drop the field instead — and exactly one member must
  // be the representative so the shared request's route is an explicit choice,
  // not an accident of slug ordering.
  const netNames = new Map();
  const netCounts = new Map();
  const netReps = new Map();
  for (const { file, data } of byType['broker.schema.json'] ?? []) {
    const net = data.network;
    if (!net) continue;
    netCounts.set(net.key, (netCounts.get(net.key) ?? 0) + 1);
    if (net.representative) netReps.set(net.key, (netReps.get(net.key) ?? 0) + 1);
    const seen = netNames.get(net.key);
    if (seen && seen.name !== net.name) {
      errors.push(`${file}: network '${net.key}' has name '${net.name}' but ${seen.file} calls it '${seen.name}'.`);
    } else if (seen && seen.coverage !== net.coverage) {
      errors.push(`${file}: network '${net.key}' has coverage '${net.coverage}' but ${seen.file} says '${seen.coverage}'.`);
    } else if (!seen) {
      netNames.set(net.key, { name: net.name, coverage: net.coverage, file });
    }
  }
  for (const [key, count] of netCounts) {
    if (count < 2) {
      errors.push(`network '${key}' has only ${count} member — a one-broker network is a mislabel (remove the field).`);
    }
    const reps = netReps.get(key) ?? 0;
    if (reps !== 1) {
      errors.push(`network '${key}' has ${reps} representative member(s) — exactly one must carry "representative": true.`);
    }
  }
  return errors;
}

function main() {
  const ajv = setupAjv();
  const files = walkJson(CONTENT_DIR).filter((p) => !p.includes(`${CONTENT_DIR}/schema/`));
  if (files.length === 0) {
    console.log('[content] No content files yet — schemas in place, nothing to validate.');
    return;
  }

  let failed = 0;
  const byType = {};
  const baseFiles = files.filter((f) => !OVERLAY_RE.test(f));
  const overlayFiles = files.filter((f) => OVERLAY_RE.test(f));
  const baseByPath = new Map();

  for (const file of baseFiles) {
    const type = typeForPath(file);
    if (!type) {
      console.error(`[content] ${file}: cannot determine type from path (expected under content/{brokers,platforms,law,records,templates,discovery,queries}/).`);
      failed++;
      continue;
    }
    const schemaId = `https://errata.tools/schema/${type}`;
    const validate = ajv.getSchema(schemaId);
    const data = loadJson(file);
    const errors = [];
    if (!validate(data)) {
      for (const e of validate.errors) errors.push(`${e.instancePath || '/'} ${e.message}`);
    }
    extraChecks(type, data, errors);
    (byType[type] ??= []).push({ file, data });
    baseByPath.set(file, data);

    if (errors.length) {
      failed++;
      console.error(`\n[content] FAIL ${file} (${basename(type)})`);
      for (const msg of errors) console.error(`    • ${msg}`);
    }
  }

  // Translation overlays: validated against the translatable-field whitelist,
  // never the full schema (they are partial by design).
  for (const file of overlayFiles) {
    const type = typeForPath(file);
    const errors = [];
    if (!type) {
      errors.push('cannot determine type from path.');
    } else {
      overlayChecks(file, loadJson(file), type, baseByPath, errors);
    }
    if (errors.length) {
      failed++;
      console.error(`\n[content] FAIL ${file} (translation overlay)`);
      for (const msg of errors) console.error(`    • ${msg}`);
    }
  }

  for (const msg of crossRefChecks(byType)) {
    failed++;
    console.error(`[content] FAIL cross-reference: ${msg}`);
  }

  if (failed) {
    console.error(`\n[content] ${failed} file(s) failed validation.`);
    process.exit(1);
  }
  console.log(
    `[content] OK — ${baseFiles.length} content file(s) + ${overlayFiles.length} translation overlay(s) valid.`,
  );
}

main();
