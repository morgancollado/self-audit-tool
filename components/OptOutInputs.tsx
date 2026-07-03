'use client';

// Transient identity that feeds the opt-out generator. Held in memory ONLY and
// never written to disk — name retention is off by default
// (scope/docs/04-data-model.md). The former name is collected here but only ever
// written into a request when the user opts in per broker (OptOutGenerator).

import { useTranslations } from 'next-intl';
import { OptOutVars } from '@/lib/remediate/optout';

const inputProps = { autoComplete: 'off', autoCorrect: 'off', autoCapitalize: 'off', spellCheck: false } as const;

export function OptOutInputs({ vars, onChange }: { vars: OptOutVars; onChange: (next: OptOutVars) => void }) {
  const t = useTranslations('optOutInputs');
  const set = (key: keyof OptOutVars) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...vars, [key]: e.target.value });

  return (
    <fieldset className="name-inputs">
      <legend>{t('legend')}</legend>
      <p className="name-inputs-note">{t('note')}</p>
      <div className="name-inputs-grid">
        <label>
          {t('currentName')}
          <input type="text" {...inputProps} value={vars.name ?? ''} onChange={set('name')} />
        </label>
        <label>
          {t('formerName')}
          <input type="text" {...inputProps} value={vars.aliases ?? ''} onChange={set('aliases')} />
        </label>
        <label>
          {t('location')}
          <input type="text" {...inputProps} value={vars.location ?? ''} onChange={set('location')} />
        </label>
        <label>
          {t('email')}
          <input type="email" {...inputProps} value={vars.email ?? ''} onChange={set('email')} />
        </label>
      </div>
    </fieldset>
  );
}
