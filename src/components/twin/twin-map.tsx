"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { BASEMAPS, DEFAULT_BASEMAP, MAP_CONFIG, type BasemapId } from "@/config/map";
import { geometryToLeaflet, leafletLayerToPolygon } from "@/lib/geo-adapter";
import type { ArealGeometry } from "@/domain/geometry/types";

export type MapSection = {
  id: string;
  label: string;
  geometry: ArealGeometry;
  colorHex: string;
  cropName: string;
  areaDekar: number;
  sharePct: number;
  affected?: boolean;
};

export type MapFarm = {
  id: string;
  name: string;
  centroid: { lat: number; lng: number };
  geometry?: ArealGeometry;
  isDemo: boolean;
  verificationStatus: string;
  areaDekar: number;
  parcelRefs: string[];
};

export type MapResource = {
  id: string;
  name: string;
  type: "WELL" | "PUMP" | "CANAL_CONNECTION";
  geometry: { type: "Point" | "LineString"; coordinates: number[] | number[][] };
  disrupted?: boolean;
};

type Props = {
  farms: MapFarm[];
  selectedFarmId: string | null;
  activeFarmGeometry: ArealGeometry | null;
  sections: MapSection[];
  resources: MapResource[];
  drawing: boolean;
  editing: boolean;
  showSections: boolean;
  showResources: boolean;
  basemap: BasemapId;
  onSelectFarm: (id: string) => void;
  onDrawComplete: (geometry: ArealGeometry) => void;
  onEditGeometry: (geometry: ArealGeometry) => void;
  flyTo: { lat: number; lng: number; zoom: number } | null;
};

/**
 * Imperative Leaflet map. Written against the raw API rather than react-leaflet
 * because Geoman's editing is itself imperative — wrapping it in a declarative
 * tree means fighting two reconcilers over the same DOM.
 */
