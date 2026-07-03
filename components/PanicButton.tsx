'use client';

// Panic-delete: one obvious, always-reachable control that instantly wipes all
// local state and reloads to a neutral screen. Instant and UNCONFIRMED by design
// — a "are you sure?" prompt can fail the user in the moment
// (scope/docs/04-data-model.md). Export-first lives elsewhere for non-panic
// situations.

import { useTranslations } from 'next-intl';
import { useStorage } from '@/lib/storage/StorageProvider';

export function PanicButton() {
  const t = useTranslations('panic');
  const { panic } = useStorage();
  return (
    <button
      type="button"
      className="panic-button"
      onClick={() => void panic()}
      aria-label={t('aria')}
      title={t('title')}
    >
      {t('label')}
    </button>
  );
}
