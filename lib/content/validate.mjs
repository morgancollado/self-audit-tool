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
  const slugs = new Set(
    [...(byType['broker.schema.json'] ?? []), ...(byType['platform.schema.json'] ?? [])].map((d) => d.data.slug),
  );
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
  for (const file of files) {
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

    if (errors.length) {
      failed++;
      console.error(`\n[content] FAIL ${file} (${basename(type)})`);
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
  console.log(`[content] OK — ${files.length} content file(s) valid.`);
}

main();
