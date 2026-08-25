import "server-only";
import {
  DEPARTMENT_LABELS,
  TARGET_DOCUMENTED,
  TARGET_ROI,
  etDateString,
} from "@/lib/domain";
import {
  getAttentionFlags,
  getCommunitySubmissions,
  getEltProgress,
  getProgramCounts,
  getTeamCoverage,
} from "./dashboard-queries";

/** The scoreboard payload shared by the Coach, REST, and MCP surfaces. */
export async function buildProgressReport() {
  const [counts, elt, coverage, attention, community] = await Promise.all([
    getProgramCounts(),
    getEltProgress(),
    getTeamCoverage(),
    getAttentionFlags(),
    getCommunitySubmissions(0),
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
    /**
     * Records logged outside the program — counted here and nowhere else in
     * this payload. Every other number above is program-only, and without this
     * field the exclusion is invisible: an admin comparing `pipeline` against
     * the casebook's row count would see a gap with no explanation. One
     * integer, deliberately not a parallel scoreboard — no target applies.
     */
    community: { logged: community.total },
  };
}
