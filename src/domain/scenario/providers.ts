import type { ClimateEvidenceSource, RiskAssessmentProvider, ScenarioImpactProvider } from "./contract";
import { DeterministicImpactProvider } from "./deterministic-provider";
import { DeterministicRiskProvider } from "./risk-provider";
import { TrainedModelRiskProvider } from "./trained-risk-provider";

/**
 * Provider selection.
 *
 * `trained-model` connects the risk score to the ClimaVex ML service;
 * `deterministic` runs with no AI service at all. Anything else fails loudly
 * rather than silently falling back, so a mistyped setting can never be
 * mistaken for a working connection.
 */
export type ProviderMode = "deterministic" | "trained-model";

export function resolveProviderMode(raw: string | undefined): ProviderMode {
  const mode = (raw ?? "deterministic").trim();
  if (mode !== "deterministic" && mode !== "trained-model") {
    throw new Error(`Unsupported PROVIDER "${mode}". Accepted values are "deterministic" and "trained-model".`);
  }
  return mode;
}

let impact: ScenarioImpactProvider | null = null;

/**
 * Scenario impact stays rule-based in both modes: the ML service measures and
 * forecasts regional climate, it does not model a crop's yield response to a
 * replayed season, and nothing here pretends otherwise.
 */
export function getImpactProvider(): ScenarioImpactProvider {
  resolveProviderMode(process.env.PROVIDER);
  if (!impact) impact = new DeterministicImpactProvider();
  return impact;
}

export function getRiskProvider(climate: ClimateEvidenceSource): RiskAssessmentProvider {
  return resolveProviderMode(process.env.PROVIDER) === "trained-model"
    ? new TrainedModelRiskProvider(climate)
    : new DeterministicRiskProvider();
}
