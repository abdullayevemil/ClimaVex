/**
 * Database-backed tests. These run against the local PostGIS instance and the
 * seeded demo data, so they cover the things a pure unit test cannot: the
 * geometry triggers, the invariant SQL, ownership rules and scenario
 * immutability.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { checkSectionInvariants } from "@/server/geo/invariants";
import { computeLedger } from "@/server/repositories/cashflow-repo";
import { assessFarmRisk, runScenario } from "@/server/repositories/scenario-service";
import { TOLERANCES } from "@/domain/geometry/tolerances";

// These tests cover the database, not the ML service, so they pin the rules:
// they must pass with no AI service running and no network.
process.env.PROVIDER = "deterministic";

const db = new PrismaClient();
let farmId: string;
let seasonId: string;

beforeAll(async () => {
  const farm = await db.farm.findFirst({ where: { id: "farm-cumra-yildiz" }, include: { seasons: true } });
  if (!farm) throw new Error("Seed data missing — run `npm run seed` first.");
  farmId = farm.id;
  seasonId = farm.seasons[0].id;
});

afterAll(async () => { await db.$disconnect(); });

describe("geometry triggers", () => {
  it("derives area from GeoJSON without the application computing it", async () => {
    const farm = await db.farm.findUniqueOrThrow({ where: { id: farmId } });
    // ~1.9 km x 1.55 km at Konya's latitude.
    expect(Number(farm.areaM2)).toBeGreaterThan(2_900_000);
    expect(Number(farm.areaM2)).toBeLessThan(3_100_000);
  });

  it("derives a centroid inside the field", async () => {
    const farm = await db.farm.findUniqueOrThrow({ where: { id: farmId } });
    expect(farm.centroidLat).toBeGreaterThan(37.8);
    expect(farm.centroidLat).toBeLessThan(37.9);
    expect(farm.centroidLng).toBeGreaterThan(32.4);
    expect(farm.centroidLng).toBeLessThan(32.6);
  });

  it("rejects GeoJSON that yields no polygon", async () => {
    await expect(
      db.$executeRawUnsafe(`UPDATE "Farm" SET "geojson" = '{"type":"Point","coordinates":[32.5,37.9]}'::jsonb WHERE id = $1`, farmId),
    ).rejects.toThrow();
  });
});

describe("PostGIS invariants on every seeded layout", () => {
  it("passes for all demo farms", async () => {
    const farms = await db.farm.findMany({ include: { seasons: true } });
    expect(farms.length).toBeGreaterThan(0);
    for (const farm of farms) {
      const report = await checkSectionInvariants(db, farm.id, farm.seasons[0].id);
      expect(report.violations, `${farm.name}: ${report.violations.join("; ")}`).toEqual([]);
      expect(report.maxOverlapM2).toBeLessThanOrEqual(TOLERANCES.OVERLAP_MAX_M2);
      expect(report.passed).toBe(true);
    }
  });

  it("assigns essentially all of the parent area to sections", async () => {
    const report = await checkSectionInvariants(db, farmId, seasonId);
    const relativeGap = Math.abs(report.gapM2) / report.parentAreaM2;
    expect(relativeGap).toBeLessThan(TOLERANCES.AREA_CONSERVATION_REL);
  });
});

describe("cadastral identity", () => {
  it("allows the same ada:parsel in different neighbourhoods", async () => {
    const collisions = await db.cadastralParcel.findMany({ where: { ada: 463, parsel: 21 } });
    expect(collisions.length).toBeGreaterThan(1);
    expect(new Set(collisions.map((c) => c.mahalleKoy)).size).toBeGreaterThan(1);
  });

  it("enforces uniqueness on the full administrative path", async () => {
    const existing = await db.cadastralParcel.findFirstOrThrow({ where: { ada: 463, parsel: 21 } });
    await expect(
      db.cadastralParcel.create({
        data: {
          farmId: existing.farmId, il: existing.il, ilce: existing.ilce, mahalleKoy: existing.mahalleKoy,
          ada: existing.ada, parsel: existing.parsel, originalInput: "463:21",
        },
      }),
    ).rejects.toThrow();
  });

  it("keeps the official recorded area separate from the computed area", async () => {
    const parcel = await db.cadastralParcel.findFirst({ where: { officialAreaM2: { not: null } } });
    expect(parcel).not.toBeNull();
    expect(Number(parcel!.officialAreaM2)).not.toBe(Number(parcel!.areaM2));
  });
});

describe("financial fixtures through the database", () => {
  it("reproduces the acceptance example exactly", async () => {
    const ledger = await computeLedger(farmId, seasonId);
    const due = ledger.repayments.find((r) => r.date === "2026-09-15");
    expect(due).toBeDefined();
    expect(due!.due).toBe("300000.00");
    expect(due!.available).toBe("180000.00");
    expect(due!.shortfall).toBe("120000.00");
  });
});

describe("scenario runs", () => {
  it("is reproducible and reuses its immutable snapshot", async () => {
    const scenario = await db.scenario.create({
      data: { farmId, seasonId, name: "test replay", kind: "WEATHER_REPLAY", weatherDatasetId: "weather-demo-dry", dateAlignment: "CALENDAR_DATE" },
    });
    const first = await runScenario(scenario.id);
    const second = await runScenario(scenario.id);

    expect(second.reused).toBe(true);
    expect(second.impact.inputHash).toBe(first.impact.inputHash);
    expect(first.impact.providerType).toBe("deterministic-rules");

    await db.scenario.delete({ where: { id: scenario.id } });
  });

  it("refuses to let a stored result be rewritten", async () => {
    const run = await db.scenarioRun.findFirst();
    if (!run) return;
    await expect(
      db.$executeRawUnsafe(`UPDATE "ScenarioRun" SET "resultJson" = '{"tampered":true}'::jsonb WHERE id = $1`, run.id),
    ).rejects.toThrow(/append-only/);
  });

  it("does not write scenario effects into the farm's recorded cash flow", async () => {
    const before = await db.cashFlowEvent.count({ where: { farmId } });
    const scenario = await db.scenario.create({
      data: { farmId, seasonId, name: "isolation check", kind: "WEATHER_REPLAY", weatherDatasetId: "weather-demo-dry", dateAlignment: "CALENDAR_DATE" },
    });
    await runScenario(scenario.id);
    expect(await db.cashFlowEvent.count({ where: { farmId } })).toBe(before);
    await db.scenario.delete({ where: { id: scenario.id } });
  });
});

describe("risk assessment", () => {
  it("produces a bounded, explainable, reproducible score", async () => {
    const a = await assessFarmRisk(farmId, seasonId, null);
    const b = await assessFarmRisk(farmId, seasonId, null);
    expect(a.assessment.inputHash).toBe(b.assessment.inputHash);
    expect(a.assessment.score).toBe(b.assessment.score);
    expect(a.assessment.score).toBeGreaterThanOrEqual(0);
    expect(a.assessment.score).toBeLessThanOrEqual(100);
    expect(a.assessment.factors.length).toBe(5);
    expect(a.assessment.disclaimer).toMatch(/AI model not connected/);
  });
});

describe("access grants", () => {
  it("gives the bank finance-write and the insurer scenario-read only", async () => {
    const bank = await db.accessGrant.findFirst({ where: { grantedTo: { email: "bank@climavex.test" } } });
    const insurer = await db.accessGrant.findFirst({ where: { grantedTo: { email: "insurer@climavex.test" } } });
    expect(bank?.scope).toBe("FINANCE_WRITE");
    expect(insurer?.scope).toBe("READ_SCENARIO");
  });

  it("stores no plaintext passwords", async () => {
    for (const user of await db.user.findMany()) {
      expect(user.passwordHash).not.toBe("climavex");
      expect(user.passwordHash.startsWith("$2")).toBe(true);
    }
  });
});
