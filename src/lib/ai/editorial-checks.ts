/**
 * Mechanical checks on a generated What's New post.
 *
 * These cover the editorial rules that can be decided by looking at the text —
 * no dollars, no emoji, no gamification, the sections that must appear or must
 * not. They are pure and unit-tested, which matters: an eval whose detector is
 * broken is worse than no eval, because it reports green.
 *
 * The rules that need judgement — did it invent a number, did it stay inside
 * the changelog it was given — are graded by a model in `evals/judge.ts`.
 */
import type { WeekData } from "./whats-new-prompt";

export interface Violation {
  /** Which editorial rule was broken. */
  rule: string;
  /** The text that broke it, for the failure message. */
  evidence: string;
}

/** A dollar sign before a figure, or the words for one. */
const MONEY = [
  /\$\s?[\d,.]+/g,
  /\b[\d,.]+\s?(?:k|m|bn)?\s?(?:dollars|USD)\b/gi,
  /\bdollars?\b/gi,
  /\bUSD\b/g,
];

/**
 * Pace language. Deliberately narrow: the brief itself says "what is in flight
 * behind them", so a bare "behind" has to stay legal.
 */
const PACE = [
  /\b(?:ahead of|behind)\s+(?:the\s+|our\s+)?(?:pace|schedule|target|plan|goal)\b/gi,
  /\bon (?:track|pace)\b/gi,
  /\b(?:falling|lagging) behind\b/gi,
  /\bahead of where\b/gi,
];

/** Badges, scoreboards-as-competition, and applause. "Points" is legal — pulse readings move in percentage points. */
const GAMIFICATION = [
  /\bbadges?\b/gi,
  /\bleaderboards?\b/gi,
  /\bstreaks?\b/gi,
  /\btop (?:performer|team)s?\b/gi,
  /\bcongratulations\b/gi,
  /\bkudos\b/gi,
  /\bshout[- ]?outs?\b/gi,
  /\bgreat job\b/gi,
  /\bwell done\b/gi,
];

const HYPE = [
  /\b(?:thrilled|excited|exciting)\b/gi,
  /\b(?:amazing|incredible|fantastic|awesome)\b/gi,
  /\bgame[- ]chang(?:er|ing)\b/gi,
  /\bblown away\b/gi,
  /\bcrushing it\b/gi,
];

const EMOJI = /\p{Extended_Pictographic}/gu;

function hits(text: string, patterns: RegExp[], rule: string): Violation[] {
  return patterns.flatMap((pattern) =>
    [...text.matchAll(pattern)].map((m) => ({ rule, evidence: m[0] })),
  );
}

/**
 * Rules that depend only on the prose. Returns every violation rather than the
 * first, so one run tells you everything that regressed.
 */
export function editorialViolations(post: string): Violation[] {
  const violations: Violation[] = [
    ...hits(post, MONEY, "no dollar figures"),
    ...hits(post, PACE, "no editorializing about pace"),
    ...hits(post, GAMIFICATION, "no gamification"),
    ...hits(post, HYPE, "no hype"),
    ...hits(post, [EMOJI], "no emoji"),
  ];

  for (const m of post.matchAll(/!/g)) {
    violations.push({ rule: "no exclamation marks", evidence: m[0] });
  }

  const headline = post.trim().match(/^#\s+(.+)$/m);
  if (!headline) {
    violations.push({
      rule: "opens with an h1 headline",
      evidence: post.trim().slice(0, 60),
    });
  } else if (/^weekly update$/i.test(headline[1].trim())) {
    violations.push({
      rule: "headline is specific, not generic",
      evidence: headline[1],
    });
  }

  return violations;
}

const SECTION = {
  casebook: /^##\s+New in the casebook\b/m,
  pulse: /^##\s+Pulse\b/m,
  casespace: /^##\s+New in Casespace\b/m,
} as const;

/**
 * Rules that only make sense against the week the post was written from:
 * sections that must be skipped when their data is empty, and the people the
 * brief says to credit by name.
 */
export function structureViolations(
  post: string,
  data: WeekData,
): Violation[] {
  const violations: Violation[] = [];

  const expect = (
    present: boolean,
    shouldBe: boolean,
    rule: string,
    evidence: string,
  ) => {
    if (present !== shouldBe) violations.push({ rule, evidence });
  };

  expect(
    SECTION.pulse.test(post),
    data.pulseReadings.length > 0,
    "Pulse appears only when the week has readings",
    `${data.pulseReadings.length} readings`,
  );
  expect(
    SECTION.casespace.test(post),
    data.casespaceChanges.length > 0,
    "New in Casespace appears only when the changelog has entries",
    `${data.casespaceChanges.length} changelog entries`,
  );
  if (data.newRecords.length === 0 && SECTION.casebook.test(post)) {
    violations.push({
      rule: "New in the casebook is skipped when nothing was logged",
      evidence: "section present with no new records",
    });
  }

  // Naming whoever asked for a change is the recognition the brief cares about.
  for (const change of data.casespaceChanges) {
    if (change.requestedBy && !post.includes(change.requestedBy)) {
      violations.push({
        rule: "credits the person who requested a change",
        evidence: `${change.requestedBy} (${change.title})`,
      });
    }
  }

  return violations;
}

/** One-line summary for a test failure message. */
export function describeViolations(violations: Violation[]): string {
  return violations
    .map((v) => `  • ${v.rule} — found: ${JSON.stringify(v.evidence)}`)
    .join("\n");
}
