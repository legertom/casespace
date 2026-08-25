import "server-only";
import {
  countsTowardRoi,
  documentedGatesComplete,
  roiGaps,
} from "@/lib/domain";
import type { UseCaseRow } from "./use-case-queries";

/** Public API shape for a use case — counts and rates only, never dollars. */
export function toApiUseCase(uc: UseCaseRow) {
  return {
    id: uc.id,
    title: uc.title,
    description: uc.description,
    status: uc.status,
    confirmedPositiveRoi: countsTowardRoi(uc.status),
    /**
     * Whether this record counts toward the 45 and the 15. Anyone at Clever
     * can log one; records logged by an AI Lead are in the program, and
     * everything else — employees and admins alike — is a community
     * submission until an admin says otherwise. This collection returns
     * both — /api/v1/progress counts only the former.
     */
    inProgram: uc.inProgram,
    department: uc.department,
    team: uc.teamName,
    eltOrg: uc.eltOrgName,
    owner: uc.ownerName,
    authors: uc.authors.map((a) => a.displayName),
    aiTools: uc.aiTools,
    /** Where to find the thing itself. Distinct from related workflows. */
    urls: uc.urls.map((u) => ({ kind: u.kind, label: u.label, url: u.url })),
    approaches: uc.approaches,
    /** @deprecated Singular until 2026-08-14; first of `approaches` for one release. */
    approach: uc.approaches[0] ?? null,
    source: uc.source,
    currentSteps: uc.currentSteps,
    ratings: {
      frequency: uc.ratingFrequency,
      pain: uc.ratingPain,
      dataAvailability: uc.ratingDataAvailability,
      risk: uc.ratingRisk,
      ownershipClarity: uc.ratingOwnershipClarity,
      evaluationClarity: uc.ratingEvaluationClarity,
      maintenanceBurden: uc.ratingMaintenanceBurden,
    },
    functionalLeaderSuccess: uc.functionalLeaderSuccess,
    gates: {
      named: uc.gateNamed,
      tool: uc.gateTool,
      adoption: uc.gateAdoption,
      adoptionEvidence: uc.adoptionEvidence,
      owner: uc.gateOwner,
      allFourMet: documentedGatesComplete(uc),
    },
    successCriterion: uc.successCriterion,
    successCriterionMet: uc.successCriterionMet,
    roi: {
      status: uc.roiStatus,
      /** Self-reported estimate of hours spent building; never gates anything. */
      buildHours: uc.buildHours,
      baselineMetric: uc.baselineMetric,
      baselineValue: uc.baselineValue,
      baselineUnit: uc.baselineUnit,
      postValue: uc.postValue,
      measurementMethod: uc.measurementMethod,
      netImpactStatement: uc.netImpactStatement,
      isPositive: uc.isPositive,
      revisitOn: uc.revisitOn,
      gapsToConfirmation: roiGaps(uc),
    },
    rejectionReason: uc.rejectionReason,
    createdAt: uc.createdAt,
    updatedAt: uc.updatedAt,
  };
}
