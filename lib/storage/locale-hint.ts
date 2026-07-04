// Synchronous peek at the stored UI-locale preference, for the bare '/'
// language chooser (app/(root)/page.tsx) which runs OUTSIDE the storage shell —
// there is no StorageProvider on that route, and a redirect shouldn't wait on
// IndexedDB anyway. Reads the same localStorage slot the persistent-prefs
// backend writes (PREFIX + PREFS_KEY). Returns undefined when the preference is
// unset, storage is blocked, or the user is in session-only mode (prefs then
// live in memory only — the browser-language fallback applies).

import { PREFIX } from './local';
import { PREFS_KEY } from './manager';

export function storedLocaleHint(): string | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + PREFS_KEY);
    if (!raw) return undefined;
    const locale = (JSON.parse(raw) as { locale?: unknown }).locale;
    return typeof locale === 'string' ? locale : undefined;
  } catch {
    return undefined;
  }
}
