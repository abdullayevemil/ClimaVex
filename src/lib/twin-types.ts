import type { ArealGeometry } from "@/domain/geometry/types";
import type { ClimateEvidence } from "@/domain/scenario/contract";

export type Area = { m2: number; hectares: number; dekar: number };

export type SessionUserDto = {
  id: string; email: string; name: string;
  role: "FARMER" | "BANK_USER" | "INSURER" | "ADMIN";
  organisation: string | null; locale: string; isDemo: boolean;
};

export type FarmListItemDto = {
  id: string; name: string; centroid: { lat: number; lng: number }; area: Area;
  isDemo: boolean; verificationStatus: string; geometrySource: string;
  il: string | null; ilce: string | null;
  borrower: { id: string; name: string } | null;
  parcelRefs: string[]; sectionCount: number;
};

export type CropDto = {
  id: string; code: string; nameEn: string; nameTr: string; colorHex: string; isIrrigated: boolean;
  assumption: { yieldTPerHa: string; priceTryPerT: string; costTryPerHa: string; source: string; isDemoAssumption: boolean } | null;
};

export type SectionDto = {
  id: string; ordinal: number; label: string; geometry: ArealGeometry; area: Area;
  shareOfFarm: number; isMultipart: boolean; parcelId: string | null;
  crop: { id: string; code: string; nameEn: string; nameTr: string; colorHex: string; isIrrigated: boolean };
  plantingDate: string; harvestWindowStart: string; harvestWindowEnd: string; expectedSaleDate: string;
  yieldTPerHa: string; priceTryPerT: string; costTryPerHa: string;
  resources: Array<{ linkId: string; resourceId: string; name: string; type: string; sharePct: number }>;
};

export type ParcelDto = {
  id: string; ada: number; parsel: number; compact: string; full: string;
  il: string; ilce: string; mahalleKoy: string; originalInput: string;
  officialAreaM2: number | null; computedArea: Area; verificationStatus: string;
};

export type SeasonDto = { id: string; name: string; startDate: string; endDate: string; isActive: boolean };

export type LoanDto = {
  id: string; reference: string; principal: string; outstandingPrincipal: string;
  interestRatePct: string; startDate: string; endDate: string; createdByRole: string | null;
  schedule: Array<{ id: string; sequence: number; dueDate: string; amount: string }>;
};

export type PolicyDto = {
  id: string; provider: string; eligibleHazards: string[]; coverageLimit: string; deductible: string;
  assumedEligibility: boolean; payoutLagDays: number; isDemoAssumption: boolean; source: string; createdByRole: string | null;
};

export type FarmDetailDto = {
  id: string; name: string; description: string | null; il: string | null; ilce: string | null;
  geometry: ArealGeometry; area: Area; centroid: { lat: number; lng: number };
  geometrySource: string; verificationStatus: string; isDemo: boolean; version: number;
  owner: { id: string; name: string }; borrower: { id: string; name: string; institutionName: string | null } | null;
  parcels: ParcelDto[]; seasons: SeasonDto[]; activeSeasonId: string | null;
  sections: SectionDto[]; loans: LoanDto[]; insurancePolicies: PolicyDto[];
};

export type AccessDto = {
  isOwner: boolean; canWriteTwin: boolean; canWriteFinance: boolean; canRunScenario: boolean; role: string;
};

export type RepaymentRowDto = {
  date: string; loanId: string | null; label: string; due: string; carriedIn: string;
  required: string; available: string; paid: string; shortfall: string; carriedOut: string;
};

export type LedgerDto = {
  days: Array<{ date: string; inflows: string; outflows: string; closingBalance: string; events: Array<{ kind: string; label: string; amount: string }> }>;
  repayments: RepaymentRowDto[];
  totalInflows: string; totalOutflows: string; totalRepaid: string;
  closingDeficit: string; closingBalance: string; peakShortfall: string; totalShortfall: string;
  seasonStart: string; seasonEnd: string; eventCount: number;
};

