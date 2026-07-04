// Locale-aware rendering for content datestamps (lastVerified). The values are
// date-ONLY ISO strings ("2026-07-04"); new Date(iso) would parse that as UTC
// midnight and display the previous day anywhere west of Greenwich, so the
// Date is built from local parts instead. Anything unexpected falls back to
// the raw string rather than throwing mid-render.

export function formatContentDate(iso: string, locale: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}
