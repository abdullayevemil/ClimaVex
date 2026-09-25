import { describe, expect, it } from "vitest";
import { subdivide, SubdivisionError, sectionLabel } from "@/domain/geometry/subdivide";
import { validateAreal } from "@/domain/geometry/validate";
import { areaBreakdown, M2_PER_DEKAR, M2_PER_HECTARE } from "@/domain/geometry/units";
import { pickProjectedCrs } from "@/domain/geometry/project";
import { TOLERANCES, N_MAX } from "@/domain/geometry/tolerances";
import { isWithinOperatingExtent } from "@/config/map";
import type { ArealGeometry } from "@/domain/geometry/types";

const KONYA: ArealGeometry = {
  type: "Polygon",
  coordinates: [[[32.470, 37.860], [32.492, 37.860], [32.492, 37.874], [32.470, 37.874], [32.470, 37.860]]],
};
const CONCAVE_L: ArealGeometry = {
  type: "Polygon",
  coordinates: [[[32.560, 37.900], [32.584, 37.900], [32.584, 37.910], [32.572, 37.910], [32.572, 37.922], [32.560, 37.922], [32.560, 37.900]]],
};
const WITH_HOLE: ArealGeometry = {
  type: "Polygon",
  coordinates: [
    [[32.400, 37.820], [32.424, 37.820], [32.424, 37.836], [32.400, 37.836], [32.400, 37.820]],
    [[32.409, 37.826], [32.415, 37.826], [32.415, 37.830], [32.409, 37.830], [32.409, 37.826]],
  ],
};
const DISCONNECTED: ArealGeometry = {
  type: "MultiPolygon",
  coordinates: [
    [[[32.480, 37.860], [32.490, 37.860], [32.490, 37.870], [32.480, 37.870], [32.480, 37.860]]],
    [[[32.500, 37.860], [32.510, 37.860], [32.510, 37.870], [32.500, 37.870], [32.500, 37.860]]],
  ],
};

function expectInvariants(result: ReturnType<typeof subdivide>) {
  expect(result.report.areaConserved, "area conserved").toBe(true);
  expect(result.report.noOverlaps, "no overlaps").toBe(true);
  expect(result.report.withinEqualAreaTolerance, "within equal-area tolerance").toBe(true);
  expect(result.report.maxOverlapM2).toBeLessThanOrEqual(TOLERANCES.OVERLAP_MAX_M2);
  for (const s of result.sections) expect(s.areaM2).toBeGreaterThan(0);
}

describe("units", () => {
  it("uses the stated conversions", () => {
    expect(M2_PER_HECTARE).toBe(10_000);
    expect(M2_PER_DEKAR).toBe(1_000);
    const a = areaBreakdown(43_500);
    expect(a.hectares).toBeCloseTo(4.35, 6);
    expect(a.dekar).toBeCloseTo(43.5, 6);
  });
});

describe("projection", () => {
  it("uses Türkiye's TM33 zone for Konya and UTM elsewhere", () => {
    expect(pickProjectedCrs(32.49)).toBe("EPSG:5255");
    expect(pickProjectedCrs(29.0)).toBe("EPSG:32635");
    expect(pickProjectedCrs(40.0)).toBe("EPSG:32637");
  });

  it("measures a Konya field in the right order of magnitude", () => {
    // A ~1.9 km x 1.55 km block is roughly 300 hectares. Computing this in raw
    // degrees would be out by orders of magnitude, so this catches a projection
    // regression immediately.
    const { report } = subdivide(KONYA, 1);
    expect(report.parentAreaM2).toBeGreaterThan(2_900_000);
    expect(report.parentAreaM2).toBeLessThan(3_100_000);
  });
});

describe("coordinate order", () => {
  it("accepts a correctly ordered Konya polygon", () => {
    expect(validateAreal(KONYA).valid).toBe(true);
    expect(isWithinOperatingExtent(32.49, 37.87)).toBe(true);
  });

  it("catches a transposed lat/lng via the operating extent", () => {
    // [37.87, 32.49] is a valid coordinate — in northern Iraq. Range checking
    // cannot catch this; the extent check is what does.
    expect(isWithinOperatingExtent(37.87, 32.49)).toBe(false);
  });

  it("rejects out-of-range coordinates outright", () => {
    const bad = validateAreal({ type: "Polygon", coordinates: [[[200, 37.8], [201, 37.8], [201, 37.9], [200, 37.8]]] } as ArealGeometry);
    expect(bad.valid).toBe(false);
    expect(bad.issues[0].code).toBe("OUT_OF_RANGE_COORDINATE");
  });
});

