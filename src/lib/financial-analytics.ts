import { getRiskLevel } from "./risk-scoring";
import type { RegionDetail, RiskLevel } from "./types";

export type FinancialImpactEstimate = {
  exposureAmount: number;
  expectedLoss: number;
  capitalBuffer: number;
  premiumUplift: number;
  yieldRevenueAtRisk: number;
  liquidityStress: number;
  impactRate: number;
};

export type ScenarioId = "base" | "dry" | "flood" | "mitigation";

export type ScenarioProjection = {
  id: ScenarioId;
  month: number;
  riskScore: number;
  expectedLoss: number;
  riskLevel: RiskLevel;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const round = (value: number) => Math.round(value * 10) / 10;

export function getRegionExposure(region: RegionDetail | null) {
  if (!region) return 0;

  return region.exposureAmount ?? region.areaHectares * 190;
}

export function calculateFinancialImpact(
  region: RegionDetail | null,
): FinancialImpactEstimate | null {
  const assessment = region?.latestRiskAssessment;
  if (!region || !assessment) return null;

  const exposureAmount = getRegionExposure(region);
  const riskRatio = assessment.riskScore / 100;
  const yieldRatio = assessment.yieldVolatilityRisk / 100;
  const droughtRatio = assessment.droughtRisk / 100;
  const floodRatio = assessment.floodRisk / 100;
  const impactRate = 0.035 + riskRatio * 0.2;

  return {
    exposureAmount,
    expectedLoss: exposureAmount * impactRate,
    capitalBuffer: exposureAmount * (0.018 + riskRatio * 0.095),
    premiumUplift: exposureAmount * (0.005 + riskRatio * 0.027),
    yieldRevenueAtRisk: exposureAmount * yieldRatio * 0.24,
    liquidityStress:
      exposureAmount * (droughtRatio * 0.055 + floodRatio * 0.04),
    impactRate,
  };
}

export function buildScenarioProjections(
  region: RegionDetail | null,
): ScenarioProjection[] {
  const assessment = region?.latestRiskAssessment;
  if (!region || !assessment) return [];

  const exposureAmount = getRegionExposure(region);
  const droughtPressure = assessment.droughtRisk / 100;
  const floodPressure = assessment.floodRisk / 100;
  const soilPressure = assessment.soilRisk / 100;

  const scenarios: Array<{
    id: ScenarioId;
    monthlyDelta: number;
    shock: number;
  }> = [
    {
      id: "base",
      monthlyDelta: 0.6 + soilPressure * 0.35,
      shock: 0,
    },
    {
      id: "dry",
      monthlyDelta: 1.15 + droughtPressure * 1.55,
      shock: 3.5 + droughtPressure * 9,
    },
    {
      id: "flood",
      monthlyDelta: 0.9 + floodPressure * 1.65,
      shock: 2.5 + floodPressure * 11,
    },
    {
      id: "mitigation",
      monthlyDelta: -0.75 - Math.min(0.9, soilPressure * 0.65),
      shock: -2.5,
    },
  ];

  return scenarios.flatMap((scenario) =>
    [0, 3, 6, 9, 12].map((month) => {
      const riskScore = round(
        clamp(
          assessment.riskScore +
            scenario.shock +
            scenario.monthlyDelta * month +
            Math.sin(month / 3) * 1.4,
        ),
      );
      const riskRatio = riskScore / 100;
      const expectedLoss = exposureAmount * (0.035 + riskRatio * 0.2);

      return {
        id: scenario.id,
        month,
        riskScore,
        expectedLoss,
        riskLevel: getRiskLevel(riskScore),
      };
    }),
  );
}
