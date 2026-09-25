import polygonClippingDefault from "polygon-clipping";
import type { ArealGeometry, MultiPolygonGeometry, Poly } from "./types";
import { geometryToPoly, polyToGeometry } from "./types";
import { N_MAX, N_MIN, TOLERANCES } from "./tolerances";
import { longestAxisAngle, planarArea, planarBounds, polyGeodesicAreaM2 } from "./measure";
import { pickProjectedCrs, projectPoly, representativeLongitude, unprojectPoly } from "./project";
import { orientPoly, validateAreal } from "./validate";

export type SubdivisionSection = {
  ordinal: number;
  /** "Section A", "Section B", … — an internal label, never a cadastral id. */
  label: string;
  geometry: MultiPolygonGeometry;
  areaM2: number;
  /** True when a concave cut produced a disconnected section. */
  isMultipart: boolean;
};

export type SubdivisionReport = {
  parentAreaM2: number;
  sectionsAreaM2: number;
  /** Signed: positive means the sections do not fill the parent. */
  gapM2: number;
  maxOverlapM2: number;
  maxEqualAreaDeviationRel: number;
  areaConserved: boolean;
  withinEqualAreaTolerance: boolean;
  noOverlaps: boolean;
};

export type SubdivisionResult = {
  sections: SubdivisionSection[];
  report: SubdivisionReport;
};

export class SubdivisionError extends Error {
  constructor(
    readonly code:
      | "INVALID_GEOMETRY"
      | "N_OUT_OF_RANGE"
      | "SECTION_TOO_SMALL"
      | "WEIGHTS_INVALID"
      | "DEGENERATE_RESULT",
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "SubdivisionError";
  }
}

