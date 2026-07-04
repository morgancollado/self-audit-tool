'use client';

// Transient identity inputs that feed the search-query generator. For M1 these
// are held in memory ONLY and never written to disk — the off-by-default name
// retention is honored by simply not persisting (scope/docs/04-data-model.md).

import { useTranslations } from 'next-intl';
import { QueryVars } from '@/lib/discover/queries';

export function NameInputs({ vars, onChange }: { vars: QueryVars; onChange: (next: QueryVars) => void }) {
  const t = useTranslations('nameInputs');
  const set = (key: keyof QueryVars) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...vars, [key]: e.target.value });

  return (
    <fieldset className="name-inputs">
      <legend>{t('legend')}</legend>
      <p className="name-inputs-note">{t('note')}</p>
      <div className="name-inputs-grid">
        <label>
          {t('currentName')}
          <input type="text" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={vars.name ?? ''} onChange={set('name')} />
        </label>
        <label>
          {t('formerName')}
          <input type="text" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={vars.deadname ?? ''} onChange={set('deadname')} />
        </label>
        <label>
          {t('city')}
          <input type="text" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={vars.city ?? ''} onChange={set('city')} />
        </label>
        <label>
          {t('employer')}
          <input type="text" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={vars.employer ?? ''} onChange={set('employer')} />
        </label>
      </div>
    </fieldset>
  );
}
