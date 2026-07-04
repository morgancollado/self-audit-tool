// Run: node lib/storage/locale-hint.test.ts   (Node >=22.18 strips types natively)
//
// The '/' chooser's synchronous locale peek, including the panic invariant:
// wiping storage (LocalStorageBackend.clear, what wipeAll runs on the prefs
// backend) must also erase the stored locale hint — a surviving 'es' would be
// a trace the panic wipe promised to remove, and the chooser must fall back
// to the browser language.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Static imports are safe here: none of these touch localStorage at module
// load — only inside calls, by which time the shim below is installed.
import { LocalStorageBackend } from './local.ts';
import { PREFS_KEY } from './manager.ts';
import { storedLocaleHint } from './locale-hint.ts';

// Minimal localStorage shim so the real backend + hint run under node:test.
function localStorageShim() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

beforeEach(() => {
  (globalThis as any).localStorage = localStorageShim();
});

test('reads the locale the persistent-prefs backend wrote', async () => {
  const prefs = new LocalStorageBackend();
  await prefs.set(PREFS_KEY, { safetyIntroAcknowledged: true, locale: 'es' });
  assert.equal(storedLocaleHint(), 'es');
});

test('PANIC INVARIANT: wiping the prefs backend erases the locale hint', async () => {
  const prefs = new LocalStorageBackend();
  await prefs.set(PREFS_KEY, { locale: 'es' });
  assert.equal(storedLocaleHint(), 'es');

  await prefs.clear(); // what wipeAll() runs on the persistent prefs backend

  assert.equal(storedLocaleHint(), undefined, 'a stored locale surviving the panic wipe is a trace');
});

test('absent, non-string, or corrupt prefs read as no hint (never throw)', async () => {
  assert.equal(storedLocaleHint(), undefined);

  const prefs = new LocalStorageBackend();
  await prefs.set(PREFS_KEY, { locale: 42 });
  assert.equal(storedLocaleHint(), undefined);

  localStorage.setItem('errata:' + PREFS_KEY, 'not-json{');
  assert.equal(storedLocaleHint(), undefined);
});
