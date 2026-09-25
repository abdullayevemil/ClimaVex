import type { RiskAssessmentProvider, ScenarioImpactProvider } from "./contract";
import { DeterministicImpactProvider } from "./deterministic-provider";
import { DeterministicRiskProvider } from "./risk-provider";

/**
 * Provider selection.
 *
 * `deterministic` is the only accepted value in this phase. The boot check
 * fails loudly on anything else rather than silently falling back, so a
 * half-configured model connector can never be mistaken for a working one.
 */
export type ProviderMode = "deterministic";

export function resolveProviderMode(raw: string | undefined): ProviderMode {
  const mode = (raw ?? "deterministic").trim();
  if (mode !== "deterministic") {
    throw new Error(
      `Unsupported PROVIDER "${mode}". The trained model is not connected in this phase; the only accepted value is "deterministic".`,
    );
  }
  return mode;
}

let impact: ScenarioImpactProvider | null = null;
let risk: RiskAssessmentProvider | null = null;

export function getImpactProvider(): ScenarioImpactProvider {
  resolveProviderMode(process.env.PROVIDER);
  if (!impact) impact = new DeterministicImpactProvider();
  return impact;
}

export function getRiskProvider(): RiskAssessmentProvider {
  resolveProviderMode(process.env.PROVIDER);
  if (!risk) risk = new DeterministicRiskProvider();
  return risk;
}
