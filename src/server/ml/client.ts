import { z } from "zod";
import type { ClimateEvidence } from "@/domain/scenario/contract";

/**
 * The one place that talks to the ClimaVex ML service (FastAPI, in the AI
 * repository's `ml-service/`). Every response is validated before it is
 * trusted, and every failure is a typed `MlServiceError` so callers can fall
 * back to the deterministic rules with a visible notice instead of a blank.
 */
const baseUrl = () => (process.env.ML_SERVICE_URL ?? "http://127.0.0.1:8001").replace(/\/+$/, "");

const TIMEOUT_MS = 5000;
/** A farm further than this from every model region has no climate evidence. */
// ponytail: one fixed radius around region centroids; real coverage polygons if regions ever get boundaries.
const MAX_REGION_DISTANCE_KM = 100;

export type MlErrorKind = "unavailable" | "timeout" | "schema" | "not-found" | "no-coverage";

export class MlServiceError extends Error {
  constructor(readonly kind: MlErrorKind, message: string) {
    super(message);
    this.name = "MlServiceError";
  }
}

const subScores = z.object({
  drought: z.number(), flood: z.number(), heat: z.number(), soil: z.number(), vegetation: z.number(),
});

const indexSchema = z.object({
  regionId: z.string(),
  riskScore: z.number().min(0).max(100),
  riskLevel: z.number().int().min(1).max(5),
  subScores,
  dominantHazard: z.string(),
  method: z.string(),
  asOf: z.string().nullable(),
});

const forecastSchema = z.object({
  regionId: z.string(),
  horizonMonths: z.number(),
  targetYear: z.number(),
  targetMonth: z.number(),
  lastObservedYear: z.number(),
  lastObservedMonth: z.number(),
  currentSoilAnomaly: z.number(),
  predictedSoilAnomaly: z.number(),
  droughtStress: z.number().min(0).max(100),
  direction: z.string(),
  interpretation: z.string(),
  topContributions: z.array(z.object({ feature: z.string(), value: z.number(), contribution: z.number() })),
  baseValue: z.number(),
  modelSkill: z.object({
    r2VsClimatology: z.number().nullish(),
    r2VsPersistence: z.number().nullish(),
    correlation: z.number().nullish(),
    maeSigma: z.number().nullish(),
  }),
});

const regionSchema = z.object({
  id: z.string(), name: z.string(), lat: z.number(), lng: z.number(), monitored: z.boolean(),
});

const healthSchema = z.object({
  status: z.string(),
  modelAvailable: z.boolean(),
  regions: z.number(),
  serviceVersion: z.string(),
  modelTrainedAt: z.string().nullish(),
});

const historyPointSchema = indexSchema.extend({
  rainfallMm: z.number(), temperatureC: z.number(), soilMoisturePct: z.number(), vegetationIndex: z.number(),
});

const projectionsSchema = z.object({
  regionId: z.string(),
  model: z.string(),
  method: z.string(),
  baselinePeriod: z.string(),
  caveats: z.array(z.string()),
  profiles: z.array(z.object({
    scenario: z.string(),
    horizon: z.number().nullable(),
    period: z.string().nullable(),
    monthlyRisk: z.array(z.number()).length(12),
    meanAnnualRisk: z.number(),
    peakRisk: z.number(),
    peakMonth: z.number(),
  })),
});

export type MlIndex = z.infer<typeof indexSchema>;
export type MlForecast = z.infer<typeof forecastSchema>;
export type MlRegion = z.infer<typeof regionSchema>;
export type MlHealth = z.infer<typeof healthSchema>;
export type MlHistoryPoint = z.infer<typeof historyPointSchema>;
export type MlProjections = z.infer<typeof projectionsSchema>;

async function get<T>(path: string, schema: z.ZodType<T>, attempt = 1): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch (error) {
    // One retry: a dropped connection or a slow first request after a restart
    // should not cost the user their assessment.
    if (attempt === 1) return get(path, schema, 2);
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new MlServiceError(
      timedOut ? "timeout" : "unavailable",
      timedOut ? `ML service did not answer within ${TIMEOUT_MS / 1000}s.` : `ML service is not reachable at ${baseUrl()}.`,
    );
  }

  if (response.status === 404) throw new MlServiceError("not-found", `ML service has no data for ${path}.`);
  if (!response.ok) {
    if (attempt === 1 && response.status >= 500) return get(path, schema, 2);
    throw new MlServiceError("unavailable", `ML service answered ${response.status} for ${path}.`);
  }

  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new MlServiceError("schema", `ML service returned an unexpected shape for ${path}.`);
  return parsed.data;
}

const id = encodeURIComponent;

export const getHealth = () => get("/health", healthSchema);
export const getIndex = (regionId: string) => get(`/index/${id(regionId)}`, indexSchema);
export const getHistory = (regionId: string, months = 12) =>
  get(`/history/${id(regionId)}?months=${months}`, z.array(historyPointSchema));
export const getProjections = (regionId: string) => get(`/projections/${id(regionId)}`, projectionsSchema);

/** Null when the region has no forecast window — a gap in its last six observed months. */
export async function getForecast(regionId: string): Promise<MlForecast | null> {
  try {
    return await get(`/forecast/${id(regionId)}`, forecastSchema);
  } catch (error) {
    if (error instanceof MlServiceError && error.kind === "not-found") return null;
    throw error;
  }
}

let regions: Promise<MlRegion[]> | null = null;

/** The region list only changes when the service is retrained, so it is fetched once. */
export function getRegions(): Promise<MlRegion[]> {
  regions ??= get("/regions", z.array(regionSchema)).catch((error) => {
    regions = null;
    throw error;
  });
  return regions;
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * The model region covering a point. Coordinates are matched here rather than
 * sent to the service, so a farm's location never leaves this application.
 */
export async function nearestRegion(point: { lat: number; lng: number }) {
  const ranked = (await getRegions())
    .map((region) => ({ region, distanceKm: distanceKm(point, region) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  const nearest = ranked[0];
  if (!nearest || nearest.distanceKm > MAX_REGION_DISTANCE_KM) {
    throw new MlServiceError(
      "no-coverage",
      `No model region within ${MAX_REGION_DISTANCE_KM} km of this location.`,
    );
  }
  return nearest;
}

/** Everything the risk provider needs about the climate at one location. */
export async function climateEvidenceFor(point: { lat: number; lng: number }): Promise<ClimateEvidence> {
  const { region, distanceKm: distance } = await nearestRegion(point);
  const [index, forecast, health] = await Promise.all([getIndex(region.id), getForecast(region.id), getHealth()]);

  return {
    region: { id: region.id, name: region.name, distanceKm: Math.round(distance * 10) / 10 },
    index: {
      asOf: index.asOf,
      riskScore: index.riskScore,
      riskLevel: index.riskLevel,
      dominantHazard: index.dominantHazard,
      subScores: index.subScores,
    },
    forecast: forecast && {
      targetYear: forecast.targetYear,
      targetMonth: forecast.targetMonth,
      currentSoilAnomaly: forecast.currentSoilAnomaly,
      predictedSoilAnomaly: forecast.predictedSoilAnomaly,
      droughtStress: forecast.droughtStress,
      direction: forecast.direction,
      interpretation: forecast.interpretation,
      correlation: forecast.modelSkill.correlation ?? null,
      r2VsClimatology: forecast.modelSkill.r2VsClimatology ?? null,
    },
    model: { serviceVersion: health.serviceVersion, trainedAt: health.modelTrainedAt ?? null },
  };
}
