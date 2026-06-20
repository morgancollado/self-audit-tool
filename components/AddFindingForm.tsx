'use client';

// Inline form to add a finding to the ledger, prefilled from a discovery step.

import { useState } from 'react';
import { useStorage } from '@/lib/storage/StorageProvider';
import { FindingSource, Priority } from '@/lib/model/types';

export interface AddFindingDefaults {
  source: FindingSource;
  refId?: string;
  label?: string;
  exposesDeadname?: boolean;
  priority?: Priority;
}

export function AddFindingForm({ defaults, onDone }: { defaults: AddFindingDefaults; onDone?: () => void }) {
  const { addFinding } = useStorage();
  const [label, setLabel] = useState(defaults.label ?? '');
  const [whatFound, setWhatFound] = useState('');
  const [exposesDeadname, setExposesDeadname] = useState(defaults.exposesDeadname ?? false);
  const [priority, setPriority] = useState<Priority>(defaults.priority ?? 'medium');

  return (
    <form
      className="add-finding"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!label.trim()) return;
        await addFinding({
          source: defaults.source,
          refId: defaults.refId,
          label: label.trim(),
          whatFound: whatFound.trim(),
          exposesDeadname,
          priority,
        });
        onDone?.();
      }}
    >
      <label>
        Where (e.g. “Spokeo”, “old LinkedIn”)
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} required />
      </label>
      <label>
        What you found
        <input
          type="text"
          value={whatFound}
          onChange={(e) => setWhatFound(e.target.value)}
          placeholder="in your own words"
        />
      </label>
      <label className="add-finding-checkbox">
        <input type="checkbox" checked={exposesDeadname} onChange={(e) => setExposesDeadname(e.target.checked)} />
        This exposes my former name
      </label>
      <label>
        Priority
        <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </label>
      <div className="add-finding-actions">
        <button type="submit" className="safety-intro-primary">
          Add to ledger
        </button>
        {onDone && (
          <button type="button" className="report-broken-link" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
