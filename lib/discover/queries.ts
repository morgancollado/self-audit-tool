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
  // DuckDuckGo doesn't profile the searcher or tie the query to an account — the
  // privacy default, and what we force for any deadname-bearing query.
  duckduckgo: 'https://duckduckgo.com/?q=',
};

export const ENGINE_LABEL: Record<Exclude<SearchEngine, 'any'>, string> = {
  google: 'Google',
  bing: 'Bing',
  duckduckgo: 'DuckDuckGo',
};

const PRIVACY_ENGINE: Exclude<SearchEngine, 'any'> = 'duckduckgo';

/**
 * Resolve which engine a query actually runs on. SAFETY POLICY, enforced in code
 * (not left to content): a deadname-aware query is ALWAYS routed to the privacy
 * engine — never Google/Bing. Running the user's former name through a profiling
 * engine would tie their current identity to their deadname in that engine's
 * logs (and their own history) — the exact linkage Errata exists to reduce.
 * 'any' also resolves to the privacy engine.
 */
export function resolveEngine(engine: SearchEngine, deadnameAware: boolean): Exclude<SearchEngine, 'any'> {
  if (deadnameAware) return PRIVACY_ENGINE;
  return engine === 'any' ? PRIVACY_ENGINE : engine;
}

/** A clickable search URL for the query, honoring the deadname privacy policy. */
export function buildEngineUrl(engine: SearchEngine, query: string, deadnameAware = false): string {
  const resolved = resolveEngine(engine, deadnameAware);
  return ENGINE_URL[resolved] + encodeURIComponent(query);
}

export interface GeneratedQuery {
  key: string;
  label: string;
  /** The engine the query actually runs on (after the deadname privacy policy). */
  engine: Exclude<SearchEngine, 'any'>;
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
      engine: resolveEngine(t.engine, t.deadnameAware),
      query,
      url: buildEngineUrl(t.engine, query, t.deadnameAware),
      deadnameAware: t.deadnameAware,
    });
  }
  // Deadname-aware queries first — the differentiator leads.
  return out.sort((a, b) => Number(b.deadnameAware) - Number(a.deadnameAware));
}
