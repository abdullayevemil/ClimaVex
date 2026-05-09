import type {
  ClimateSnapshot,
  ClimateAlert,
  ClimateAlertTranslation,
  ClimateReport,
  LoanApplication,
  LoanApplicationTranslation,
  LoanDecision,
  LoanApplicationStatus as PrismaLoanApplicationStatus,
  Portfolio,
  PortfolioRegion,
  PortfolioTranslation,
  Region,
  RegionTranslation,
  RiskAssessment,
  RiskAssessmentTranslation,
  RiskLevel as PrismaRiskLevel,
  RegionType as PrismaRegionType,
} from "@prisma/client";
import { dbLocales } from "./i18n";
import type {
  ClimateSnapshotDto,
  ClimateAlertDto,
  Locale,
  ClimateReportDto,
  LoanApplicationDto,
  LoanApplicationStatus,
  LoanDecisionDto,
  PortfolioSummary,
  RegionDetail,
  RegionSummary,
  RiskAssessmentDto,
  RiskLevel,
  RegionType,
} from "./types";

export type RegionWithLatest = Region & {
  translations?: RegionTranslation[];
  portfolioRegions?: PortfolioRegion[];
  climateSnapshots: ClimateSnapshot[];
  riskAssessments: RiskAssessmentWithTranslations[];
};

type RiskAssessmentWithTranslations = RiskAssessment & {
  translations?: RiskAssessmentTranslation[];
};

export type PortfolioWithTranslations = Portfolio & {
  translations?: PortfolioTranslation[];
};

export type LoanApplicationWithRelations = LoanApplication & {
  translations?: LoanApplicationTranslation[];
  region: RegionWithLatest;
  decisions?: LoanDecision[];
  reports?: ClimateReport[];
};

export type ClimateAlertWithRelations = ClimateAlert & {
  translations?: ClimateAlertTranslation[];
  region: Region & {
    translations?: RegionTranslation[];
  };
};

function findTranslation<T extends { locale: string }>(
  translations: T[] | undefined,
  locale: Locale,
) {
  return translations?.find((translation) => translation.locale === dbLocales[locale]);
}

export function serializeClimateSnapshot(
  snapshot: ClimateSnapshot,
): ClimateSnapshotDto {
  return {
    id: snapshot.id,
    regionId: snapshot.regionId,
    date: snapshot.date.toISOString(),
    rainfallMm: snapshot.rainfallMm,
    temperatureC: snapshot.temperatureC,
    soilMoisture: snapshot.soilMoisture,
    vegetationIndex: snapshot.vegetationIndex,
    droughtIndex: snapshot.droughtIndex,
    floodExposure: snapshot.floodExposure,
    createdAt: snapshot.createdAt.toISOString(),
  };
}

export function serializeRiskAssessment(
  assessment: RiskAssessmentWithTranslations,
  locale: Locale,
): RiskAssessmentDto {
  const translation = findTranslation(assessment.translations, locale);

  return {
    id: assessment.id,
    regionId: assessment.regionId,
    assessmentDate: assessment.assessmentDate.toISOString(),
    riskLevel: assessment.riskLevel as PrismaRiskLevel as RiskLevel,
    riskScore: assessment.riskScore,
    droughtRisk: assessment.droughtRisk,
    floodRisk: assessment.floodRisk,
    soilRisk: assessment.soilRisk,
    yieldVolatilityRisk: assessment.yieldVolatilityRisk,
    explanation: translation?.explanation ?? assessment.explanation,
    financialInterpretation:
      translation?.financialInterpretation ?? assessment.financialInterpretation,
    recommendation: translation?.recommendation ?? assessment.recommendation,
    createdAt: assessment.createdAt.toISOString(),
  };
}

