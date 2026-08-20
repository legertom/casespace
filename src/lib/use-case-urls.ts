/**
 * Record URLs as data — pure, no I/O.
 *
 * `isSafeHttpUrl` is deliberately redundant with useCaseUrlSchema. The schema
 * guards the write doors we know about; this guards the anchor itself, which
 * is the only place a bad scheme could ever do harm. A row written before the
 * check existed, or through a door added later, still can't become a
 * javascript: link on a page every authenticated user can read.
 */

import { URL_KIND_LABELS, type UrlKind } from "./domain";

export interface UseCaseUrlRef {
  kind: UrlKind;
  label?: string | null;
  url: string;
}

/** http/https only. Anything unparseable, or any other scheme, is not safe. */
export function isSafeHttpUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

/** The free label if there is one, else what the kind is called. */
export function urlDisplayLabel(u: UseCaseUrlRef): string {
  return u.label?.trim() || URL_KIND_LABELS[u.kind];
}
