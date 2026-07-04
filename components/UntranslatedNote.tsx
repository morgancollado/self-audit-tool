'use client';

// Honest fallback marker: rendered on any content card whose prose has no
// translation for the active locale (the build stamps `untranslated: true` —
// see scripts/generate-content-manifest.mjs). The reader sees the original
// language plus this note, never a silent mix or a dead end.

import { useTranslations } from 'next-intl';
import { Localized } from '@/lib/content/types';

export function UntranslatedNote({ item }: { item: Localized }) {
  const t = useTranslations('common');
  if (!item.untranslated) return null;
  return (
    <p className="content-verified untranslated-note" role="note">
      {t('untranslated')}
    </p>
  );
}
