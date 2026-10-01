import { afterEach, describe, expect, it, vi } from "vitest";
import { MlServiceError, distanceKm, getForecast, getIndex } from "@/server/ml/client";
import { buildLoanReviewFromModel, type LoanReviewEvidence } from "@/lib/loan-workflow";
import { scoreFromModel } from "@/lib/risk-scoring";

const index = {
  regionId: "konya-wheat-district", riskScore: 41.8, riskLevel: 3,
  subScores: { drought: 0, flood: 12.9, heat: 0, soil: 84.7, vegetation: 30 },
  dominantHazard: "flood", method: "deterministic-index", asOf: "2026-07",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe("ML service client", () => {
  it("returns a validated response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(index)));
    expect((await getIndex("konya-wheat-district")).riskScore).toBe(41.8);
  });

  it("rejects a response that does not match the contract", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ ...index, riskScore: 140 })));
    await expect(getIndex("konya-wheat-district")).rejects.toMatchObject({ kind: "schema" });
  });

  it("retries once, then reports the service as unavailable", async () => {
    const fetch = vi.fn(async () => { throw new TypeError("fetch failed"); });
    vi.stubGlobal("fetch", fetch);
    await expect(getIndex("konya-wheat-district")).rejects.toBeInstanceOf(MlServiceError);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("treats a missing forecast window as no forecast, not as a failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ detail: "No forecast window" }, 404)));
    expect(await getForecast("rize-tea-gardens")).toBeNull();
  });

  it("measures distance on the sphere", () => {
    // Konya to Karaman, about 100 km.
    expect(distanceKm({ lat: 37.8746, lng: 32.4932 }, { lat: 37.1759, lng: 33.2287 })).toBeCloseTo(101, 0);
  });
});

describe("model-backed bank dashboard", () => {
  const latest = { ...index, rainfallMm: 20.9, temperatureC: 23.1, soilMoisturePct: 15.3, vegetationIndex: 0.19 };
  const evidence: LoanReviewEvidence = {
    latest,
    forecast: { targetYear: 2026, targetMonth: 8, predictedSoilAnomaly: 0.58, modelSkill: { correlation: 0.46 } },
    projections: {
      model: "4-model CMIP6 ensemble mean",
      profiles: [
        { scenario: "baseline", horizon: null, period: null, meanAnnualRisk: 50, peakRisk: 60, peakMonth: 8 },
        { scenario: "ssp2_4_5", horizon: 2030, period: "2026-2035", meanAnnualRisk: 58, peakRisk: 80, peakMonth: 8 },
        { scenario: "ssp5_8_5", horizon: 2050, period: "2046-2055", meanAnnualRisk: 70, peakRisk: 96, peakMonth: 8 },
      ],
    },
    health: { serviceVersion: "0.2.0", modelTrainedAt: "2026-09-28T12:35:42+00:00" },
  };

  it("uses the service's score and sub-scores as they are", () => {
    const scoring = scoreFromModel(latest, evidence.forecast);
    expect(scoring.riskScore).toBe(41.8);
    expect(scoring.riskLevel).toBe("MEDIUM");
    expect([scoring.droughtRisk, scoring.floodRisk, scoring.soilRisk, scoring.yieldVolatilityRisk]).toEqual([0, 12.9, 84.7, 30]);
    for (const locale of ["en", "az", "tr"] as const) {
      expect(scoreFromModel(latest, evidence.forecast, locale).explanation).toContain("+0.58σ");
    }
  });

  it("builds the loan review without inventing what the service does not report", () => {
    const review = buildLoanReviewFromModel(evidence, "en", 42);
    expect(review.riskScore).toBe(41.8);
    expect(review.latencyMs).toBe(42);
    expect(review.factorContributions.map((f) => f.value)).toEqual([0, 0, 0.85, 0.13, 0.3]);
    // No SSP1-2.6 pathway and no confidence interval exist in the ensemble output.
    expect(new Set(review.projections.map((p) => p.scenario))).toEqual(new Set(["SSP2-4.5", "SSP5-8.5"]));
    expect(review.projections.every((p) => p.confidenceLow === undefined)).toBe(true);
    expect(review.projections.find((p) => p.scenario === "SSP5-8.5" && p.year === 2050)?.score5).toBe(3.5);
    expect(review.projections.find((p) => p.year === 2026)?.score5).toBe(2.5);
  });
});
