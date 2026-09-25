/**
 * GeoJSON subset used throughout ClimaVex.
 *
 * Convention, enforced everywhere: RFC 7946, positions are [longitude, latitude],
 * CRS is EPSG:4326. Leaflet's [lat, lng] ordering exists only inside the map
 * adapter — nothing in `src/domain` or `src/server` may reorder a coordinate.
 */
export type Position = [number, number];
export type LinearRing = Position[];
/** Rings: [exterior, ...holes]. */
export type PolygonCoords = LinearRing[];
export type MultiPolygonCoords = PolygonCoords[];

export type PolygonGeometry = { type: "Polygon"; coordinates: PolygonCoords };
export type MultiPolygonGeometry = { type: "MultiPolygon"; coordinates: MultiPolygonCoords };
export type ArealGeometry = PolygonGeometry | MultiPolygonGeometry;

export type PointGeometry = { type: "Point"; coordinates: Position };
export type LineStringGeometry = { type: "LineString"; coordinates: Position[] };
export type ResourceGeometry = PointGeometry | LineStringGeometry;

export function toMultiPolygon(g: ArealGeometry): MultiPolygonGeometry {
  return g.type === "MultiPolygon" ? g : { type: "MultiPolygon", coordinates: [g.coordinates] };
}

/** Internal working form for the clipping library: an array of polygons. */
export type Poly = MultiPolygonCoords;

export function geometryToPoly(g: ArealGeometry): Poly {
  return toMultiPolygon(g).coordinates;
}

export function polyToGeometry(p: Poly): MultiPolygonGeometry {
  return { type: "MultiPolygon", coordinates: p };
}
