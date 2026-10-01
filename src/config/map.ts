/**
 * Geographic configuration. Anatolia is the operating extent; the Harran Plain
 * is the demo focus. Both are configurable — nothing downstream hardcodes a bound.
 */
export const MAP_CONFIG = {
  /** Asian Türkiye. [south, west, north, east] in degrees. */
  anatoliaBounds: { south: 35.8, west: 25.6, north: 42.2, east: 44.9 },
  defaultCenter: [38.9, 33.4] as [number, number],
  defaultZoom: 7,
  minZoom: 6,
  maxZoom: 18,
  demoFocus: { name: "Harran", center: [36.892, 38.957] as [number, number], zoom: 13 },
} as const;

/**
 * Basemaps.
 *
 * Satellite is the default: a farm boundary only means something when you can
 * see the field under it — parcel edges, tracks, irrigation lines. A street map
 * shows empty space out here.
 *
 * Both layers are free and need no API key. Esri World Imagery is the standard
 * free aerial basemap for Leaflet; note its tile path is {z}/{y}/{x}, with y
 * before x, unlike the usual XYZ scheme.
 */
export type BasemapId = "satellite" | "streets";

export const BASEMAPS: Record<BasemapId, { label: string; url: string; attribution: string; maxZoom: number }> = {
  satellite: {
    label: "Satellite",
    url:
      process.env.NEXT_PUBLIC_SATELLITE_TILE_URL ??
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      'Imagery &copy; <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
  },
  streets: {
    label: "Streets",
    url: process.env.NEXT_PUBLIC_TILE_URL ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};

export const DEFAULT_BASEMAP: BasemapId = "satellite";

/**
 * Guard against the classic [lat,lng] / [lng,lat] transposition.
 *
 * Range checking alone cannot catch it — swapping a Konya farm yields
 * 37.9°E, 32.5°N, which is a perfectly valid coordinate in northern Iraq. An
 * extent check can, because that point is nowhere near the operating area.
 */
export function isWithinOperatingExtent(lng: number, lat: number): boolean {
  const b = MAP_CONFIG.anatoliaBounds;
  return lng >= b.west && lng <= b.east && lat >= b.south && lat <= b.north;
}