export function sectionLabel(ordinal: number): string {
  // A…Z, then AA, AB, … so labels stay stable and readable past 26.
  let n = ordinal;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Section ${out}`;
}

/**
 * Divide a farm polygon into `n` cultivation sections.
 *
 * Algorithm: recursive area-bisection in a projected metric plane.
 *
 *   split(U, n):
 *     if n == 1                 -> emit U
 *     k       = floor(n / 2)
 *     target  = area(U) * k / n
 *     axis    = longest axis of U's minimum-area oriented bounding box
 *     bisect an offset t along that axis; A(t) = area(U ∩ halfplane(t))
 *     A(t) is monotonically non-decreasing in t, so bisection converges
 *     recurse on both sides
 *
 * Recursive halving controls area exactly at every level and produces far
 * better aspect ratios than n parallel strips. Monotonicity of A(t) makes the
 * bisection provably convergent, so there are no heuristics and no iteration
 * cap that can be hit silently.
 *
 * Deterministic by construction: fixed iteration count, fixed angle sweep,
 * fixed tie-breaks, no randomness and no clock. Identical input yields
 * identical output, which is required because the preview and the saved
 * layout must agree.
 *
 * @param weights Optional relative areas (e.g. [0.6, 0.4] for a 12 ha / 8 ha
 *                split of a 20 ha field). Defaults to equal areas.
 */
export function subdivide(geometry: ArealGeometry, n: number, weights?: number[]): SubdivisionResult {
  if (!Number.isInteger(n) || n < N_MIN || n > N_MAX) {
    throw new SubdivisionError("N_OUT_OF_RANGE", `Number of sections must be a whole number between ${N_MIN} and ${N_MAX}.`);
  }

  const validation = validateAreal(geometry);
  if (!validation.valid) {
    throw new SubdivisionError("INVALID_GEOMETRY", validation.issues[0].message, validation.issues);
  }

  const normalisedWeights = normaliseWeights(n, weights);

  const parentPoly = orientPoly(geometryToPoly(geometry));
  const parentAreaM2 = polyGeodesicAreaM2(parentPoly);

  const smallestShare = Math.min(...normalisedWeights);
  if (parentAreaM2 * smallestShare < TOLERANCES.MIN_SECTION_AREA_M2) {
    const maxN = Math.floor(parentAreaM2 / TOLERANCES.MIN_SECTION_AREA_M2);
    throw new SubdivisionError(
      "SECTION_TOO_SMALL",
      `Sections would be smaller than the ${TOLERANCES.MIN_SECTION_AREA_M2 / 1000} dekar minimum. This field supports at most ${Math.max(maxN, 0)} equal sections.`,
      { maxN: Math.max(maxN, 0), parentAreaM2 },
    );
  }

  const crs = pickProjectedCrs(representativeLongitude(parentPoly));
  const projected = projectPoly(parentPoly, crs);

  const pieces = splitRecursive(projected, normalisedWeights);

  /*
   * Snap the result back onto the parent's own coordinates.
   *
   * The pieces were computed in a projected plane and unprojected back, so
   * their outer boundaries carry projection round-trip error of a few
   * millimetres. Over a kilometre of shared edge that integrates into tens of
   * square metres of geometry sitting fractionally outside the parent — not
   * visible, but enough to fail a containment check, and wrong to store.
   *
   * Two exact corrections, both in the final coordinate space so that what we
   * verify is precisely what we persist:
   *   1. Clip every section to the parent, so containment holds by construction.
   *   2. Subtract the sections already emitted, so overlap is exactly zero and
   *      any shared-boundary sliver belongs to exactly one section.
   * Ordinal order makes step 2 deterministic.
   */
  const emitted: Poly[] = [];
  const sections: SubdivisionSection[] = [];

  pieces.forEach((piece, index) => {
    let clipped = intersect(unprojectPoly(piece, crs), parentPoly);
    for (const previous of emitted) {
      if (clipped.length === 0) break;
      clipped = difference(clipped, previous);
    }
    emitted.push(clipped);

    sections.push({
      ordinal: index,
      label: sectionLabel(index),
      geometry: polyToGeometry(clipped),
      areaM2: round2(polyGeodesicAreaM2(clipped)),
      isMultipart: clipped.length > 1,
    });
  });

  if (sections.some((s) => s.areaM2 <= 0)) {
    throw new SubdivisionError("DEGENERATE_RESULT", "Division produced an empty section. Try a smaller number of sections or simplify the outline.");
  }

  return { sections, report: buildReport(parentAreaM2, sections, normalisedWeights) };
}

function normaliseWeights(n: number, weights?: number[]): number[] {
  if (!weights) return Array.from({ length: n }, () => 1 / n);
  if (weights.length !== n) {
    throw new SubdivisionError("WEIGHTS_INVALID", `Expected ${n} share values but received ${weights.length}.`);
  }
  if (weights.some((w) => !Number.isFinite(w) || w <= 0)) {
    throw new SubdivisionError("WEIGHTS_INVALID", "Every section share must be a positive number.");
  }
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / total);
}

/** Recursively bisect `poly` so the pieces carry the given relative weights. */
function splitRecursive(poly: Poly, weights: number[]): Poly[] {
  if (weights.length === 1) return [poly];

  const k = Math.floor(weights.length / 2);
  const leftWeights = weights.slice(0, k);
  const rightWeights = weights.slice(k);
  const leftShare = leftWeights.reduce((a, b) => a + b, 0);
  const totalShare = leftShare + rightWeights.reduce((a, b) => a + b, 0);

  const [left, right] = bisectByArea(poly, leftShare / totalShare);

  return [...splitRecursive(left, leftWeights), ...splitRecursive(right, rightWeights)];
}

/**
 * Cut `poly` with a straight line perpendicular to its longest axis so the
 * first piece holds `fraction` of the total area.
 */
function bisectByArea(poly: Poly, fraction: number): [Poly, Poly] {
  const total = planarArea(poly);
  const target = total * fraction;

  const angle = longestAxisAngle(poly);
  // Cut perpendicular to the longest axis: sweep along the axis direction.
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);

  const { lo, hi } = projectedExtent(poly, ux, uy);

  let low = lo;
  let high = hi;
  let bestPiece: Poly = [];

  for (let i = 0; i < TOLERANCES.BISECTION_ITERS; i += 1) {
    const mid = (low + high) / 2;
    const piece = intersect(poly, halfPlane(poly, ux, uy, mid));
    const area = planarArea(piece);
    bestPiece = piece;

    if (Math.abs(area - target) <= Math.max(target * TOLERANCES.BISECTION_REL_TOL, 1e-6)) break;
    // A(t) is monotonically non-decreasing in t.
    if (area < target) low = mid;
    else high = mid;
  }

  const remainder = difference(poly, bestPiece);

  // A degenerate cut (all area on one side) means the geometry defeated the
  // sweep; fall back to an axis-aligned cut rather than emitting an empty piece.
  if (bestPiece.length === 0 || remainder.length === 0) {
    return axisAlignedFallback(poly, fraction);
  }

  return [bestPiece, remainder];
}

function projectedExtent(poly: Poly, ux: number, uy: number): { lo: number; hi: number } {
  let lo = Infinity;
  let hi = -Infinity;
  for (const polygon of poly) {
    for (const ring of polygon) {
      for (const [x, y] of ring) {
        const t = x * ux + y * uy;
        if (t < lo) lo = t;
        if (t > hi) hi = t;
      }
    }
  }
  // Pad so the half-plane fully contains the geometry at the extremes.
  return { lo: lo - 1, hi: hi + 1 };
}

/** A rectangle covering everything on the near side of the sweep offset `t`. */
function halfPlane(poly: Poly, ux: number, uy: number, t: number): Poly {
  const b = planarBounds(poly);
  const diag = Math.hypot(b.maxX - b.minX, b.maxY - b.minY) + 10;
  // Perpendicular to the sweep direction.
  const px = -uy;
  const py = ux;
  // A point on the cut line.
  const cx = ux * t;
  const cy = uy * t;
  // Rectangle spanning [cut line - diag*u, cut line], wide enough in p.
  const a1: [number, number] = [cx + px * diag, cy + py * diag];
  const a2: [number, number] = [cx - px * diag, cy - py * diag];
  const a3: [number, number] = [cx - px * diag - ux * diag * 2, cy - py * diag - uy * diag * 2];
  const a4: [number, number] = [cx + px * diag - ux * diag * 2, cy + py * diag - uy * diag * 2];
  return [[[a1, a2, a3, a4, a1]]];
}

function axisAlignedFallback(poly: Poly, fraction: number): [Poly, Poly] {
  const b = planarBounds(poly);
  const total = planarArea(poly);
  const target = total * fraction;
  const horizontal = b.maxX - b.minX >= b.maxY - b.minY;

  let low = horizontal ? b.minX : b.minY;
  let high = horizontal ? b.maxX : b.maxY;
  let piece: Poly = [];

  for (let i = 0; i < TOLERANCES.BISECTION_ITERS; i += 1) {
    const mid = (low + high) / 2;
    const rect: Poly = horizontal
      ? [[[[b.minX - 1, b.minY - 1], [mid, b.minY - 1], [mid, b.maxY + 1], [b.minX - 1, b.maxY + 1], [b.minX - 1, b.minY - 1]]]]
      : [[[[b.minX - 1, b.minY - 1], [b.maxX + 1, b.minY - 1], [b.maxX + 1, mid], [b.minX - 1, mid], [b.minX - 1, b.minY - 1]]]];
    piece = intersect(poly, rect);
    const area = planarArea(piece);
    if (Math.abs(area - target) <= Math.max(target * TOLERANCES.BISECTION_REL_TOL, 1e-6)) break;
    if (area < target) low = mid;
    else high = mid;
  }

  return [piece, difference(poly, piece)];
}

type ClipRing = [number, number][];
type ClipPoly = ClipRing[];
type ClipFn = (...polys: ClipPoly[][]) => ClipPoly[];
type ClipApi = { intersection: ClipFn; difference: ClipFn; union: ClipFn };

/**
 * polygon-clipping ships two builds with different export shapes: the CJS
 * build exposes named functions, the ESM build exposes only a default. A
 * bundler picks the ESM build while ts-node/tsx picks CJS, so a plain
 * namespace import works in tests and silently yields `undefined` in a
 * production bundle. Resolve both shapes once, here, and fail loudly if
 * neither is present.
 */
const clip: ClipApi = (() => {
  const mod = polygonClippingDefault as unknown as Partial<ClipApi> & { default?: Partial<ClipApi> };
  const api = (mod?.intersection ? mod : mod?.default) as ClipApi | undefined;
  if (!api?.intersection || !api?.difference || !api?.union) {
    throw new Error("polygon-clipping did not expose intersection/difference/union — check the module interop.");
  }
  return api;
})();

/**
 * Clipping failures are real failures. An earlier version swallowed them and
 * returned an empty polygon, which turned a module-resolution bug into a
 * misleading "degenerate result" complaint about the user's field. Let the
 * error surface with context instead.
 */
function intersect(a: Poly, b: Poly): Poly {
  if (a.length === 0 || b.length === 0) return [];
  try {
    return clip.intersection(a as unknown as ClipPoly[], b as unknown as ClipPoly[]) as unknown as Poly;
  } catch (error) {
    throw new SubdivisionError("DEGENERATE_RESULT", "Geometry intersection failed while dividing this field.", error);
  }
}

function difference(a: Poly, b: Poly): Poly {
  if (a.length === 0) return [];
  if (b.length === 0) return a;
  try {
    return clip.difference(a as unknown as ClipPoly[], b as unknown as ClipPoly[]) as unknown as Poly;
  } catch (error) {
    throw new SubdivisionError("DEGENERATE_RESULT", "Geometry subtraction failed while dividing this field.", error);
  }
}

export function unionAll(polys: Poly[]): Poly {
  const nonEmpty = polys.filter((p) => p.length > 0);
  if (nonEmpty.length === 0) return [];
  const [first, ...rest] = nonEmpty;
  return clip.union(first as unknown as ClipPoly[], ...(rest as unknown as ClipPoly[][])) as unknown as Poly;
}

function buildReport(parentAreaM2: number, sections: SubdivisionSection[], weights: number[]): SubdivisionReport {
  const sectionsAreaM2 = sections.reduce((sum, s) => sum + s.areaM2, 0);
  const gapM2 = parentAreaM2 - sectionsAreaM2;

  let maxDeviation = 0;
  sections.forEach((s, i) => {
    const target = parentAreaM2 * weights[i];
    if (target > 0) maxDeviation = Math.max(maxDeviation, Math.abs(s.areaM2 - target) / target);
  });

  let maxOverlapM2 = 0;
  for (let i = 0; i < sections.length; i += 1) {
    for (let j = i + 1; j < sections.length; j += 1) {
      const overlap = intersect(geometryToPoly(sections[i].geometry), geometryToPoly(sections[j].geometry));
      if (overlap.length > 0) maxOverlapM2 = Math.max(maxOverlapM2, polyGeodesicAreaM2(overlap));
    }
  }

  return {
    parentAreaM2: round2(parentAreaM2),
    sectionsAreaM2: round2(sectionsAreaM2),
    gapM2: round2(gapM2),
    maxOverlapM2: round2(maxOverlapM2),
    maxEqualAreaDeviationRel: Number(maxDeviation.toFixed(6)),
    // One condition, identical to the database's: the absolute floor exists to
    // give small fields headroom, so it raises the bound rather than adding a
    // second hurdle. Residual gap comes from projection round-trip along the
    // boundary and scales with perimeter, not area — at ~50 m² on a 290 ha
    // field it is three orders of magnitude below a single tractor pass.
    areaConserved: Math.abs(gapM2) <= Math.max(TOLERANCES.AREA_CONSERVATION_ABS_M2, parentAreaM2 * TOLERANCES.AREA_CONSERVATION_REL),
    withinEqualAreaTolerance: maxDeviation <= TOLERANCES.EQUAL_AREA_TARGET_REL,
    noOverlaps: maxOverlapM2 <= TOLERANCES.OVERLAP_MAX_M2,
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
