'use client';

// Transient identity inputs that feed the search-query generator. For M1 these
// are held in memory ONLY and never written to disk — the off-by-default name
// retention is honored by simply not persisting (scope/docs/04-data-model.md).

import { QueryVars } from '@/lib/discover/queries';

export function NameInputs({ vars, onChange }: { vars: QueryVars; onChange: (next: QueryVars) => void }) {
  const set = (key: keyof QueryVars) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...vars, [key]: e.target.value });

  return (
    <fieldset className="name-inputs">
      <legend>Your details (kept in memory only)</legend>
      <p className="name-inputs-note">
        We use these to build search strings for you. On a shared device, use a private / incognito
        window so the browser itself doesn’t remember what you type.
      </p>
      <div className="name-inputs-grid">
        <label>
          Current name
          <input type="text" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={vars.name ?? ''} onChange={set('name')} />
        </label>
        <label>
          Former name (deadname)
          <input type="text" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={vars.deadname ?? ''} onChange={set('deadname')} />
        </label>
        <label>
          City
          <input type="text" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={vars.city ?? ''} onChange={set('city')} />
        </label>
        <label>
          Employer or school
          <input type="text" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={vars.employer ?? ''} onChange={set('employer')} />
        </label>
      </div>
    </fieldset>
  );
}
