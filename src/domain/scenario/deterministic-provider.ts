import {
  DEMO_DISCLAIMER, IMPACT_CONTRACT_VERSION,
  type AffectedSection, type CropCoefficients, type ImpactFactor,
  type ImpactRequest, type ImpactResponse, type ScenarioImpactProvider,
  type SectionSnapshot, type WeatherObservationInput,
} from "./contract";
import { inputHash } from "./hash";
import { addDays, diffDays, eachDay, type IsoDate } from "../finance/dates";

export const RULESET_VERSION = "1.0.0";

/**
 * Transparent, deterministic impact rules standing in for the trained model.
 *
 * Every coefficient comes from the crop catalogue in the database and is
 * surfaced in the UI as an editable demo assumption. There is no randomness,
 * no clock read, and no arbitrary risk score — identical inputs and ruleset
 * version always produce identical output, which is what makes a scenario run
 * reproducible and auditable.
 */
export class DeterministicImpactProvider implements ScenarioImpactProvider {
  readonly providerType = "deterministic-rules" as const;
  readonly providerVersion = RULESET_VERSION;

  async estimate(request: ImpactRequest): Promise<ImpactResponse> {
    const hash = inputHash(request);
    const cropIndex = new Map(request.assumptions.crops.map((c) => [c.cropCode, c]));

    const affectedSections: AffectedSection[] = [];

    for (const section of request.farm.sections) {
      const crop = cropIndex.get(section.cropCode);
      if (!crop) continue;

      const factors: ImpactFactor[] = [];
      const periods: AffectedSection["periods"] = [];

      if (request.scenarioInputs.weather) {
        const aligned = alignObservations(
          request.scenarioInputs.weather.observations,
          request.scenarioInputs.weather.alignment,
          section,
          request.season.startDate,
        );
        collectWeatherFactors(section, crop, aligned, factors, periods);
      }

      if (request.scenarioInputs.disruption) {
        collectDisruptionFactors(section, crop, request.scenarioInputs.disruption, factors, periods);
      }

      if (factors.length === 0) continue;

      const totalPct = clamp(
        factors.reduce((sum, f) => sum + f.contributionPct, 0),
        -100,
        0,
      );

      affectedSections.push({
        sectionId: section.sectionId,
        yieldDeltaPct: round2(totalPct),
        // v1.0.0 assumes no price elasticity: revenue moves with yield.
        // Stated explicitly in the interface rather than hidden here.
        revenueDeltaPct: round2(totalPct),
        periods: dedupePeriods(periods),
        factors: factors.map((f) => ({ ...f, contributionPct: round2(f.contributionPct) })),
      });
    }

    affectedSections.sort((a, b) => a.sectionId.localeCompare(b.sectionId));

    return {
      contractVersion: IMPACT_CONTRACT_VERSION,
      scenarioId: request.scenarioId,
      affectedSections,
      providerType: this.providerType,
      providerVersion: this.providerVersion,
      inputHash: hash,
      provenance: {
        weatherDatasetId: request.scenarioInputs.weather?.datasetId,
        weatherKind: request.scenarioInputs.weather?.kind,
        assumptionSources: [`ruleset ${request.assumptions.rulesetVersion}`],
      },
      disclaimer: DEMO_DISCLAIMER,
    };
  }
}

/**
 * Map a weather sequence onto this season's crop calendar.
 *
 * Three alignments, because replaying a past season against a current layout
 * is ambiguous and the ambiguity should be the user's choice, not a hidden
 * default: keep real calendar dates; match day-of-year; or shift the sequence
 * so its start lines up with this section's planting date.
 */
function alignObservations(
  observations: WeatherObservationInput[],
  alignment: "CALENDAR_DATE" | "DAY_OF_YEAR" | "ALIGN_TO_PLANTING",
  section: SectionSnapshot,
  seasonStart: IsoDate,
): Map<IsoDate, WeatherObservationInput> {
  const map = new Map<IsoDate, WeatherObservationInput>();
  if (observations.length === 0) return map;

  const sorted = [...observations].sort((a, b) => (a.date < b.date ? -1 : 1));
  const first = sorted[0].date;

  let offset = 0;
  if (alignment === "ALIGN_TO_PLANTING") offset = diffDays(section.plantingDate, first);
  else if (alignment === "DAY_OF_YEAR") offset = diffDays(seasonStart, first);

  for (const obs of sorted) {
    map.set(offset === 0 ? obs.date : addDays(obs.date, offset), obs);
  }
  return map;
}

