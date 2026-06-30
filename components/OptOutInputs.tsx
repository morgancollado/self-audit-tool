'use client';

// Transient identity that feeds the opt-out generator. Held in memory ONLY and
// never written to disk — name retention is off by default
// (scope/docs/04-data-model.md). The former name is collected here but only ever
// written into a request when the user opts in per broker (OptOutGenerator).

import { OptOutVars } from '@/lib/remediate/optout';

const inputProps = { autoComplete: 'off', autoCorrect: 'off', autoCapitalize: 'off', spellCheck: false } as const;

export function OptOutInputs({ vars, onChange }: { vars: OptOutVars; onChange: (next: OptOutVars) => void }) {
  const set = (key: keyof OptOutVars) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...vars, [key]: e.target.value });

  return (
    <fieldset className="name-inputs">
      <legend>Your details (kept in memory only — never saved)</legend>
      <p className="name-inputs-note">
        We use these to fill in your requests. They stay on this page and disappear when you leave.
        On a shared device, use a private / incognito window. Your former name is only written into a
        request if you tick the box on that broker — by default it’s left out.
      </p>
      <div className="name-inputs-grid">
        <label>
          Current name
          <input type="text" {...inputProps} value={vars.name ?? ''} onChange={set('name')} />
        </label>
        <label>
          Former name (deadname)
          <input type="text" {...inputProps} value={vars.aliases ?? ''} onChange={set('aliases')} />
        </label>
        <label>
          City / location
          <input type="text" {...inputProps} value={vars.location ?? ''} onChange={set('location')} />
        </label>
        <label>
          Reply-to email
          <input type="email" {...inputProps} value={vars.email ?? ''} onChange={set('email')} />
        </label>
      </div>
    </fieldset>
  );
}
