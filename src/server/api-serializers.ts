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
    department: uc.department,
    team: uc.teamName,
    eltOrg: uc.eltOrgName,
    owner: uc.ownerName,
    authors: uc.authors.map((a) => a.displayName),
    aiTools: uc.aiTools,
    approach: uc.approach,
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