export type RiskFactorDto = { code: string; label: string; weight: number; value: number; contribution: number; explanation: string };

export type AssessmentDto = {
  assessment: {
    farmId: string; seasonId: string; score: number; band: "LOW" | "MEDIUM" | "HIGH";
    factors: RiskFactorDto[]; providerType: string; providerVersion: string; inputHash: string;
    disclaimer: string; decisionSupportOnly: true;
    climate?: ClimateEvidence; fallbackReason?: string;
  };
  runId: string;
  exposure: CropMixDto;
  ledger: LedgerDto;
  disclaimer: string;
  note: string;
};

export type CropMixDto = {
  exposedShare: number; exposedRevenue: string; totalRevenue: string;
  affectedSections: Array<{ sectionId: string; label: string; cropName: string; expectedRevenue: string; shareOfTotal: number }>;
  cropConcentration: Array<{ cropCode: string; cropName: string; revenue: string; share: number }>;
  topCropShare: number; sectionCount: number; cropCount: number;
};

export type SubdivisionPreviewDto = {
  sections: Array<{ ordinal: number; label: string; geometry: ArealGeometry; areaM2: number; isMultipart: boolean; area: Area }>;
  report: {
    parentAreaM2: number; sectionsAreaM2: number; gapM2: number; maxOverlapM2: number;
    maxEqualAreaDeviationRel: number; areaConserved: boolean; withinEqualAreaTolerance: boolean;
    noOverlaps: boolean; parentArea: Area;
  };
};

export type ResourceDto = {
  id: string; name: string; type: "WELL" | "PUMP" | "CANAL_CONNECTION";
  geometry: { type: "Point" | "LineString"; coordinates: number[] | number[][] };
  capacityLpm: number | null; isDemo: boolean;
  links: Array<{ linkId: string; sectionId: string; sectionLabel: string; farmId: string; farmName: string; borrower: { id: string; name: string } | null; sharePct: number }>;
  distinctFarms: number; distinctBorrowers: number;
};

export type ScenarioDto = {
  id: string; name: string; kind: string; dateAlignment: string;
  weatherDataset: { id: string; name: string; kind: string; provenance: string } | null;
  latestRunId: string | null; createdAt: string;
};

export type WeatherDatasetDto = {
  id: string; name: string; kind: string; provenance: string; attribution: string;
  license: string; startDate: string; endDate: string;
};

export type ScenarioRunDto = {
  runId: string; reused: boolean;
  impact: {
    affectedSections: Array<{ sectionId: string; yieldDeltaPct: number; revenueDeltaPct: number; factors: Array<{ code: string; label: string; contributionPct: number; explanation: string }>; periods: Array<{ start: string; end: string; stage: string }> }>;
    providerType: string; providerVersion: string; inputHash: string;
    provenance: { weatherDatasetId?: string; weatherKind?: string; assumptionSources: string[] };
    disclaimer: string;
  };
  financial: {
    baselineRevenue: string; scenarioRevenue: string; assessedLoss: string;
    payouts: Array<{ policyId: string; hazard: string; eligible: boolean; ineligibleReason: string | null; assessedLoss: string; deductibleApplied: string; cappedByLimit: boolean; payout: string; payoutDate: string | null; isDemoAssumption: boolean; source: string }>;
    baseline: LedgerDto; scenario: LedgerDto; exposure: CropMixDto; hazard: string;
  };
  disclaimer: string; note: string;
};

export type ResourceExposureDto = {
  resourceId: string; resourceName: string;
  sections: Array<{ sectionId: string; sectionLabel: string; farmId: string; farmName: string; borrowerId: string; borrowerName: string; loanId: string | null; loanReference: string | null; outstandingPrincipal: string | null }>;
  distinctSections: number; distinctFarms: number; distinctBorrowers: number; distinctLoans: number;
  totalOutstanding: string;
  loans: Array<{ loanId: string; loanReference: string; borrowerName: string; outstandingPrincipal: string; sectionCount: number }>;
};
