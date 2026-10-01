import type { PrismaClient } from "@prisma/client";
import { resolveProviderMode } from "@/domain/scenario/providers";
import {
  getForecast, getHealth, getHistory, getProjections, nearestRegion,
  type MlForecast, type MlHealth, type MlHistoryPoint, type MlProjections, type MlRegion,
} from "./client";

/** Everything the ML service knows about one dashboard region. */
export type RegionClimate = {
  modelRegion: MlRegion;
  /** Observed months, oldest first. Months with no usable satellite pass are absent. */
  history: MlHistoryPoint[];
  latest: MlHistoryPoint;
  forecast: MlForecast | null;
  /** Only the six monitored regions have CMIP6 projections. */
  projections: MlProjections | null;
  health: MlHealth;
};

/**
 * `climate` is null with no `notice` when the rules are configured, and null
 * WITH a notice when the model is configured but could not answer — the caller
 * falls back to the heuristic either way, but only the second is worth telling
 * the user about.
 */
export async function loadRegionClimate(
  region: { id: string; latitude: number; longitude: number },
  months = 12,
): Promise<{ climate: RegionClimate | null; notice: string | null }> {
  if (resolveProviderMode(process.env.PROVIDER) !== "trained-model") return { climate: null, notice: null };

  try {
    const { region: modelRegion } = await nearestRegion({ id: region.id, lat: region.latitude, lng: region.longitude });
    const [history, forecast, projections, health] = await Promise.all([
      getHistory(modelRegion.id, months),
      getForecast(modelRegion.id),
      modelRegion.monitored ? getProjections(modelRegion.id) : null,
      getHealth(),
    ]);
    return { climate: { modelRegion, history, latest: history[history.length - 1], forecast, projections, health }, notice: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "The ML service could not be reached.";
    return { climate: null, notice: `AI model unavailable — rule-based estimate. ${reason}` };
  }
}

/** Stores every observed month the dashboard does not have yet. Existing rows are left alone. */
export async function storeObservedMonths(db: PrismaClient, regionId: string, history: MlHistoryPoint[]) {
  const rows = history.map(snapshotFromModel);
  const existing = await db.climateSnapshot.findMany({
    where: { regionId, date: { in: rows.map((row) => row.date) } },
    select: { date: true },
  });
  const have = new Set(existing.map((row) => row.date.getTime()));
  const missing = rows.filter((row) => !have.has(row.date.getTime()));
  if (missing.length > 0) await db.climateSnapshot.createMany({ data: missing.map((row) => ({ regionId, ...row })) });
}

/** The observed month as the snapshot row the dashboard stores. */
export function snapshotFromModel(point: MlHistoryPoint) {
  return {
    date: new Date(`${point.asOf}-01T09:00:00.000Z`),
    rainfallMm: point.rainfallMm,
    temperatureC: point.temperatureC,
    soilMoisture: point.soilMoisturePct,
    vegetationIndex: point.vegetationIndex,
    droughtIndex: point.subScores.drought,
    floodExposure: point.subScores.flood,
  };
}
