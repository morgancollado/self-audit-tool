'use client';

// Persistent <-> session-only (ephemeral) toggle. Switching to session-only
// offers to wipe anything already saved (scope/docs/04-data-model.md).

import { useTranslations } from 'next-intl';
import { useStorage } from '@/lib/storage/StorageProvider';

export function StorageModeToggle() {
  const t = useTranslations('storageMode');
  const { durable, mode, setMode } = useStorage();

  if (!durable) {
    return <p className="mode-toggle-note">{t('notDurable')}</p>;
  }

  if (mode === 'ephemeral') {
    return (
      <div className="mode-toggle">
        <p>{t('ephemeralStatus')}</p>
        <button type="button" onClick={() => void setMode('persistent')}>
          {t('saveButton')}
        </button>
      </div>
    );
  }

  return (
    <div className="mode-toggle">
      <p>{t('persistentStatus')}</p>
      <button
        type="button"
        onClick={() => {
          const wipe = window.confirm(t('confirmWipe'));
          void setMode('ephemeral', { wipeExisting: wipe });
        }}
      >
        {t('switchButton')}
      </button>
    </div>
  );
}
