import type { MultiPolygonGeometry } from "../geometry/types";
import type { IsoDate } from "../finance/dates";

/**
 * The single versioned boundary between ClimaVex and any predictive engine.
 *
 * Two implementations sit behind it: a transparent rule set, and the ClimaVex
 * ML service, which supplies the climate side of the risk score. Critically, a
 * provider returns *percentage deltas only* — it never produces money, never
 * touches the ledger, and never decides a repayment outcome. Cash-flow
 * arithmetic stays deterministic and independently tested.
 *
 * 1.1.0: a risk request may carry the farm's location, and a response may
 * carry the climate evidence behind its score. Both are additive.
 */
export const IMPACT_CONTRACT_VERSION = "1.1.0" as const;
export const DEMO_DISCLAIMER = "Demo simulation — AI model not connected." as const;
export const RULES_DISCLAIMER =
  "Scenario effects come from a published rule set, not from the AI model." as const;
export const MODEL_DISCLAIMER =
  "Climate factors come from the ClimaVex ML service: a measured climate-stress index and a one-month XGBoost drought forecast. The farm's structural factors are rule-based." as const;

export type ProviderType = "deterministic-rules" | "trained-model";

export type CropStage =
  | "DORMANT" | "SOWING" | "EMERGENCE" | "VEGETATIVE"
  | "FLOWERING" | "GRAIN_FILL" | "MATURITY" | "HARVEST";

export type CropCoefficients = {
  cropCode: string;
  cropName: string;
  isIrrigated: boolean;
  heatThresholdC: number;
  heatPctPerDay: number;
  heatCapPct: number;
  frostThresholdC: number;
  frostPctPerEvent: number;
  waterRequirementMm: number;
  droughtMaxPct: number;
  waterloggingPct: number;
  irrigationPctPerDay: number;
  irrigationCapPct: number;
};

export type StageWindow = { stage: CropStage; start: IsoDate; end: IsoDate; isSensitive: boolean };

export type SectionSnapshot = {
  sectionId: string;
  ordinal: number;
  label: string;
  cropCode: string;
  geometry: MultiPolygonGeometry;
  areaM2: number;
  plantingDate: IsoDate;
  harvestWindow: { start: IsoDate; end: IsoDate };
  expectedSaleDate: IsoDate;
  stages: StageWindow[];
  resourceDependencies: Array<{ resourceId: string; type: string; sharePct: number }>;
};

export type WeatherObservationInput = { date: IsoDate; tMaxC: number; tMinC: number; precipMm: number };

export type ImpactRequest = {
  contractVersion: typeof IMPACT_CONTRACT_VERSION;
  scenarioId: string;
  seasonId: string;
  farm: { id: string; sections: SectionSnapshot[] };
  season: { startDate: IsoDate; endDate: IsoDate };
  scenarioInputs: {
    kind: "BASELINE" | "WEATHER_REPLAY" | "RESOURCE_DISRUPTION";
    weather?: {
      datasetId: string;
      kind: "HISTORICAL_OBSERVED" | "DEMO_SYNTHETIC";
      provenance: string;
      alignment: "CALENDAR_DATE" | "DAY_OF_YEAR" | "ALIGN_TO_PLANTING";
      observations: WeatherObservationInput[];
      missingDates: IsoDate[];
    };
    disruption?: { resourceIds: string[]; startDate: IsoDate; endDate: IsoDate };
  };
  assumptions: { rulesetVersion: string; crops: CropCoefficients[] };
};

export type ImpactFactor = { code: string; label: string; contributionPct: number; explanation: string };

export type AffectedSection = {
  sectionId: string;
  yieldDeltaPct: number;
  revenueDeltaPct: number;
  periods: Array<{ start: IsoDate; end: IsoDate; stage: CropStage }>;
  factors: ImpactFactor[];
};

export type ImpactResponse = {
  contractVersion: typeof IMPACT_CONTRACT_VERSION;
  scenarioId: string;
  affectedSections: AffectedSection[];
  providerType: ProviderType;
  providerVersion: string;
  inputHash: string;
  provenance: { weatherDatasetId?: string; weatherKind?: string; assumptionSources: string[] };
  disclaimer: string;
};

export interface ScenarioImpactProvider {
  readonly providerType: ProviderType;
  readonly providerVersion: string;
  estimate(request: ImpactRequest): Promise<ImpactResponse>;
}

/* ── Risk assessment: the headline output for bank and insurance users ────── */

export type RiskBand = "LOW" | "MEDIUM" | "HIGH";

export type RiskRequest = {
  contractVersion: typeof IMPACT_CONTRACT_VERSION;
  farmId: string;
  seasonId: string;
  sections: Array<SectionSnapshot & { expectedRevenue: string }>;
  /** Revenue share exposed to a single shared hazard or window, 0–1. */
  cropMixExposedShare: number;
  topCropShare: number;
  /** Shared-resource dependence, 0–1 of revenue. */
  sharedResourceShare: number;
  /** Peak modelled funding gap as a share of the season's repayments, 0–1. */
  repaymentStressShare: number;
  weatherStressPct: number;
  /** Farm centroid. Lets a provider look up the climate where the farm actually is. */
  location?: { lat: number; lng: number };
  assumptions: { rulesetVersion: string };
};

/**
 * What the ML service knows about the climate at a farm's location. The index
 * is a measurement and the forecast is a prediction; they are kept apart here
 * because a lender should know which one they are reading.
 */
export type ClimateEvidence = {
  region: { id: string; name: string; distanceKm: number };
  index: {
    /** "YYYY-MM" of the last observed month. */
    asOf: string | null;
    riskScore: number;
    riskLevel: number;
    dominantHazard: string;
    subScores: { drought: number; flood: number; heat: number; soil: number; vegetation: number };
  };
  /** Null when the region has no forecast window. */
  forecast: {
    targetYear: number;
    targetMonth: number;
    /** Root-zone soil-moisture anomaly, in standard deviations from the seasonal normal. */
    currentSoilAnomaly: number;
    predictedSoilAnomaly: number;
    /** The predicted anomaly on the index's 0–100 hazard scale, dry tail only. */
    droughtStress: number;
    direction: string;
    interpretation: string;
    correlation: number | null;
    r2VsClimatology: number | null;
  } | null;
  model: { serviceVersion: string; trainedAt: string | null };
};

export type ClimateEvidenceSource = (location: { lat: number; lng: number }) => Promise<ClimateEvidence>;

export type RiskFactor = { code: string; label: string; weight: number; value: number; contribution: number; explanation: string };

export type RiskResponse = {
  contractVersion: typeof IMPACT_CONTRACT_VERSION;
  farmId: string;
  seasonId: string;
  /** 0–100, higher is riskier. */
  score: number;
  band: RiskBand;
  factors: RiskFactor[];
  providerType: ProviderType;
  providerVersion: string;
  inputHash: string;
  disclaimer: string;
  /** Present when the score used the ML service. */
  climate?: ClimateEvidence;
  /** Why the deterministic rules answered instead of the configured model. */
  fallbackReason?: string;
  /** Deliberately absent: any approve/decline verdict. The bank retains the credit decision. */
  decisionSupportOnly: true;
};

export interface RiskAssessmentProvider {
  readonly providerType: ProviderType;
  readonly providerVersion: string;
  assess(request: RiskRequest): Promise<RiskResponse>;
}
