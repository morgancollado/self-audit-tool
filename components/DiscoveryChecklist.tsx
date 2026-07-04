'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getDiscoverySteps, getBroker, getQueryTemplate } from '@/lib/content/data';
import { DiscoveryStep, DiscoveryCategory } from '@/lib/content/types';
import { FindingSource } from '@/lib/model/types';
import { QueryVars, generateQueries, ENGINE_LABEL } from '@/lib/discover/queries';
import { CopyButton } from './CopyButton';
import { AddFindingForm } from './AddFindingForm';
import { UntranslatedNote } from './UntranslatedNote';

const SOURCE_BY_CATEGORY: Record<DiscoveryCategory, FindingSource> = {
  broker: 'broker',
  search: 'search',
  platform: 'platform',
  records: 'records',
};

export function DiscoveryChecklist({ vars }: { vars: QueryVars }) {
  const locale = useLocale();
  const { state, setStepDone, preferences } = useStorage();
  // Discovery is jurisdiction-scoped like everything else: global steps plus
  // this country's — never another country's.
  const country = preferences.jurisdiction?.country ?? 'us';
  const steps = getDiscoverySteps(country, locale);
  const completed = new Set(state?.progress.discoverCompletedSteps ?? []);

  return (
    <ol className="checklist">
      {steps.map((step) => (
        <StepCard key={step.slug} step={step} done={completed.has(step.slug)} vars={vars} onToggle={(d) => setStepDone(step.slug, d)} />
      ))}
    </ol>
  );
}

function StepCard({
  step,
  done,
  vars,
  onToggle,
}: {
  step: DiscoveryStep;
  done: boolean;
  vars: QueryVars;
  onToggle: (done: boolean) => void;
}) {
  const t = useTranslations('checklist');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [openAdd, setOpenAdd] = useState<string | null>(null);
  const brokers =
    step.category === 'broker' ? (step.refIds ?? []).map((r) => getBroker(r, locale)).filter(Boolean) : [];
  const templates = (step.queryTemplateKeys ?? [])
    .map((k) => getQueryTemplate(k, locale))
    .filter(Boolean) as NonNullable<ReturnType<typeof getQueryTemplate>>[];
  // The on-screen mask for the former name is user-visible — pass the localized
  // wording; the real string still lives only in the clipboard payload.
  const queries = templates.length
    ? generateQueries(templates, vars, { deadnameMask: t('deadnameMask') })
    : [];

  return (
    <li className={`step-card${done ? ' step-done' : ''}`}>
      <div className="step-head">
        <h3>{step.title}</h3>
        <span className="step-stamps">
          {/* Source stamp: a checked source earns the corrected fill. */}
          <span className={`stamp ${done ? 'state-confirmed' : 'state-todo'}`}>
            {done ? t('stampChecked') : t('stampTodo')}
          </span>
          <span className={`stamp priority-${step.priority}`}>{tc(`priority.${step.priority}`)}</span>
        </span>
      </div>
      <UntranslatedNote item={step} />
      <p className="step-why">{step.why}</p>

      <ol className="step-instructions">
        {step.instructions.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>

      {step.deadnamePrompts && step.deadnamePrompts.length > 0 && (
        <ul className="step-prompts" aria-label={t('promptsAria')}>
          {step.deadnamePrompts.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}

      {brokers.length > 0 && (
        <div className="step-brokers">
          {brokers.map((b) => (
            <div key={b!.slug} className="broker-row">
              <span>{b!.name}</span>
              {b!.searchUrl && (
                <a href={b!.searchUrl} target="_blank" rel="noopener noreferrer">
                  {t('openSearch')}
                </a>
              )}
              <button type="button" className="report-broken-link" onClick={() => setOpenAdd(`b:${b!.slug}`)}>
                {t('addToLedger')}
              </button>
              {openAdd === `b:${b!.slug}` && (
                <AddFindingForm
                  defaults={{
                    source: 'broker',
                    refId: b!.slug,
                    label: b!.name,
                    exposesDeadname: true,
                    priority: b!.exposesDeadnameRisk,
                  }}
                  onDone={() => setOpenAdd(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {templates.length > 0 && (
        <div className="step-queries">
          {queries.length === 0 ? (
            <p className="name-inputs-note">{t('fillDetails')}</p>
          ) : (
            <>
              <p className="query-privacy-note">
                {t.rich('privacyNote', { strong: (chunks) => <strong>{chunks}</strong> })}
              </p>
              {queries.map((q) => (
                <div key={q.key} className={`query-row${q.deadnameAware ? ' query-deadname' : ''}`}>
                  {/* The former name is never rendered — masked segments show a
                      neutral placeholder; the CopyButton copies the real query. */}
                  <code>
                    {q.display.map((seg, i) =>
                      seg.masked ? (
                        <span key={i} className="query-placeholder">
                          {seg.text}
                        </span>
                      ) : (
                        <span key={i}>{seg.text}</span>
                      ),
                    )}
                  </code>
                  <span className="query-actions">
                    <CopyButton
                      text={q.query}
                      label={q.deadnameAware ? t('copyFormer') : t('copyQuery')}
                    />
                    <a className="query-run" href={q.url} target="_blank" rel="noopener noreferrer">
                      {t('runOn', { engine: ENGINE_LABEL[q.engine] })}
                    </a>
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <div className="step-footer">
        <label className="step-done-toggle">
          <input type="checkbox" checked={done} onChange={(e) => onToggle(e.target.checked)} />
          {t('markDone')}
        </label>
        {openAdd !== 'generic' ? (
          <button type="button" onClick={() => setOpenAdd('generic')}>
            {t('addFinding')}
          </button>
        ) : (
          <AddFindingForm
            defaults={{ source: SOURCE_BY_CATEGORY[step.category], exposesDeadname: step.deadnameAware }}
            onDone={() => setOpenAdd(null)}
          />
        )}
      </div>
    </li>
  );
}
