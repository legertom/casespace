/**
 * The casebook search box understands more than substrings: "launched in css
 * by pati" should become filters, not a text match that finds nothing. This
 * module is the rule layer — deterministic, instant, no model call. The AI
 * fallback (actions-search.ts) only runs when these rules come up empty and
 * a human clicks the ask row.
 */
import type { Department, UcStatus } from "./domain";
import { foldName } from "./people-match";
import type { ProgramScope } from "./program-scope";

/** A directory row as the matcher sees it. */
export interface PersonName {
  id: string;
  name: string;
}

/**
 * "documented" rides along with the seven statuses because the search box
 * speaks the program's vocabulary — "qualified or better" is a slice people
 * ask for by name, and the URL already knows it as `status=documented`.
 */
export type ParsedStatus = UcStatus | "documented";

export interface SearchParse {
  status?: ParsedStatus;
  department?: Department;
  person?: PersonName;
  mine?: boolean;
  program?: ProgramScope;
}

const STATUS_WORDS: Record<string, ParsedStatus> = {
  discovery: "in_discovery",
  approved: "approved_by_fl",
  building: "under_construction",
  construction: "under_construction",
  testing: "in_testing",
  launched: "launched",
  live: "launched",
  shipped: "launched",
  qualified: "qualified",
  roi: "confirmed_positive_roi",
  confirmed: "confirmed_positive_roi",
  documented: "documented",
};

const DEPARTMENT_WORDS: Record<string, Department> = {
  css: "css",
  support: "css",
  mss: "mss",
  sales: "mss",
  marketing: "mss",
  engineering: "engineering",
  eng: "engineering",
  people: "people",
  talent: "people",
  hr: "people",
  finance: "finance_legal",
  legal: "finance_legal",
  design: "product_design",
  product: "product_design",
  ops: "business_operations",
  operations: "business_operations",
  bizops: "business_operations",
};

/** Connective tissue that never means anything on its own. */
const STOP_WORDS = new Set([
  "by", "in", "from", "the", "of", "for", "a", "an", "and", "use",
  "cases", "case", "stuff", "things", "workflows", "work",
]);

/**
 * Does a folded name part answer to a typed token? Prefix matches, plus the
 * abbreviations people actually type: "pati" is not a prefix of "Patricia"
 * (Pat-R-icia), so a token of 3+ characters also matches as an in-order
 * subsequence anchored to the part's first letter — the way editor
 * file-finders match.
 */
function nameHit(part: string, token: string): boolean {
  if (part.startsWith(token)) return true;
  if (token.length < 3 || part[0] !== token[0]) return false;
  let i = 0;
  for (const ch of part) {
    if (ch === token[i]) {
      i += 1;
      if (i === token.length) return true;
    }
  }
  return false;
}

/**
 * Everyone in the directory a token could mean. Names are compared folded —
 * the same treatment `mine=1` uses — so "leger" finds "Tom Léger".
 */
export function matchPeople(token: string, people: PersonName[]): PersonName[] {
  const t = foldName(token);
  if (!t) return [];
  return people.filter((p) =>
    foldName(p.name)
      .split(" ")
      .some((part) => nameHit(part, t)),
  );
}

/**
 * Turn a query into filters, or admit it isn't one. A single word must match
 * two ways before it counts (one hit is what the typeahead is for); once the
 * query is a phrase, one confident hit is enough. A person token counts only
 * when it points at exactly one human — an ambiguous name is the typeahead's
 * job to disambiguate, not this parser's to guess.
 */
export function parseSearch(
  q: string,
  people: PersonName[],
): SearchParse | null {
  const words = foldName(q)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const out: SearchParse = {};
  for (const w of words) {
    if (STATUS_WORDS[w]) { out.status = STATUS_WORDS[w]; continue; }
    if (DEPARTMENT_WORDS[w]) { out.department = DEPARTMENT_WORDS[w]; continue; }
    if (w === "mine" || w === "my") { out.mine = true; continue; }
    if (w === "community") { out.program = "community"; continue; }
    if (w === "everything" || w === "all") { out.program = "all"; continue; }
    if (STOP_WORDS.has(w)) continue;
    if (w.length >= 3) {
      const hits = matchPeople(w, people);
      if (hits.length === 1) out.person = hits[0];
    }
  }
  const matched = Object.keys(out).length;
  return matched >= (words.length > 1 ? 1 : 2) ? out : null;
}

/** Whether a query reads like it's about a person ("by …"). */
export function looksLikePersonQuery(q: string): boolean {
  return /(^|\s)by(\s|$)/i.test(q.trim());
}
