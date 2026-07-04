'use client';

// Country-first jurisdiction picker (locale ≠ jurisdiction, scope/docs/03):
// US → the state list (rights are sub-national there); Colombia → national
// (Ley 1581 applies country-wide, no region axis). Reads/writes the shared
// jurisdiction preference so rights, brokers, and records update everywhere.
// Switching country drops the region — a CO jurisdiction must never keep a US
// state attached (the no-cross-country rule).

import { useTranslations } from 'next-intl';
import { useStorage } from '@/lib/storage/StorageProvider';
import { US_STATES, stateName } from '@/lib/content/us-states';
import { Country } from '@/lib/model/types';

export function JurisdictionSelect({ note }: { note?: string }) {
  const t = useTranslations('jurisdiction');
  const { preferences, setJurisdiction } = useStorage();
  const jurisdiction = preferences.jurisdiction ?? { country: 'us' as const };
  const country = jurisdiction.country;
  const region = country === 'us' ? jurisdiction.region : undefined;

  return (
    <div className="state-select">
      <label className="rights-state">
        {t('country')}
        <select
          value={country}
          onChange={(e) => void setJurisdiction({ country: e.target.value as Country })}
        >
          <option value="us">{t('countryUs')}</option>
          <option value="co">{t('countryCo')}</option>
        </select>
      </label>
      {country === 'us' && (
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
      )}
      {note && <p className="name-inputs-note">{note}</p>}
      <p className="visually-hidden" role="status" aria-live="polite">
        {country === 'co'
          ? t('showingCo')
          : region
            ? t('showingState', { state: stateName(region) ?? region })
            : t('noneSelected')}
      </p>
    </div>
  );
}
