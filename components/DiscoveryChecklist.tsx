'use client';

import { useState } from 'react';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getDiscoverySteps, getBroker, getQueryTemplate } from '@/lib/content/data';
import { DiscoveryStep, DiscoveryCategory } from '@/lib/content/types';
import { FindingSource } from '@/lib/model/types';
import { QueryVars, generateQueries, ENGINE_LABEL } from '@/lib/discover/queries';
import { CopyButton } from './CopyButton';
import { AddFindingForm } from './AddFindingForm';

const SOURCE_BY_CATEGORY: Record<DiscoveryCategory, FindingSource> = {
  broker: 'broker',
  search: 'search',
  platform: 'platform',
  records: 'records',
};

export function DiscoveryChecklist({ vars }: { vars: QueryVars }) {
  const { state, setStepDone } = useStorage();
  const steps = getDiscoverySteps('us');
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
  const [openAdd, setOpenAdd] = useState<string | null>(null);
  const brokers = step.category === 'broker' ? (step.refIds ?? []).map(getBroker).filter(Boolean) : [];
  const templates = (step.queryTemplateKeys ?? []).map(getQueryTemplate).filter(Boolean) as NonNullable<
    ReturnType<typeof getQueryTemplate>
  >[];
  const queries = templates.length ? generateQueries(templates, vars) : [];

  return (
    <li className={`step-card${done ? ' step-done' : ''}`}>
      <div className="step-head">
        <h3>{step.title}</h3>
        <span className="step-stamps">
          {/* Source stamp: a checked source earns the corrected fill. */}
          <span className={`stamp ${done ? 'state-confirmed' : 'state-todo'}`}>
            {done ? 'checked' : 'to do'}
          </span>
          <span className={`stamp priority-${step.priority}`}>{step.priority}</span>
        </span>
      </div>
      <p className="step-why">{step.why}</p>

      <ol className="step-instructions">
        {step.instructions.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>

      {step.deadnamePrompts && step.deadnamePrompts.length > 0 && (
        <ul className="step-prompts" aria-label="Things to look for">
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
                  Open search ↗
                </a>
              )}
              <button type="button" className="report-broken-link" onClick={() => setOpenAdd(`b:${b!.slug}`)}>
                Add to ledger
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
            <p className="name-inputs-note">Fill in your details above and your search strings appear here.</p>
          ) : (
            <>
              <p className="query-privacy-note">
                Safest is to <strong>copy</strong> a query and paste it into a private / incognito
                window. “Run” opens the search in a new tab — it’s sent to the search engine and shows
                up in your browsing history. Searches for your former name always open in DuckDuckGo,
                which doesn’t profile you.
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
                      label={q.deadnameAware ? 'Copy the former-name search' : 'Copy the search query'}
                    />
                    <a className="query-run" href={q.url} target="_blank" rel="noopener noreferrer">
                      Run on {ENGINE_LABEL[q.engine]} ↗
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
          Mark this step done
        </label>
        {openAdd !== 'generic' ? (
          <button type="button" onClick={() => setOpenAdd('generic')}>
            Add a finding
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
