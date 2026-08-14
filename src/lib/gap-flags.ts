/**
 * Gap flags for a use-case draft — what's missing before it can clear the
 * program's bars. Pure and shared by the notes door and proposal cards.
 */
import type { UseCaseCreateInput } from "./use-case-input";

export function computeGapFlags(input: Partial<UseCaseCreateInput>): string[] {
  const gaps: string[] = [];
  if (!input.owner?.displayName) gaps.push("No owner named");
  if (!input.authors?.length) gaps.push("No authors credited");
  if (!input.department) gaps.push("No department chosen");
  if (!input.successCriterion?.trim()) gaps.push("No success criterion");
  if (!input.aiTools?.length && !input.approaches?.length)
    gaps.push("AI tool & approach not identified");
  if (
    input.roiStatus !== "not_yet_measurable" &&
    (input.baselineValue === null || input.baselineValue === undefined)
  )
    gaps.push("ROI baseline missing");
  if (input.roiStatus === "not_yet_measurable" && !input.revisitOn)
    gaps.push("No revisit date for ROI");
  if (!input.gateAdoption && !input.adoptionEvidence?.trim())
    gaps.push("No adoption evidence beyond the authors");
  return gaps;
}
