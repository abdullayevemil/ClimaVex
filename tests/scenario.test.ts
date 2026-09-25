import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { DeterministicImpactProvider, RULESET_VERSION } from "@/domain/scenario/deterministic-provider";
import { DeterministicRiskProvider, bandForScore } from "@/domain/scenario/risk-provider";
import { resolveProviderMode } from "@/domain/scenario/providers";
import { canonicalise, inputHash } from "@/domain/scenario/hash";
import { IMPACT_CONTRACT_VERSION, DEMO_DISCLAIMER, type CropCoefficients, type ImpactRequest, type RiskRequest, type SectionSnapshot } from "@/domain/scenario/contract";

const WHEAT: CropCoefficients = {
  cropCode: "WHEAT", cropName: "Wheat", isIrrigated: true,
  heatThresholdC: 30, heatPctPerDay: 0.9, heatCapPct: 26,
  frostThresholdC: -4, frostPctPerEvent: 5,
  waterRequirementMm: 340, droughtMaxPct: 38, waterloggingPct: 9,
  irrigationPctPerDay: 1.4, irrigationCapPct: 40,
};

const section: SectionSnapshot = {
  sectionId: "s1", ordinal: 0, label: "Section A", cropCode: "WHEAT",
  geometry: { type: "MultiPolygon", coordinates: [[[[32.47, 37.86], [32.49, 37.86], [32.49, 37.87], [32.47, 37.87], [32.47, 37.86]]]] },
  areaM2: 1_000_000, plantingDate: "2025-10-12",
  harvestWindow: { start: "2026-07-05", end: "2026-07-25" }, expectedSaleDate: "2026-08-24",
  stages: [{ stage: "FLOWERING", start: "2026-03-12", end: "2026-04-15", isSensitive: true }],
  resourceDependencies: [{ resourceId: "canal", type: "CANAL_CONNECTION", sharePct: 100 }],
};

function weatherRequest(observations: Array<{ date: string; tMaxC: number; tMinC: number; precipMm: number }>): ImpactRequest {
  return {
    contractVersion: IMPACT_CONTRACT_VERSION, scenarioId: "sc1", seasonId: "se1",
    farm: { id: "f1", sections: [section] },
    season: { startDate: "2025-10-01", endDate: "2026-09-30" },
    scenarioInputs: {
      kind: "WEATHER_REPLAY",
      weather: { datasetId: "w1", kind: "DEMO_SYNTHETIC", provenance: "demo", alignment: "CALENDAR_DATE", observations, missingDates: [] },
    },
    assumptions: { rulesetVersion: RULESET_VERSION, crops: [WHEAT] },
  };
}

const hotDry = Array.from({ length: 35 }, (_, i) => ({
  date: `2026-03-${String(12 + i).padStart(2, "0")}`.replace(/-(\d{2})$/, (_m, d) => (Number(d) > 31 ? `-${Number(d) - 31}` : `-${d}`)),
  tMaxC: 34, tMinC: 12, precipMm: 0,
}));

describe("provider selection", () => {
  it("accepts only the deterministic provider in this phase", () => {
    expect(resolveProviderMode(undefined)).toBe("deterministic");
    expect(resolveProviderMode("deterministic")).toBe("deterministic");
    expect(() => resolveProviderMode("trained-model")).toThrowError(/not connected/);
    expect(() => resolveProviderMode("openai")).toThrowError(/only accepted value/);
  });
});

describe("canonical hashing", () => {
  it("is insensitive to key order and float noise", () => {
    expect(inputHash({ a: 1, b: 2 })).toBe(inputHash({ b: 2, a: 1 }));
    expect(inputHash({ x: 1.000000001 })).toBe(inputHash({ x: 1.0000000012 }));
  });

  it("changes when a value that matters changes", () => {
    expect(inputHash({ x: 1 })).not.toBe(inputHash({ x: 2 }));
  });

  it("sorts nested keys", () => {
    expect(JSON.stringify(canonicalise({ b: { d: 1, c: 2 }, a: 3 }))).toBe('{"a":3,"b":{"c":2,"d":1}}');
  });
});

