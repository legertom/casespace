import type { UcStatus } from "./domain";

/**
 * Sequential one-hue ramp for the ordered pipeline (light → deep rust).
 * Shared by the dashboard's pipeline and the drawings on /graphs, so the
 * same status is the same colour wherever it appears.
 */
export const PIPELINE_RAMP: Record<UcStatus, string> = {
  in_discovery: "#ecdccd",
  approved_by_fl: "#ddbfa6",
  under_construction: "#c99f7e",
  in_testing: "#b37d55",
  launched: "#9a5a31",
  qualified: "#7a3a18",
  confirmed_positive_roi: "#5c2a0e",
};

/** Ink that stays legible on a given step of the ramp. */
export function onRamp(index: number): string {
  return index >= 4 ? "#faf8f3" : "#22201c";
}
