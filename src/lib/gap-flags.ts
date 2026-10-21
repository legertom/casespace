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
  // The revisit date is set at launch whatever the ROI status, and is only
  // moot once the actual number is in.
  if (!input.revisitOn && input.postValue == null)
    gaps.push("No revisit date for ROI");
  // Kate's step 2: a launched time-saved workflow should say what it expects
  // to save. A prompt, never a block — nothing here is on the ROI checklist.
  if (
    input.valueType === "time_saved" &&
    input.status === "launched" &&
    input.expectedValue == null
  )
    gaps.push("No expected ROI at launch");
  if (!input.gateAdoption && !input.adoptionEvidence?.trim())
    gaps.push("No adoption evidence beyond the authors");
  return gaps;
}
