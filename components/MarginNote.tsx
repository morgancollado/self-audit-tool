// The margin voice (scope/docs/11-brand.md, the "margin notes" redesign). A quiet
// annotator in the italic serif that floats into the left gutter. It is
// DECORATION ONLY: the whole aside is aria-hidden, and every fact it states must
// already exist in the accessible page flow (e.g. the ledger/tracker summary
// line). Notes are duplication, never the sole source. Below 46rem the gutter —
// and these notes — disappear (see .margin-note in globals.css).
//
// Voice rules (enforced in the copy each page passes): state facts, never urge;
// at most two notes per screen; no exclamation marks.

import type { ReactNode } from 'react';

export function MarginNote({ mark = '‸', children }: { mark?: string; children: ReactNode }) {
  return (
    <aside className="margin-note" aria-hidden="true">
      <span className="margin-note-mark">{mark}</span>
      {children}
    </aside>
  );
}