describe("subdivision", () => {
  it("satisfies every invariant for N = 1..24", () => {
    for (let n = 1; n <= N_MAX; n += 1) expectInvariants(subdivide(KONYA, n));
  });

  it("is deterministic — identical input yields byte-identical output", () => {
    const first = JSON.stringify(subdivide(KONYA, 7).sections);
    for (let i = 0; i < 25; i += 1) {
      expect(JSON.stringify(subdivide(KONYA, 7).sections)).toBe(first);
    }
  });

  it("handles a concave field", () => expectInvariants(subdivide(CONCAVE_L, 4)));
  it("handles a field with a hole", () => expectInvariants(subdivide(WITH_HOLE, 4)));
  it("handles a disconnected field", () => expectInvariants(subdivide(DISCONNECTED, 4)));

  it("excludes a hole from the usable area", () => {
    const solid = subdivide({ type: "Polygon", coordinates: [WITH_HOLE.coordinates[0]] } as ArealGeometry, 1);
    const holed = subdivide(WITH_HOLE, 1);
    expect(holed.report.parentAreaM2).toBeLessThan(solid.report.parentAreaM2);
  });

  it("supports unequal shares — the 20 ha / 12 wheat / 8 maize case", () => {
    const result = subdivide(KONYA, 2, [0.6, 0.4]);
    expectInvariants(result);
    const total = result.report.parentAreaM2;
    expect(result.sections[0].areaM2 / total).toBeCloseTo(0.6, 3);
    expect(result.sections[1].areaM2 / total).toBeCloseTo(0.4, 3);
  });

  it("keeps N independent of crop count", () => {
    // Ten sections is legal regardless of how many crops exist.
    expect(subdivide(KONYA, 10).sections).toHaveLength(10);
  });

  it("rejects a self-intersecting outline rather than silently repairing it", () => {
    const bowtie: ArealGeometry = {
      type: "Polygon",
      coordinates: [[[32.48, 37.86], [32.50, 37.875], [32.50, 37.86], [32.48, 37.875], [32.48, 37.86]]],
    };
    expect(() => subdivide(bowtie, 2)).toThrowError(SubdivisionError);
    expect(validateAreal(bowtie).issues[0].code).toBe("SELF_INTERSECTION");
  });

  it("refuses sections below the one-dekar minimum and names the feasible N", () => {
    const tiny: ArealGeometry = {
      type: "Polygon",
      coordinates: [[[32.4800, 37.8600], [32.4805, 37.8600], [32.4805, 37.8603], [32.4800, 37.8603], [32.4800, 37.8600]]],
    };
    try {
      subdivide(tiny, 24);
      throw new Error("should have thrown");
    } catch (error) {
      const e = error as SubdivisionError;
      expect(e.code).toBe("SECTION_TOO_SMALL");
      expect(e.message).toMatch(/at most \d+ equal sections/);
    }
  });

  it("refuses an out-of-range N", () => {
    expect(() => subdivide(KONYA, 0)).toThrowError(/between 1 and/);
    expect(() => subdivide(KONYA, N_MAX + 1)).toThrowError(/between 1 and/);
    expect(() => subdivide(KONYA, 2.5)).toThrowError(/whole number/);
  });

  it("rejects mismatched or non-positive share weights", () => {
    expect(() => subdivide(KONYA, 3, [0.5, 0.5])).toThrowError(/Expected 3 share values/);
    expect(() => subdivide(KONYA, 2, [1, -1])).toThrowError(/positive number/);
  });

  it("labels sections A, B, C … and past Z", () => {
    expect(sectionLabel(0)).toBe("Section A");
    expect(sectionLabel(25)).toBe("Section Z");
    expect(sectionLabel(26)).toBe("Section AA");
  });
});
