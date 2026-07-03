'use client';

// "Report this guide is broken" control. Opens a prefilled GitHub issue in a new
// tab — a plain navigation, nothing routed through Errata, no PII. The issue
// scaffold itself (lib/report/issue-url.ts) stays English on purpose: it lands
// in an English-language public repo for maintainers. See
// scope/docs/12-app-foundations.md.

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { buildIssueUrl, type BrokenReport } from '@/lib/report/issue-url';

type Props = Omit<BrokenReport, 'note'>;

const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

export function ReportBroken(props: Props) {
  const t = useTranslations('reportBroken');
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="report-broken-link" onClick={() => setOpen(true)}>
        {t('open')}
      </button>
    );
  }

  const href = buildIssueUrl({ ...props, note });

  return (
    <div className="report-broken" role="group" aria-label={t('groupAria')}>
      <label htmlFor="report-note">
        {t('whatWrong')} <span className="report-broken-optional">{t('optional')}</span>
      </label>
      <p className="report-broken-hint">{t.rich('hint', { strong })}</p>
      <textarea
        id="report-note"
        value={note}
        maxLength={1000}
        rows={3}
        placeholder={t('placeholder')}
        onChange={(e) => setNote(e.target.value)}
      />
      <p className="report-broken-hint">{t.rich('publicNote', { strong })}</p>
      <a className="report-broken-submit" href={href} target="_blank" rel="noopener noreferrer">
        {t('submit')}
      </a>
    </div>
  );
}
