/**
 * Which slice of the casebook a list is showing.
 *
 * The program is what the 45 and the 15 count; community submissions are real
 * work logged by people outside the AI Leads roster. Both live in the same
 * casebook — this is the vocabulary for saying which you want to see. Metrics
 * never take a scope: they are program-only by construction (see
 * `src/db/scopes.ts`).
 */

export const PROGRAM_SCOPES = ["program", "community", "all"] as const;

export type ProgramScope = (typeof PROGRAM_SCOPES)[number];

/**
 * The casebook's default. Program-only, so the page Kate lives on shows her
 * world first — a deliberate exception to "the casebook shows everything."
 * Community work is one click away and the empty state says so. Note the home
 * page's "Your use cases" ignores this entirely: you always see your own.
 */
export const DEFAULT_PROGRAM_SCOPE: ProgramScope = "program";

export const PROGRAM_SCOPE_LABELS: Record<ProgramScope, string> = {
  program: "In the program",
  community: "Community submissions",
  all: "Program and community",
};

/**
 * Read a submitted value. Anything unrecognized falls back rather than
 * throwing — a filter is never worth a 500.
 */
export function parseProgramScope(
  value: unknown,
  fallback: ProgramScope = DEFAULT_PROGRAM_SCOPE,
): ProgramScope {
  return PROGRAM_SCOPES.includes(value as ProgramScope)
    ? (value as ProgramScope)
    : fallback;
}

/**
 * The `UseCaseFilters.inProgram` value for a scope.
 *
 * `undefined` means "don't filter" and is distinct from `false`, which means
 * "community only". Callers must test `!== undefined`, never truthiness — the
 * `false` case is exactly the one a truthy check drops.
 */
export function scopeToFilter(scope: ProgramScope): boolean | undefined {
  if (scope === "program") return true;
  if (scope === "community") return false;
  return undefined;
}
