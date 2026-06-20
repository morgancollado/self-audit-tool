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
      <legend>Your details (kept in memory only — never saved)</legend>
      <p className="name-inputs-note">
        We use these to build search strings for you. They stay on this page and disappear when you
        leave — nothing is saved or sent.
      </p>
      <div className="name-inputs-grid">
        <label>
          Current name
          <input type="text" autoComplete="off" value={vars.name ?? ''} onChange={set('name')} />
        </label>
        <label>
          Former name (deadname)
          <input type="text" autoComplete="off" value={vars.deadname ?? ''} onChange={set('deadname')} />
        </label>
        <label>
          City
          <input type="text" autoComplete="off" value={vars.city ?? ''} onChange={set('city')} />
        </label>
        <label>
          Employer or school
          <input type="text" autoComplete="off" value={vars.employer ?? ''} onChange={set('employer')} />
        </label>
      </div>
    </fieldset>
  );
}
