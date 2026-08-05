import "server-only";
import {
  DEPARTMENT_LABELS,
  TARGET_DOCUMENTED,
  TARGET_ROI,
  etDateString,
  paceSummary,
} from "@/lib/domain";
import {
  getAttentionFlags,
  getEltProgress,
  getProgramCounts,
  getTeamCoverage,
} from "./dashboard-queries";

/** The scoreboard payload shared by the Coach, REST, and MCP surfaces. */
export async function buildProgressReport() {
  const [counts, elt, coverage, attention] = await Promise.all([
    getProgramCounts(),
    getEltProgress(),
    getTeamCoverage(),
    getAttentionFlags(),
  ]);
  const today = etDateString(new Date());
  return {
    asOf: today,
    documented: {
      actual: counts.qualified,
      target: TARGET_DOCUMENTED,
      pace: paceSummary(TARGET_DOCUMENTED, counts.qualified, today).sentence,
    },
    qualifiedPlus: {
      actual: counts.qualifiedPlus,
      target: TARGET_ROI,
      pace: paceSummary(TARGET_ROI, counts.qualifiedPlus, today, "at Qualified+")
        .sentence,
    },
    pipeline: counts.byStatus,
    byEltOrg: elt.map((o) => ({
      name: o.name,
      target: o.target,
      qualifiedPlus: o.qualifiedPlus,
      qualifiedAwaitingRoi: o.qualifiedInFlight,
    })),
    teams: coverage.map((t) => ({
      team: t.teamName,
      department: DEPARTMENT_LABELS[t.department],
      leads: t.leadNames,
      logged: t.useCaseCount,
      targetTwoPerLead: t.target,
    })),
    attention: {
      staleDays: attention.staleDays,
      sittingStill: attention.stale,
      launchedUnscored: attention.launchedUnscored,
    },
  };
}
