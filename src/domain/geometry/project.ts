import proj4 from "proj4";
import type { MultiPolygonCoords, Poly, Position } from "./types";
import { TOLERANCES } from "./tolerances";

/**
 * Projected CRS selection.
 *
 * Area and subdivision are never computed in degrees — one degree of longitude
 * is ~88 km at Konya's latitude but ~111 km of latitude, so planar maths on
 * raw lon/lat is wrong by tens of percent and direction-dependent.
 *
 * TUREF / TM33 (EPSG:5255) is Türkiye's own projected system for 31°30'E–34°30'E,
 * which covers the Konya pilot. Outside that span we fall back to the
 * appropriate UTM zone so the rest of Anatolia still measures correctly.
 */
proj4.defs(
  "EPSG:5255",
  "+proj=tmerc +lat_0=0 +lon_0=33 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
);
proj4.defs("EPSG:32635", "+proj=utm +zone=35 +datum=WGS84 +units=m +no_defs");
proj4.defs("EPSG:32636", "+proj=utm +zone=36 +datum=WGS84 +units=m +no_defs");
proj4.defs("EPSG:32637", "+proj=utm +zone=37 +datum=WGS84 +units=m +no_defs");
proj4.defs("EPSG:32638", "+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs");

const WGS84 = "EPSG:4326";

export function pickProjectedCrs(lng: number): string {
  if (lng >= 31.5 && lng <= 34.5) return "EPSG:5255";
  if (lng < 30) return "EPSG:32635";
  if (lng < 36) return "EPSG:32636";
  if (lng < 42) return "EPSG:32637";
  return "EPSG:32638";
}

export function representativeLongitude(poly: Poly): number {
  let sum = 0;
  let count = 0;
  for (const polygon of poly) {
    for (const ring of polygon) {
      for (const [lng] of ring) {
        sum += lng;
        count += 1;
      }
    }
  }
  return count === 0 ? 33 : sum / count;
}

const snapM = (v: number) =>
  Math.round(v / TOLERANCES.SNAP_PRECISION_M) * TOLERANCES.SNAP_PRECISION_M;

const snapDeg = (v: number) => {
  const f = 10 ** TOLERANCES.SNAP_PRECISION_DEG;
  return Math.round(v * f) / f;
};

export function projectPoly(poly: Poly, crs: string): Poly {
  return poly.map((polygon) =>
    polygon.map((ring) =>
      ring.map((pos) => {
        const [x, y] = proj4(WGS84, crs, [pos[0], pos[1]]);
        return [snapM(x), snapM(y)] as Position;
      }),
    ),
  );
}

export function unprojectPoly(poly: Poly, crs: string): MultiPolygonCoords {
  return poly.map((polygon) =>
    polygon.map((ring) =>
      ring.map((pos) => {
        const [lng, lat] = proj4(crs, WGS84, [pos[0], pos[1]]);
        return [snapDeg(lng), snapDeg(lat)] as Position;
      }),
    ),
  );
}
