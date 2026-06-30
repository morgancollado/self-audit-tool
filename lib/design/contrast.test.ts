// Run: npx tsx --test lib/design/contrast.test.ts
//
// The contrast GATE. axe's color-contrast rule was excluded from the browser
// smoke test (it can only see what a given render happens to paint, and the
// design owns its palette directly), so contrast was un-gated — a token edit
// could quietly drop the UI below AA for users reading this in distress, on a
// phone, in bright light. This pins the actual design tokens: it parses
// app/globals.css and asserts every foreground/background pair the UI uses
// clears WCAG 2.1 AA (4.5:1) in BOTH the light and dark themes. Deterministic,
// no browser, so it runs in `npm test` and fails the build on a regression.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../app/globals.css'), 'utf8');

const AA_NORMAL = 4.5;

/** Pull the `--name: #hex;` declarations out of a CSS block. */
function parseTokens(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    out[name] = value;
  }
  return out;
}

/** First `:root { … }` is the light theme; the one inside the dark media query overrides it. */
function themes(css: string): { light: Record<string, string>; dark: Record<string, string> } {
  const firstRoot = css.match(/:root\s*\{([^}]*)\}/);
  assert.ok(firstRoot, 'could not find the :root token block');
  const light = parseTokens(firstRoot[1]);

  const darkIdx = css.indexOf('prefers-color-scheme: dark');
  assert.ok(darkIdx >= 0, 'could not find the dark-theme media query');
  const darkRoot = css.slice(darkIdx).match(/:root\s*\{([^}]*)\}/);
  assert.ok(darkRoot, 'could not find the dark :root token block');
  const dark = { ...light, ...parseTokens(darkRoot[1]) };

  return { light, dark };
}

function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const chan = (h: string) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = chan(n.slice(0, 2));
  const g = chan(n.slice(2, 4));
  const b = chan(n.slice(4, 6));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// [label, foreground token, background token] — every text-on-surface pairing the
// UI actually paints (see app/globals.css). Each is checked in both themes.
const PAIRS: [string, string, string][] = [
  ['body text', 'ink', 'paper'],
  ['text on card', 'ink', 'cream'],
  ['muted text on page', 'slate', 'paper'],
  ['muted text on card', 'slate', 'cream'],
  ['link on page', 'marker', 'paper'],
  ['link on card', 'marker', 'cream'],
  ['text on a marker fill (buttons, badges, playbook nums)', 'on-marker', 'marker'],
  ['inverse badge text (deadname/confirmed)', 'paper', 'ink'],
  ['text on a proof fill (panic, high-priority, blocked)', 'paper', 'proof'],
  ['warn text on page', 'proof', 'paper'],
  ['warn text on card', 'proof', 'cream'],
];

for (const [themeName, palette] of Object.entries(themes(CSS))) {
  for (const [label, fg, bg] of PAIRS) {
    test(`${themeName}: ${label} clears WCAG AA`, () => {
      assert.ok(palette[fg], `token --${fg} is missing`);
      assert.ok(palette[bg], `token --${bg} is missing`);
      const ratio = contrast(palette[fg], palette[bg]);
      assert.ok(
        ratio >= AA_NORMAL,
        `${label} (${themeName}): --${fg} ${palette[fg]} on --${bg} ${palette[bg]} = ${ratio.toFixed(2)}:1, below AA ${AA_NORMAL}:1`,
      );
    });
  }
}