describe("deterministic impact provider", () => {
  it("returns identical output for identical input", async () => {
    const provider = new DeterministicImpactProvider();
    const request = weatherRequest(hotDry);
    const first = JSON.stringify(await provider.estimate(request));
    for (let i = 0; i < 20; i += 1) {
      expect(JSON.stringify(await provider.estimate(request))).toBe(first);
    }
  });

  it("attributes losses to named, explained factors", async () => {
    const result = await new DeterministicImpactProvider().estimate(weatherRequest(hotDry));
    expect(result.affectedSections).toHaveLength(1);
    const codes = result.affectedSections[0].factors.map((f) => f.code);
    expect(codes).toContain("HEAT_STRESS");
    expect(codes).toContain("WATER_DEFICIT");
    for (const f of result.affectedSections[0].factors) expect(f.explanation.length).toBeGreaterThan(20);
  });

  it("clamps yield loss to at most 100%", async () => {
    const result = await new DeterministicImpactProvider().estimate(weatherRequest(hotDry));
    const delta = result.affectedSections[0].yieldDeltaPct;
    expect(delta).toBeLessThanOrEqual(0);
    expect(delta).toBeGreaterThanOrEqual(-100);
  });

  it("reports nothing when the weather is benign", async () => {
    const mild = Array.from({ length: 35 }, (_, i) => ({
      date: `2026-03-${String(12 + Math.min(i, 19)).padStart(2, "0")}`,
      tMaxC: 20, tMinC: 8, precipMm: 12,
    }));
    const result = await new DeterministicImpactProvider().estimate(weatherRequest(mild));
    expect(result.affectedSections).toHaveLength(0);
  });

  it("skips missing observations rather than imputing weather that never happened", async () => {
    const sparse = [{ date: "2026-03-20", tMaxC: 34, tMinC: 12, precipMm: 0 }];
    const result = await new DeterministicImpactProvider().estimate(weatherRequest(sparse));
    const heat = result.affectedSections[0]?.factors.find((f) => f.code === "HEAT_STRESS");
    expect(heat?.explanation).toMatch(/^1 day\(s\)/);
  });

  it("carries the demo disclaimer and full provenance", async () => {
    const result = await new DeterministicImpactProvider().estimate(weatherRequest(hotDry));
    expect(result.disclaimer).toBe(DEMO_DISCLAIMER);
    expect(result.providerType).toBe("deterministic-rules");
    expect(result.providerVersion).toBe(RULESET_VERSION);
    expect(result.inputHash).toHaveLength(64);
    expect(result.provenance.weatherKind).toBe("DEMO_SYNTHETIC");
  });

  it("only penalises irrigated crops for a supply disruption", async () => {
    const provider = new DeterministicImpactProvider();
    const base = weatherRequest([]);
    const disrupted: ImpactRequest = {
      ...base,
      scenarioInputs: { kind: "RESOURCE_DISRUPTION", disruption: { resourceIds: ["canal"], startDate: "2026-03-15", endDate: "2026-03-29" } },
    };
    const irrigated = await provider.estimate(disrupted);
    expect(irrigated.affectedSections[0].factors[0].code).toBe("RESOURCE_DISRUPTION");

    const rainfed: ImpactRequest = { ...disrupted, assumptions: { rulesetVersion: RULESET_VERSION, crops: [{ ...WHEAT, isIrrigated: false }] } };
    expect((await provider.estimate(rainfed)).affectedSections).toHaveLength(0);
  });
});

describe("deterministic risk provider", () => {
  const request: RiskRequest = {
    contractVersion: IMPACT_CONTRACT_VERSION, farmId: "f1", seasonId: "se1",
    sections: [{ ...section, expectedRevenue: "1000000.00" }],
    cropMixExposedShare: 0.7, topCropShare: 0.5, sharedResourceShare: 0.4,
    repaymentStressShare: 0.3, weatherStressPct: -20,
    assumptions: { rulesetVersion: "1.0.0" },
  };

  it("produces a stable, bounded, explainable score", async () => {
    const result = await new DeterministicRiskProvider().assess(request);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.factors).toHaveLength(5);
    const sum = result.factors.reduce((a, f) => a + f.contribution, 0);
    expect(Math.abs(sum - result.score)).toBeLessThan(0.15);
  });

  it("is deterministic", async () => {
    const provider = new DeterministicRiskProvider();
    const first = JSON.stringify(await provider.assess(request));
    for (let i = 0; i < 20; i += 1) expect(JSON.stringify(await provider.assess(request))).toBe(first);
  });

  it("never returns a lending verdict", async () => {
    const result = await new DeterministicRiskProvider().assess(request);
    const body = JSON.stringify(result).toLowerCase();
    for (const word of ["approved", "declined", "verdict", "eligibility", "recommendation"]) {
      expect(body).not.toContain(word);
    }
    expect(result.decisionSupportOnly).toBe(true);
  });

  it("bands the score at the documented thresholds", () => {
    expect(bandForScore(39.9)).toBe("LOW");
    expect(bandForScore(40)).toBe("MEDIUM");
    expect(bandForScore(69.9)).toBe("MEDIUM");
    expect(bandForScore(70)).toBe("HIGH");
  });
});

describe("architectural boundaries", () => {
  const read = (p: string) => readFileSync(p, "utf8");
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
    });

  it("keeps the financial engine independent of the prediction provider", () => {
    // A future model may change estimated yield percentages. It must never be
    // able to change how cash flow is computed.
    for (const file of walk("src/domain/finance")) {
      expect(read(file), file).not.toMatch(/from ["']\.\.\/scenario/);
    }
  });

  it("keeps the domain layer free of framework and database imports", () => {
    for (const file of walk("src/domain")) {
      const src = read(file);
      expect(src, file).not.toMatch(/from ["']@prisma\/client["']/);
      expect(src, file).not.toMatch(/from ["']next\//);
    }
  });

  it("uses no randomness or wall-clock time in scenario logic", () => {
    for (const file of walk("src/domain/scenario")) {
      const src = read(file);
      expect(src, file).not.toMatch(/Math\.random/);
      expect(src, file).not.toMatch(/Date\.now\(\)/);
    }
  });

  it("contains no demo or bypass branch in the authorization guards", () => {
    const guards = read("src/server/auth/guards.ts");
    expect(guards).not.toMatch(/isDemo\s*\)/);
    expect(guards).not.toMatch(/if\s*\(\s*demo/i);
  });
});
