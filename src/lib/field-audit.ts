/**
 * How a field-change audit row reads in the Activity stream — pure, so the
 * sentences are tested rather than eyeballed. The rows themselves are
 * written by the service in the same transaction as the change; see
 * AUDITED_FIELDS in domain.ts for what is and isn't recorded.
 *
 * Values arrive as display strings (names, "true"/"false"), never ids: the
 * trail has to stay readable after roster and directory changes. Null means
 * "none".
 */
import type { AuditedField } from "./domain";

/** How each gate reads in a sentence — mirrors the record page's labels. */
const GATE_NAMES = {
  gate_named: "Named workflow, clear description",
  gate_tool: "AI tool & approach identified",
  gate_adoption: "Adoption beyond the author(s)",
  gate_owner: "A named owner",
} as const;

export function describeFieldChange(
  field: AuditedField,
  fromValue: string | null,
  toValue: string | null,
): string {
  switch (field) {
    case "in_program":
      return toValue === "true"
        ? "Added to the program — counts toward the 45 and the 15"
        : "Removed from the program — no longer counted";
    case "owner":
      if (fromValue === null) return `Owner set to ${toValue}`;
      if (toValue === null) return `Owner cleared (was ${fromValue})`;
      return `Owner: ${fromValue} → ${toValue}`;
    case "authors":
      if (fromValue === null) return `Credit set to ${toValue}`;
      if (toValue === null) return `Credit cleared (was ${fromValue})`;
      return `Credit: ${fromValue} → ${toValue}`;
    case "elt_org":
      if (fromValue === null) return `Allocated to ${toValue}'s ELT share`;
      if (toValue === null)
        return `ELT allocation cleared (was ${fromValue}'s)`;
      return `ELT share: ${fromValue} → ${toValue}`;
    default:
      return `${toValue === "true" ? "Gate met" : "Gate unmet"}: ${GATE_NAMES[field]}`;
  }
}
