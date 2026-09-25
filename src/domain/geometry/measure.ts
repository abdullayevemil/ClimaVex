import turfArea from "@turf/area";
import type { ArealGeometry, Poly, Position } from "./types";
import { polyToGeometry } from "./types";

/**
 * Geodesic area in m² on the WGS84 spheroid, for geometry in EPSG:4326.
 *
 * This is the client-side preview figure. The authoritative value is always
 * PostGIS `ST_Area(geom::geography)`, written by the database trigger on save;
 * the two are cross-checked and a divergence above 0.1% is logged.
 */
export function geodesicAreaM2(g: ArealGeometry): number {
  return turfArea(g as never);
}

export function polyGeodesicAreaM2(p: Poly): number {
  if (p.length === 0) return 0;
  return turfArea(polyToGeometry(p) as never);
}

/** Planar area of a projected polygon set, via the shoelace formula. */
export function planarArea(poly: Poly): number {
  let total = 0;
  for (const polygon of poly) {
    polygon.forEach((ring, index) => {
      const a = Math.abs(shoelace(ring));
      // First ring is the exterior; the rest are holes and subtract.
      total += index === 0 ? a : -a;
    });
  }
  return total;
}

function shoelace(ring: Position[]): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return sum / 2;
}

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export function planarBounds(poly: Poly): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const polygon of poly) {
    for (const ring of polygon) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Direction of the longest axis of the minimum-area oriented bounding box,
 * found by rotating calipers over a coarse fixed angle sweep.
 *
 * Cutting perpendicular to this axis yields compact, tractor-workable strips
 * instead of slivers. The sweep is a fixed 90-step scan rather than a convex
 * hull walk because it is simpler, allocation-free and — critically —
 * perfectly deterministic.
 */
export function longestAxisAngle(poly: Poly): number {
  let bestAngle = 0;
  let bestScore = -Infinity;

  for (let step = 0; step < 90; step += 1) {
    const angle = (step * Math.PI) / 180;
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const polygon of poly) {
      for (const ring of polygon) {
        for (const [x, y] of ring) {
          const rx = x * cos - y * sin;
          const ry = x * sin + y * cos;
          if (rx < minX) minX = rx;
          if (rx > maxX) maxX = rx;
          if (ry < minY) minY = ry;
          if (ry > maxY) maxY = ry;
        }
      }
    }

    const w = maxX - minX;
    const h = maxY - minY;
    // Prefer the orientation whose box is most elongated; tie-break on the
    // lower angle so the result never depends on iteration order.
    const score = Math.max(w, h) / Math.max(Math.min(w, h), 1e-9);
    if (score > bestScore + 1e-12) {
      bestScore = score;
      bestAngle = w >= h ? angle : angle + Math.PI / 2;
    }
  }

  return bestAngle;
}
