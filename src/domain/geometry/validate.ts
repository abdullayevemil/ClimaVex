import type { ArealGeometry, LinearRing, Poly, Position } from "./types";
import { geometryToPoly } from "./types";
import { planarArea } from "./measure";

export type GeometryIssueCode =
  | "EMPTY_GEOMETRY"
  | "RING_TOO_SHORT"
  | "SELF_INTERSECTION"
  | "NON_FINITE_COORDINATE"
  | "OUT_OF_RANGE_COORDINATE"
  | "ZERO_AREA";

export type GeometryIssue = { code: GeometryIssueCode; message: string };

export type ValidationResult = {
  valid: boolean;
  issues: GeometryIssue[];
};

/**
 * Structural validation performed before any geometry reaches the database.
 *
 * Deliberately strict: a self-intersecting ring is rejected rather than
 * silently repaired, because repair changes the farmer's land boundary. The
 * API surfaces the issue and offers an explicit, user-accepted repair instead.
 */
export function validateAreal(geometry: ArealGeometry): ValidationResult {
  const issues: GeometryIssue[] = [];
  const poly = geometryToPoly(geometry);

  if (poly.length === 0) {
    return { valid: false, issues: [{ code: "EMPTY_GEOMETRY", message: "Geometry has no polygons." }] };
  }

  for (const polygon of poly) {
    if (polygon.length === 0) {
      issues.push({ code: "EMPTY_GEOMETRY", message: "Polygon has no rings." });
      continue;
    }
    for (const ring of polygon) {
      for (const pos of ring) {
        if (!Array.isArray(pos) || pos.length < 2 || !Number.isFinite(pos[0]) || !Number.isFinite(pos[1])) {
          issues.push({ code: "NON_FINITE_COORDINATE", message: "Coordinate is not a finite [lng, lat] pair." });
          return { valid: false, issues };
        }
        const [lng, lat] = pos;
        if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          issues.push({
            code: "OUT_OF_RANGE_COORDINATE",
            message: `Coordinate [${lng}, ${lat}] is outside valid lon/lat range. Coordinates must be [longitude, latitude].`,
          });
          return { valid: false, issues };
        }
      }

      const closed = isClosed(ring) ? ring.slice(0, -1) : ring;
      if (closed.length < 3) {
        issues.push({ code: "RING_TOO_SHORT", message: "A ring needs at least three distinct positions." });
        continue;
      }
      if (ringSelfIntersects(closed)) {
        issues.push({
          code: "SELF_INTERSECTION",
          message: "Ring edges cross each other. Fix the outline so its edges do not intersect.",
        });
      }
    }
  }

  if (issues.length === 0 && Math.abs(planarArea(poly)) < 1e-12) {
    issues.push({ code: "ZERO_AREA", message: "Geometry encloses no area." });
  }

  return { valid: issues.length === 0, issues };
}

export function isClosed(ring: LinearRing): boolean {
  if (ring.length < 2) return false;
  const a = ring[0];
  const b = ring[ring.length - 1];
  return a[0] === b[0] && a[1] === b[1];
}

export function closeRing(ring: LinearRing): LinearRing {
  return isClosed(ring) ? ring : [...ring, ring[0]];
}

/** O(n²) segment-crossing test. Farm outlines have tens of vertices, not thousands. */
function ringSelfIntersects(ring: Position[]): boolean {
  const n = ring.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i += 1) {
    const a1 = ring[i];
    const a2 = ring[(i + 1) % n];
    for (let j = i + 1; j < n; j += 1) {
      // Skip adjacent segments, which legitimately share an endpoint.
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      const b1 = ring[j];
      const b2 = ring[(j + 1) % n];
      if (segmentsProperlyIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

function orient(p: Position, q: Position, r: Position): number {
  const v = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
  if (Math.abs(v) < 1e-14) return 0;
  return v > 0 ? 1 : 2;
}

function segmentsProperlyIntersect(p1: Position, q1: Position, p2: Position, q2: Position): boolean {
  const o1 = orient(p1, q1, p2);
  const o2 = orient(p1, q1, q2);
  const o3 = orient(p2, q2, p1);
  const o4 = orient(p2, q2, q1);
  return o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0;
}

/** Exterior rings counter-clockwise, holes clockwise, per RFC 7946. */
export function orientPoly(poly: Poly): Poly {
  return poly.map((polygon) =>
    polygon.map((ring, index) => {
      const closed = closeRing(ring);
      const ccw = signedArea(closed) > 0;
      const wantCcw = index === 0;
      return ccw === wantCcw ? closed : [...closed].reverse();
    }),
  );
}

function signedArea(ring: Position[]): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return sum / 2;
}
