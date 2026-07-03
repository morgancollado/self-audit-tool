'use client';

// A compact state picker that reads/writes the shared jurisdiction preference, so
// region-aware content (records, rights) updates everywhere. Mirrors the selector
// inside StateRights but stands alone for pages that only need the picker.

import { useTranslations } from 'next-intl';
import { useStorage } from '@/lib/storage/StorageProvider';
import { US_STATES, stateName } from '@/lib/content/us-states';

export function StateSelect({ note }: { note?: string }) {
  const t = useTranslations('stateSelect');
  const { preferences, setJurisdiction } = useStorage();
  const region = preferences.jurisdiction?.region;

  return (
    <div className="state-select">
      <label className="rights-state">
        {t('yourState')}
        <select
          value={region ?? ''}
          onChange={(e) => void setJurisdiction({ country: 'us', region: e.target.value || undefined })}
        >
          <option value="">{t('selectState')}</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {note && <p className="name-inputs-note">{note}</p>}
      <p className="visually-hidden" role="status" aria-live="polite">
        {region ? t('showingFor', { state: stateName(region) ?? region }) : t('noneSelected')}
      </p>
    </div>
  );
}
