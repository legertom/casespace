/**
 * Links between workflows, seen from one record.
 *
 * A link is stored once, on the record it was made from. Every record shows
 * both ends of every link it is part of, so the reading side has to be worked
 * out per record — that's what these pure functions do.
 */

import { LINK_HEADINGS, type LinkKind } from "./domain";

/** "Relates to" reads the same both ways, so both directions share a heading. */
export function isSymmetric(kind: LinkKind): boolean {
  return kind === "relates_to";
}

/** One link as the record in hand sees it. */
export interface RecordLink {
  id: string;
  kind: LinkKind;
  /** True when this record is the "from" side — the one the link was made on. */
  outgoing: boolean;
  createdById: string;
  otherId: string;
  otherTitle: string;
  otherOwnerName: string | null;
}

export interface LinkGroup {
  label: string;
  links: RecordLink[];
}

/**
 * The record's links under their headings, in LINK_HEADINGS order, empty
 * headings dropped. Symmetric links all land in the outgoing heading, since
 * "relates to" is what both ends say.
 */
export function groupLinks(links: RecordLink[]): LinkGroup[] {
  return LINK_HEADINGS.map(({ kind, outgoing, label }) => ({
    label,
    links: links.filter(
      (l) =>
        l.kind === kind &&
        (isSymmetric(kind) ? outgoing : l.outgoing === outgoing),
    ),
  })).filter((g) => g.links.length > 0);
}

/**
 * The heading an existing link already sits under, from the asking record's
 * side — so "already linked" can name what it's already linked as.
 */
export function existingLinkLabel(link: {
  kind: LinkKind;
  outgoing: boolean;
}): string {
  const heading = LINK_HEADINGS.find(
    (h) =>
      h.kind === link.kind &&
      (isSymmetric(link.kind) ? h.outgoing : h.outgoing === link.outgoing),
  );
  return heading?.label ?? "Relates to";
}
