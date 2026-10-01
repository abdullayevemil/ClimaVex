import {
  DEMO_DISCLAIMER, IMPACT_CONTRACT_VERSION,
  type RiskAssessmentProvider, type RiskBand, type RiskFactor,
  type RiskRequest, type RiskResponse,
} from "./contract";
import { inputHash } from "./hash";

export const RISK_RULESET_VERSION = "1.0.0";

/**
 * The deterministic risk engine that produces the headline score for bank and
 * insurance users. `TrainedModelRiskProvider` takes the same seat when the ML
 * service is connected, and falls back to this one when it is not.
 *
 * It is a published weighted sum over five observable, farm-specific factors.
 * Nothing here is a black box and nothing is random — a user can read exactly
 * why a farm scored what it scored, which is the property a credit or
 * underwriting file actually needs.
 */
export const WEIGHTS = {
  CROP_MIX_CONCENTRATION: 0.24,
  SHARED_RESOURCE_DEPENDENCE: 0.22,
  REPAYMENT_TIMING_STRESS: 0.28,
  WEATHER_SENSITIVITY: 0.18,
  SINGLE_CROP_DOMINANCE: 0.08,
} as const;

export function bandForScore(score: number): RiskBand {
  if (score < 40) return "LOW";
  if (score < 70) return "MEDIUM";
  return "HIGH";
}

export class DeterministicRiskProvider implements RiskAssessmentProvider {
  readonly providerType = "deterministic-rules" as const;
  readonly providerVersion = RISK_RULESET_VERSION;

  async assess(request: RiskRequest): Promise<RiskResponse> {
    const hash = inputHash(request);

    const factors: RiskFactor[] = [
      ...structuralFactors(request),
      factor(
        "WEATHER_SENSITIVITY",
        "Modelled weather sensitivity",
        WEIGHTS.WEATHER_SENSITIVITY,
        clamp(Math.abs(request.weatherStressPct), 0, 100),
        `Scenario weather reduces modelled yield by ${Math.abs(request.weatherStressPct).toFixed(1)}% across affected sections.`,
      ),
    ];

    const score = scoreOf(factors);

    return {
      contractVersion: IMPACT_CONTRACT_VERSION,
      farmId: request.farmId,
      seasonId: request.seasonId,
      score,
      band: bandForScore(score),
      factors,
      providerType: this.providerType,
      providerVersion: this.providerVersion,
      inputHash: hash,
      disclaimer: DEMO_DISCLAIMER,
      decisionSupportOnly: true,
    };
  }
}

/** The four factors that describe the farm itself, whichever provider supplies the climate. */
export function structuralFactors(request: RiskRequest): RiskFactor[] {
  return [
    factor(
      "CROP_MIX_CONCENTRATION",
      "Crop-mix concentration",
      WEIGHTS.CROP_MIX_CONCENTRATION,
      clamp01(request.cropMixExposedShare) * 100,
      `${pct(request.cropMixExposedShare)} of expected revenue is exposed to the same hazard or sensitive period. Revenue-weighted, not counted by crop.`,
    ),
    factor(
      "SHARED_RESOURCE_DEPENDENCE",
      "Shared-resource dependence",
      WEIGHTS.SHARED_RESOURCE_DEPENDENCE,
      clamp01(request.sharedResourceShare) * 100,
      `${pct(request.sharedResourceShare)} of expected revenue depends on a shared well, pump or canal connection.`,
    ),
    factor(
      "REPAYMENT_TIMING_STRESS",
      "Repayment timing stress",
      WEIGHTS.REPAYMENT_TIMING_STRESS,
      clamp01(request.repaymentStressShare) * 100,
      `Peak modelled funding gap is ${pct(request.repaymentStressShare)} of the season's scheduled repayments. A timing measure, not a loss.`,
    ),
    factor(
      "SINGLE_CROP_DOMINANCE",
      "Single-crop dominance",
      WEIGHTS.SINGLE_CROP_DOMINANCE,
      clamp01(request.topCropShare) * 100,
      `The largest single crop accounts for ${pct(request.topCropShare)} of expected revenue.`,
    ),
  ];
}

export function scoreOf(factors: RiskFactor[]): number {
  return round1(clamp(factors.reduce((sum, f) => sum + f.contribution, 0), 0, 100));
}

export function factor(code: string, label: string, weight: number, value: number, explanation: string): RiskFactor {
  return { code, label, weight, value: round1(value), contribution: round1(value * weight), explanation };
}

function clamp(v: number, lo: number, hi: number): number {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
}

function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

function pct(v: number): string {
  return `${(clamp01(v) * 100).toFixed(1)}%`;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