export function serializeRegionSummary(
  region: RegionWithLatest,
  locale: Locale,
): RegionSummary {
  const translation = findTranslation(region.translations, locale);

  return {
    id: region.id,
    name: translation?.name ?? region.name,
    type: region.type as PrismaRegionType as RegionType,
    country: translation?.country ?? region.country,
    latitude: region.latitude,
    longitude: region.longitude,
    areaHectares: region.areaHectares,
    cropType: translation?.cropType ?? region.cropType,
    boundaryCoordinates: region.boundaryCoordinates,
    exposureAmount: region.portfolioRegions?.length
      ? region.portfolioRegions.reduce(
          (sum, item) => sum + item.exposureAmount,
          0,
        )
      : null,
    createdAt: region.createdAt.toISOString(),
    latestClimateSnapshot: region.climateSnapshots[0]
      ? serializeClimateSnapshot(region.climateSnapshots[0])
      : null,
    latestRiskAssessment: region.riskAssessments[0]
      ? serializeRiskAssessment(region.riskAssessments[0], locale)
      : null,
  };
}

export function serializeRegionDetail(
  region: RegionWithLatest,
  locale: Locale,
): RegionDetail {
  return {
    ...serializeRegionSummary(region, locale),
    climateSnapshots: region.climateSnapshots.map(serializeClimateSnapshot),
    riskAssessments: region.riskAssessments.map((assessment) =>
      serializeRiskAssessment(assessment, locale),
    ),
  };
}

export function localizePortfolio(
  portfolio: PortfolioWithTranslations,
  locale: Locale,
): Pick<PortfolioSummary, "name" | "institutionName"> {
  const translation = findTranslation(portfolio.translations, locale);

  return {
    name: translation?.name ?? portfolio.name,
    institutionName: translation?.institutionName ?? portfolio.institutionName,
  };
}

export function serializeLoanDecision(decision: LoanDecision): LoanDecisionDto {
  return {
    id: decision.id,
    loanApplicationId: decision.loanApplicationId,
    status:
      decision.status as PrismaLoanApplicationStatus as LoanApplicationStatus,
    maxLtv: decision.maxLtv,
    provisioningRateAdjustment: decision.provisioningRateAdjustment,
    insuranceRequirement: decision.insuranceRequirement,
    note: decision.note,
    decidedBy: decision.decidedBy,
    decidedAt: decision.decidedAt.toISOString(),
    createdAt: decision.createdAt.toISOString(),
  };
}

export function serializeClimateReport(report: ClimateReport): ClimateReportDto {
  return {
    id: report.id,
    loanApplicationId: report.loanApplicationId,
    reportNumber: report.reportNumber,
    generatedBy: report.generatedBy,
    generatedAt: report.generatedAt.toISOString(),
    summary: report.summary,
    dataSourcesAppendix: report.dataSourcesAppendix,
    createdAt: report.createdAt.toISOString(),
  };
}

export function serializeLoanApplication(
  application: LoanApplicationWithRelations,
  locale: Locale,
): LoanApplicationDto {
  const translation = findTranslation(application.translations, locale);

  return {
    id: application.id,
    applicantName: application.applicantName,
    institutionName: application.institutionName,
    cropType: translation?.cropType ?? application.cropType,
    locationLabel: translation?.locationLabel ?? application.region.name,
    areaHectares: application.areaHectares,
    latitude: application.latitude,
    longitude: application.longitude,
    requestedAmount: application.requestedAmount,
    tenorYears: application.tenorYears,
    status:
      application.status as PrismaLoanApplicationStatus as LoanApplicationStatus,
    submittedAt: application.submittedAt.toISOString(),
    region: serializeRegionSummary(application.region, locale),
    latestDecision: application.decisions?.[0]
      ? serializeLoanDecision(application.decisions[0])
      : null,
    latestReport: application.reports?.[0]
      ? serializeClimateReport(application.reports[0])
      : null,
  };
}

export function serializeClimateAlert(
  alert: ClimateAlertWithRelations,
  locale: Locale,
): ClimateAlertDto {
  const translation = findTranslation(alert.translations, locale);
  const regionTranslation = findTranslation(alert.region.translations, locale);

  return {
    id: alert.id,
    regionId: alert.regionId,
    regionName: regionTranslation?.name ?? alert.region.name,
    severity: alert.severity as PrismaRiskLevel as RiskLevel,
    title: translation?.title ?? alert.title,
    triggerType: translation?.triggerType ?? alert.triggerType,
    message: translation?.message ?? alert.message,
    exposureAmount: alert.exposureAmount,
    affectedLoans: alert.affectedLoans,
    status: alert.status,
    createdAt: alert.createdAt.toISOString(),
  };
}