function collectWeatherFactors(
  section: SectionSnapshot,
  crop: CropCoefficients,
  weather: Map<IsoDate, WeatherObservationInput>,
  factors: ImpactFactor[],
  periods: AffectedSection["periods"],
): void {
  const sensitiveStages = section.stages.filter((s) => s.isSensitive);
  if (sensitiveStages.length === 0) return;

  let heatDays = 0;
  let frostEvents = 0;
  let rainfallMm = 0;
  let observedDays = 0;

  for (const stage of sensitiveStages) {
    for (const day of eachDay(stage.start, stage.end)) {
      const obs = weather.get(day);
      // A missing observation is skipped, never imputed. Silent interpolation
      // would fabricate weather that never happened.
      if (!obs) continue;
      observedDays += 1;
      if (obs.tMaxC > crop.heatThresholdC) heatDays += 1;
      if (obs.tMinC < crop.frostThresholdC) frostEvents += 1;
      rainfallMm += obs.precipMm;
    }
  }

  if (observedDays === 0) return;

  for (const stage of sensitiveStages) periods.push({ start: stage.start, end: stage.end, stage: stage.stage });

  if (heatDays > 0) {
    const pct = -Math.min(heatDays * crop.heatPctPerDay, crop.heatCapPct);
    factors.push({
      code: "HEAT_STRESS",
      label: "Heat stress in sensitive window",
      contributionPct: pct,
      explanation: `${heatDays} day(s) above ${crop.heatThresholdC}°C during a sensitive stage, at ${crop.heatPctPerDay}% per day capped at ${crop.heatCapPct}%.`,
    });
  }

  if (frostEvents > 0) {
    const pct = -(frostEvents * crop.frostPctPerEvent);
    factors.push({
      code: "FROST",
      label: "Frost event in sensitive window",
      contributionPct: pct,
      explanation: `${frostEvents} day(s) below ${crop.frostThresholdC}°C during a sensitive stage, at ${crop.frostPctPerEvent}% per event.`,
    });
  }

  const requirement = crop.waterRequirementMm;
  const dryThreshold = requirement * 0.6;
  const wetThreshold = requirement * 1.8;

  if (rainfallMm < dryThreshold) {
    const ratio = requirement > 0 ? rainfallMm / dryThreshold : 1;
    const pct = -((1 - ratio) * crop.droughtMaxPct);
    factors.push({
      code: "WATER_DEFICIT",
      label: "Water deficit",
      contributionPct: pct,
      explanation: `${rainfallMm.toFixed(0)} mm fell during sensitive stages against a ${dryThreshold.toFixed(0)} mm threshold (60% of the ${requirement} mm requirement).`,
    });
  } else if (rainfallMm > wetThreshold) {
    factors.push({
      code: "EXCESS_RAIN",
      label: "Waterlogging",
      contributionPct: -crop.waterloggingPct,
      explanation: `${rainfallMm.toFixed(0)} mm exceeded the ${wetThreshold.toFixed(0)} mm waterlogging threshold.`,
    });
  }
}

function collectDisruptionFactors(
  section: SectionSnapshot,
  crop: CropCoefficients,
  disruption: { resourceIds: string[]; startDate: IsoDate; endDate: IsoDate },
  factors: ImpactFactor[],
  periods: AffectedSection["periods"],
): void {
  const affected = section.resourceDependencies.filter((d) => disruption.resourceIds.includes(d.resourceId));
  if (affected.length === 0 || !crop.isIrrigated) return;

  const sensitiveStages = section.stages.filter((s) => s.isSensitive);
  let disruptedDays = 0;

  for (const stage of sensitiveStages) {
    for (const day of eachDay(stage.start, stage.end)) {
      if (day >= disruption.startDate && day <= disruption.endDate) disruptedDays += 1;
    }
    periods.push({ start: stage.start, end: stage.end, stage: stage.stage });
  }

  if (disruptedDays === 0) return;

  const share = Math.min(affected.reduce((s, d) => s + d.sharePct, 0), 100) / 100;
  const pct = -Math.min(disruptedDays * crop.irrigationPctPerDay * share, crop.irrigationCapPct);

  factors.push({
    code: "RESOURCE_DISRUPTION",
    label: "Irrigation supply disruption",
    contributionPct: pct,
    explanation: `${disruptedDays} day(s) without supply during a sensitive stage at ${(share * 100).toFixed(0)}% dependence, ${crop.irrigationPctPerDay}% per day capped at ${crop.irrigationCapPct}%.`,
  });
}

function dedupePeriods(periods: AffectedSection["periods"]): AffectedSection["periods"] {
  const seen = new Set<string>();
  return periods
    .filter((p) => {
      const key = `${p.stage}|${p.start}|${p.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
