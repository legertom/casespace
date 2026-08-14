import "server-only";
import {
  DEPARTMENT_LABELS,
  TARGET_DOCUMENTED,
  TARGET_ROI,
  etDateString,
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
      actual: counts.documented,
      target: TARGET_DOCUMENTED,
      inFlight: counts.inFlight,
      readyForGate: counts.readyForGate,
    },
    confirmedPositiveRoi: {
      actual: counts.confirmedRoi,
      target: TARGET_ROI,
      awaitingRoiConfirmation: counts.byStatus.qualified,
    },
    pipeline: counts.byStatus,
    byEltOrg: elt.map((o) => ({
      name: o.name,
      target: o.target,
      confirmedPositiveRoi: o.confirmedRoi,
      qualifiedAwaitingRoi: o.qualifiedInFlight,
    })),
    teams: coverage.map((t) => ({
      team: t.teamName,
      department: DEPARTMENT_LABELS[t.department],
      leads: t.leads.map((l) => l.name),
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
