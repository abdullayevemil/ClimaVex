import {
  IMPACT_CONTRACT_VERSION, MODEL_DISCLAIMER,
  type ClimateEvidence, type ClimateEvidenceSource, type RiskAssessmentProvider,
  type RiskFactor, type RiskRequest, type RiskResponse,
} from "./contract";
import { inputHash } from "./hash";
import { DeterministicRiskProvider, WEIGHTS, bandForScore, factor, scoreOf, structuralFactors } from "./risk-provider";

/**
 * How the weather weight is shared between what was measured and what is
 * forecast. The measurement gets the larger share: the forecast explains about
 * a fifth of the variance a seasonal normal leaves, and a lender should not be
 * moved further by it than its skill supports.
 */
// ponytail: a fixed split chosen here, not fitted. Fit it once there are observed losses to fit against.
const FORECAST_SHARE = 0.4;
// Rounded so a published weight reads 0.108, not 0.10799999999999998.
const FORECAST_WEIGHT = Math.round(WEIGHTS.WEATHER_SENSITIVITY * FORECAST_SHARE * 1000) / 1000;
const MEASURED_WEIGHT = Math.round((WEIGHTS.WEATHER_SENSITIVITY - FORECAST_WEIGHT) * 1000) / 1000;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The risk provider backed by the ClimaVex ML service.
 *
 * The farm's own structure — crop mix, shared resources, repayment timing — is
 * still read straight off the twin, because that is knowledge the model does
 * not have. What the model replaces is the weather term, which the rule set
 * could only ever leave at zero: it becomes the measured climate-stress index
 * for the farm's region plus the one-month drought forecast.
 *
 * If the service cannot answer, the deterministic rules answer instead and say
 * why. A lender never gets a blank panel, and never gets a rule-based score
 * presented as a model's.
 */
export class TrainedModelRiskProvider implements RiskAssessmentProvider {
  readonly providerType = "trained-model" as const;
  readonly providerVersion = "ml-service";
  private readonly fallback = new DeterministicRiskProvider();

  constructor(private readonly climateFor: ClimateEvidenceSource) {}

  async assess(request: RiskRequest): Promise<RiskResponse> {
    let climate: ClimateEvidence;
    try {
      if (!request.location) throw new Error("The farm has no location to look the climate up for.");
      climate = await this.climateFor(request.location);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "The ML service could not be reached.";
      return {
        ...(await this.fallback.assess(request)),
        disclaimer: `AI model unavailable — showing the rule-based score instead. ${reason}`,
        fallbackReason: reason,
      };
    }

    const factors = [...structuralFactors(request), ...climateFactors(climate)];
    const score = scoreOf(factors);

    return {
      contractVersion: IMPACT_CONTRACT_VERSION,
      farmId: request.farmId,
      seasonId: request.seasonId,
      score,
      band: bandForScore(score),
      factors,
      providerType: this.providerType,
      // The model's training date is part of the version: a retrained model is
      // a different provider as far as a stored, auditable result is concerned.
      providerVersion: `${climate.model.serviceVersion}+${(climate.model.trainedAt ?? "untrained").slice(0, 10)}`,
      // The evidence is hashed with the request, so next month's observations
      // produce a new stored run instead of silently matching this one.
      inputHash: inputHash({ request, climate }),
      disclaimer: MODEL_DISCLAIMER,
      climate,
      decisionSupportOnly: true,
    };
  }
}

function climateFactors(climate: ClimateEvidence): RiskFactor[] {
  const { index, forecast, region } = climate;
  const where = `${region.name} (${region.distanceKm.toFixed(0)} km from the farm)`;
  const measured = factor(
    "CLIMATE_STRESS_INDEX",
    "Measured climate stress",
    forecast ? MEASURED_WEIGHT : WEIGHTS.WEATHER_SENSITIVITY,
    index.riskScore,
    `Climate-stress index ${index.riskScore.toFixed(1)}/100 for ${where}, as of ${index.asOf ?? "the last observed month"}. Measured from Sentinel-2 NDVI and ERA5 reanalysis against the region's own climatology; dominant hazard: ${index.dominantHazard}.`,
  );
  if (!forecast) return [measured];

  const sigma = forecast.predictedSoilAnomaly;
  return [
    measured,
    factor(
      "DROUGHT_FORECAST",
      "Forecast drought stress",
      FORECAST_WEIGHT,
      forecast.droughtStress,
      `XGBoost forecasts root-zone soil moisture at ${sigma >= 0 ? "+" : ""}${sigma.toFixed(2)}σ from normal for ${MONTHS[forecast.targetMonth - 1]} ${forecast.targetYear} (${forecast.direction}). ${forecast.interpretation}${
        forecast.correlation == null ? "" : ` Held-out correlation ${forecast.correlation.toFixed(2)}.`
      }`,
    ),
  ];
}
