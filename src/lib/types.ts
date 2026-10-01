export type RegionType = "FARM" | "DISTRICT" | "PORTFOLIO";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Locale = "en" | "az" | "tr";
export type LoanApplicationStatus =
  | "PENDING_REVIEW"
  | "UNDER_REVIEW"
  | "APPROVED_WITH_CONDITIONS"
  | "DECLINED";

export type RegionSummary = {
  id: string;
  name: string;
  type: RegionType;
  country: string;
  latitude: number;
  longitude: number;
  areaHectares: number;
  cropType: string;
  boundaryCoordinates: string | null;
  exposureAmount: number | null;
  createdAt: string;
  latestClimateSnapshot: ClimateSnapshotDto | null;
  latestRiskAssessment: RiskAssessmentDto | null;
};

export type RegionDetail = RegionSummary & {
  riskAssessments: RiskAssessmentDto[];
  climateSnapshots: ClimateSnapshotDto[];
};

export type ClimateSnapshotDto = {
  id: string;
  regionId: string;
  date: string;
  rainfallMm: number;
  temperatureC: number;
  soilMoisture: number;
  vegetationIndex: number;
  droughtIndex: number;
  floodExposure: number;
  createdAt: string;
};

export type RiskAssessmentDto = {
  id: string;
  regionId: string;
  assessmentDate: string;
  riskLevel: RiskLevel;
  riskScore: number;
  droughtRisk: number;
  floodRisk: number;
  soilRisk: number;
  yieldVolatilityRisk: number;
  explanation: string;
  financialInterpretation: string;
  recommendation: string;
  createdAt: string;
};

export type RegionHistoryPoint = {
  date: string;
  rainfallMm: number;
  temperatureC: number;
  soilMoisture: number;
  vegetationIndex: number;
  droughtIndex: number;
  floodExposure: number;
  riskScore: number | null;
  riskLevel: RiskLevel | null;
};

export type PortfolioSummary = {
  id: string;
  name: string;
  institutionName: string;
  totalExposure: number;
  weightedAverageRisk: number;
  riskCounts: Record<RiskLevel, number>;
  topRiskyRegions: Array<{
    id: string;
    name: string;
    cropType: string;
    exposureAmount: number;
    riskScore: number;
    riskLevel: RiskLevel;
  }>;
};

export type FactorContribution = {
  id: "drought" | "temperature" | "soil" | "flood" | "vegetation";
  label: string;
  value: number;
  explanation: string;
};

export type LongRangeProjection = {
  scenario: "SSP1-2.6" | "SSP2-4.5" | "SSP5-8.5";
  year: 2026 | 2030 | 2050;
  score5: number;
  /** Absent for model projections: a 4-model ensemble mean carries no interval. */
  confidenceLow?: number;
  confidenceHigh?: number;
  riskLevel: RiskLevel;
  droughtFrequencyMultiplier?: number;
  note: string;
};

export type CreditRecommendation = {
  baselineLtv: number;
  recommendedLtv: number;
  provisioningRateIncrease: number;
  insuranceRequirement: string;
  summary: string;
};

export type DataSourceSignal = {
  label: string;
  window: string;
  value: string;
  mode: string;
};

export type LoanReviewResult = {
  riskScore: number;
  score5: number;
  riskLevel: RiskLevel;
  displayLevel: string;
  modelMode: string;
  latencyMs: number;
  factorContributions: FactorContribution[];
  projections: LongRangeProjection[];
  creditRecommendation: CreditRecommendation;
  dataSources: DataSourceSignal[];
};

export type LoanDecisionDto = {
  id: string;
  loanApplicationId: string;
  status: LoanApplicationStatus;
  maxLtv: number;
  provisioningRateAdjustment: number;
  insuranceRequirement: string;
  note: string;
  decidedBy: string;
  decidedAt: string;
  createdAt: string;
};

export type ClimateReportDto = {
  id: string;
  loanApplicationId: string;
  reportNumber: string;
  generatedBy: string;
  generatedAt: string;
  summary: string;
  dataSourcesAppendix: string;
  createdAt: string;
};

export type LoanApplicationDto = {
  id: string;
  applicantName: string;
  institutionName: string;
  cropType: string;
  locationLabel: string;
  areaHectares: number;
  latitude: number;
  longitude: number;
  requestedAmount: number;
  tenorYears: number;
  status: LoanApplicationStatus;
  submittedAt: string;
  region: RegionSummary;
  latestDecision: LoanDecisionDto | null;
  latestReport: ClimateReportDto | null;
};

export type ClimateAlertDto = {
  id: string;
  regionId: string;
  regionName: string;
  severity: RiskLevel;
  title: string;
  triggerType: string;
  message: string;
  exposureAmount: number;
  affectedLoans: number;
  status: string;
  createdAt: string;
};

export type WorkflowSummary = {
  user: {
    name: string;
    role: string;
    institutionName: string;
    authProvider: string;
    licenseTier: string;
    loginTime: string;
  };
  portfolio: {
    activeLoans: number;
    pendingApplications: number;
    overnightAlerts: number;
    weightedAverageRisk: number;
    totalExposure: number;
  };
  pendingApplications: LoanApplicationDto[];
  alerts: ClimateAlertDto[];
};
