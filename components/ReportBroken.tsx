'use client';

// "Report this guide is broken" control. Opens a prefilled GitHub issue in a new
// tab — a plain navigation, nothing routed through Errata, no PII. See
// lib/report/issue-url.ts and scope/docs/12-app-foundations.md.

import { useState } from 'react';
import { buildIssueUrl, type BrokenReport } from '@/lib/report/issue-url';

type Props = Omit<BrokenReport, 'note'>;

export function ReportBroken(props: Props) {
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="report-broken-link" onClick={() => setOpen(true)}>
        Something here looks out of date?
      </button>
    );
  }

  const href = buildIssueUrl({ ...props, note });

  return (
    <div className="report-broken" role="group" aria-label="Report an out-of-date guide">
      <label htmlFor="report-note">
        What looks wrong? <strong>Don’t include your name, deadname, or any personal info.</strong>
      </label>
      <textarea
        id="report-note"
        value={note}
        maxLength={1000}
        rows={3}
        placeholder="e.g. the opt-out link 404s, or step 3 no longer matches the page"
        onChange={(e) => setNote(e.target.value)}
      />
      <p className="report-broken-hint">
        This opens a public GitHub issue in a new tab. Nothing is sent through Errata.
      </p>
      <a className="report-broken-submit" href={href} target="_blank" rel="noopener noreferrer">
        Open a report on GitHub
      </a>
    </div>
  );
}