export function TwinMap(props: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const farmLayerRef = useRef<L.LayerGroup | null>(null);
  const sectionLayerRef = useRef<L.LayerGroup | null>(null);
  const resourceLayerRef = useRef<L.LayerGroup | null>(null);
  const activeLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    // Guard against the dev-mode double mount leaving a poisoned container.
    delete (container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id;

    const map = L.map(container, {
      center: MAP_CONFIG.defaultCenter,
      zoom: MAP_CONFIG.defaultZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      zoomControl: false,
      attributionControl: true,
    });

    // Bottom-right: the bottom-left corner belongs to the legend overlay.
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const initial = BASEMAPS[propsRef.current.basemap ?? DEFAULT_BASEMAP];
    const tiles = L.tileLayer(initial.url, { attribution: initial.attribution, maxZoom: initial.maxZoom });
    tileLayerRef.current = tiles;
    // A blocked or offline tile host should say so rather than leave a blank
    // canvas that looks like a broken app. Field geometry still renders.
    let tileErrors = 0;
    tiles.on("tileerror", () => {
      tileErrors += 1;
      if (tileErrors === 4) container.classList.add("cvx-tiles-unavailable");
    });
    tiles.on("tileload", () => container.classList.remove("cvx-tiles-unavailable"));
    tiles.addTo(map);

    const b = MAP_CONFIG.anatoliaBounds;
    map.setMaxBounds(L.latLngBounds([b.south - 2, b.west - 4], [b.north + 2, b.east + 4]));

    farmLayerRef.current = L.layerGroup().addTo(map);
    activeLayerRef.current = L.layerGroup().addTo(map);
    sectionLayerRef.current = L.layerGroup().addTo(map);
    resourceLayerRef.current = L.layerGroup().addTo(map);

    map.pm.setGlobalOptions({ snappable: true, snapDistance: 12, allowSelfIntersection: false });

    map.on("pm:create", (event: { layer: L.Layer }) => {
      const layer = event.layer as L.Polygon;
      const latlngs = layer.getLatLngs() as Array<Array<{ lat: number; lng: number }>>;
      propsRef.current.onDrawComplete(leafletLayerToPolygon(latlngs));
      map.removeLayer(layer);
    });

    mapRef.current = map;

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* Farm markers across the region overview. */
  useEffect(() => {
    const layer = farmLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const farm of props.farms) {
      const selected = farm.id === props.selectedFarmId;
      const marker = L.marker([farm.centroid.lat, farm.centroid.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="cvx-pin ${selected ? "cvx-pin-selected" : ""} ${farm.isDemo ? "cvx-pin-demo" : ""}"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      });
      marker.bindTooltip(
        `<div class="cvx-tip"><p class="cvx-tip-title">${escapeHtml(farm.name)}</p>` +
          `<p class="cvx-tip-sub">${farm.areaDekar.toFixed(1)} dekar${farm.parcelRefs.length ? ` · ${escapeHtml(farm.parcelRefs[0])}` : ""}</p>` +
          `<p class="cvx-tip-sub">${farm.isDemo ? "Demo data" : "User data"}</p></div>`,
        { direction: "top", offset: [0, -8], className: "cvx-tooltip" },
      );
      marker.on("click", () => propsRef.current.onSelectFarm(farm.id));
      marker.addTo(layer);
    }
  }, [props.farms, props.selectedFarmId]);

  /* The selected farm outline. */
  useEffect(() => {
    const layer = activeLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (!props.activeFarmGeometry) return;

    // Casing: a wider white line beneath the coloured one. Without it a thin
    // stroke disappears against the light and dark patches of aerial imagery.
    L.polygon(geometryToLeaflet(props.activeFarmGeometry) as unknown as L.LatLngExpression[][], {
      color: "#ffffff", weight: 6, opacity: 0.9, fill: false, interactive: false,
    }).addTo(layer);

    const polygon = L.polygon(geometryToLeaflet(props.activeFarmGeometry) as unknown as L.LatLngExpression[][], {
      color: "#facc15",
      weight: 2.5,
      fill: false,
      interactive: false,
    });
    polygon.addTo(layer);

    if (props.editing) {
      polygon.options.interactive = true;
      polygon.pm.enable({ allowSelfIntersection: false });
      polygon.on("pm:edit", () => {
        const latlngs = polygon.getLatLngs() as Array<Array<{ lat: number; lng: number }>>;
        propsRef.current.onEditGeometry(leafletLayerToPolygon(latlngs));
      });
    }
  }, [props.activeFarmGeometry, props.editing]);

  /* Cultivation sections, coloured by crop. */
  useEffect(() => {
    const layer = sectionLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!props.showSections) return;

    for (const section of props.sections) {
      L.polygon(geometryToLeaflet(section.geometry) as unknown as L.LatLngExpression[][], {
        color: "#ffffff", weight: 3.5, opacity: 0.75, fill: false, interactive: false,
      }).addTo(layer);

      const polygon = L.polygon(geometryToLeaflet(section.geometry) as unknown as L.LatLngExpression[][], {
        color: section.affected ? "#dc2626" : section.colorHex,
        weight: section.affected ? 3 : 2,
        fillColor: section.colorHex,
        fillOpacity: section.affected ? 0.75 : 0.62,
        className: "cvx-section",
      });
      polygon.bindTooltip(
        `<div class="cvx-tip"><p class="cvx-tip-title">${escapeHtml(section.label)}</p>` +
          `<p class="cvx-tip-sub">${escapeHtml(section.cropName)}</p>` +
          `<p class="cvx-tip-row"><span>Area</span><strong>${section.areaDekar.toFixed(1)} dekar</strong></p>` +
          `<p class="cvx-tip-row"><span>Share</span><strong>${section.sharePct.toFixed(1)}%</strong></p>` +
          (section.affected ? `<p class="cvx-tip-flag">Affected by scenario</p>` : "") +
          `</div>`,
        { sticky: true, className: "cvx-tooltip" },
      );
      polygon.addTo(layer);
    }
  }, [props.sections, props.showSections]);

  /* Wells, pumps and canal connections. */
  useEffect(() => {
    const layer = resourceLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!props.showResources) return;

    for (const resource of props.resources) {
      const colour = resource.disrupted ? "#b91c1c" : "#0369a1";
      if (resource.geometry.type === "Point") {
        const [lng, lat] = resource.geometry.coordinates as number[];
        L.circleMarker([lat, lng], {
          radius: 6, color: colour, weight: 2, fillColor: "#ffffff", fillOpacity: 1,
        })
          .bindTooltip(`<div class="cvx-tip"><p class="cvx-tip-title">${escapeHtml(resource.name)}</p><p class="cvx-tip-sub">${resource.type.replace("_", " ").toLowerCase()}</p></div>`, { className: "cvx-tooltip" })
          .addTo(layer);
      } else {
        const coords = (resource.geometry.coordinates as number[][]).map(([lng, lat]) => [lat, lng] as [number, number]);
        L.polyline(coords, { color: "#ffffff", weight: resource.disrupted ? 8 : 6, opacity: 0.7, interactive: false }).addTo(layer);
        L.polyline(coords, { color: colour, weight: resource.disrupted ? 5 : 3, dashArray: resource.disrupted ? "8 5" : undefined })
          .bindTooltip(`<div class="cvx-tip"><p class="cvx-tip-title">${escapeHtml(resource.name)}</p><p class="cvx-tip-sub">canal connection</p></div>`, { sticky: true, className: "cvx-tooltip" })
          .addTo(layer);
      }
    }
  }, [props.resources, props.showResources]);

  /* Basemap switching. */
  useEffect(() => {
    const map = mapRef.current;
    const current = tileLayerRef.current;
    if (!map || !current) return;
    const next = BASEMAPS[props.basemap];
    if (current.options.attribution === next.attribution) return;
    map.removeLayer(current);
    const layer = L.tileLayer(next.url, { attribution: next.attribution, maxZoom: next.maxZoom });
    layer.addTo(map);
    layer.bringToBack();
    tileLayerRef.current = layer;
  }, [props.basemap]);

  /* Drawing mode. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (props.drawing) map.pm.enableDraw("Polygon", { snappable: true, finishOn: "dblclick" });
    else map.pm.disableDraw();
  }, [props.drawing]);

  /* Camera. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.flyTo) return;
    map.flyTo([props.flyTo.lat, props.flyTo.lng], props.flyTo.zoom, { duration: 0.8 });
  }, [props.flyTo]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
