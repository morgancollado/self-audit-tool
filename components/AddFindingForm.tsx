'use client';

// Inline form to add a finding to the ledger, prefilled from a discovery step.

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('addFinding');
  const tc = useTranslations('common');
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
        {t('where')}
        <input
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />
      </label>
      <label>
        {t('what')}
        <input
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={whatFound}
          onChange={(e) => setWhatFound(e.target.value)}
          placeholder={t('whatPlaceholder')}
        />
      </label>
      <p className="report-broken-hint">{t('hint')}</p>
      <label className="add-finding-checkbox">
        <input type="checkbox" checked={exposesDeadname} onChange={(e) => setExposesDeadname(e.target.checked)} />
        {t('exposes')}
      </label>
      <label>
        {t('priority')}
        <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          <option value="high">{tc('priorityOption.high')}</option>
          <option value="medium">{tc('priorityOption.medium')}</option>
          <option value="low">{tc('priorityOption.low')}</option>
        </select>
      </label>
      <div className="add-finding-actions">
        <button type="submit" className="safety-intro-primary">
          {t('submit')}
        </button>
        {onDone && (
          <button type="button" className="report-broken-link" onClick={onDone}>
            {t('cancel')}
          </button>
        )}
      </div>
    </form>
  );
}
