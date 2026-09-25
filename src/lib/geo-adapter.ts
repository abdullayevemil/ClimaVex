import type { ArealGeometry, Position } from "@/domain/geometry/types";

/**
 * The ONLY place coordinate order is converted.
 *
 * GeoJSON is [longitude, latitude]; Leaflet is [latitude, longitude]. Mixing
 * them is the single most common bug in a mapping codebase and it fails
 * silently — a Konya field simply renders in Iraq. Keeping both conversions
 * here means there is exactly one place to get it right, and a lint-level
 * convention that nothing else reorders a pair.
 */
export type LeafletLatLng = [number, number];

export function toLeafletRing(ring: Position[]): LeafletLatLng[] {
  return ring.map(([lng, lat]) => [lat, lng] as LeafletLatLng);
}

/** Leaflet polygon coordinates: rings of [lat,lng], one array per polygon. */
export function geometryToLeaflet(geometry: ArealGeometry): LeafletLatLng[][][] {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((rings) => rings.map(toLeafletRing));
}

/** Leaflet gives [lat,lng] and omits the closing position; GeoJSON needs both fixed. */
export function leafletRingToPositions(latlngs: Array<{ lat: number; lng: number }>): Position[] {
  const positions: Position[] = latlngs.map((p) => [round8(p.lng), round8(p.lat)] as Position);
  if (positions.length === 0) return positions;
  const [first] = positions;
  const last = positions[positions.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) positions.push([first[0], first[1]]);
  return positions;
}

export function leafletLayerToPolygon(latlngs: Array<Array<{ lat: number; lng: number }>>): ArealGeometry {
  return { type: "Polygon", coordinates: latlngs.map(leafletRingToPositions) };
}

function round8(v: number): number {
  return Math.round(v * 1e8) / 1e8;
}
