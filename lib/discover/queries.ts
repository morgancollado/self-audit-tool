// Build copyable search queries from the user's transient input. Pure functions,
// no I/O — the inputs live in component state and are never persisted unless the
// user explicitly opts in (scope/docs/04-data-model.md).

import { QueryTemplate, QueryVar, SearchEngine } from '../content/types';

export type QueryVars = Partial<Record<QueryVar, string>>;

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

function placeholdersIn(template: string): QueryVar[] {
  return [...template.matchAll(PLACEHOLDER_RE)].map((m) => m[1] as QueryVar);
}

/**
 * Fill a template, or return null if any required term is missing/blank. A dork
 * with an empty term is useless, so we skip it rather than emit a broken query.
 */
export function fillTemplate(template: string, vars: QueryVars): string | null {
  for (const p of placeholdersIn(template)) {
    if (!vars[p] || vars[p]!.trim() === '') return null;
  }
  return template.replace(PLACEHOLDER_RE, (_, key: string) => vars[key as QueryVar]!.trim());
}

const ENGINE_URL: Record<Exclude<SearchEngine, 'any'>, string> = {
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
};

/** A clickable search URL for the query. 'any' defaults to Google. */
export function buildEngineUrl(engine: SearchEngine, query: string): string {
  const base = engine === 'any' ? ENGINE_URL.google : ENGINE_URL[engine];
  return base + encodeURIComponent(query);
}

export interface GeneratedQuery {
  key: string;
  label: string;
  engine: SearchEngine;
  query: string;
  url: string;
  deadnameAware: boolean;
}

/** Generate all runnable queries from the given templates + vars (skips incomplete ones). */
export function generateQueries(templates: QueryTemplate[], vars: QueryVars): GeneratedQuery[] {
  const out: GeneratedQuery[] = [];
  for (const t of templates) {
    const query = fillTemplate(t.template, vars);
    if (query === null) continue;
    out.push({
      key: t.key,
      label: t.label,
      engine: t.engine,
      query,
      url: buildEngineUrl(t.engine, query),
      deadnameAware: t.deadnameAware,
    });
  }
  // Deadname-aware queries first — the differentiator leads.
  return out.sort((a, b) => Number(b.deadnameAware) - Number(a.deadnameAware));
}
