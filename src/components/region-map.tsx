"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { useI18n } from "@/components/locale-provider";
import { riskMeta } from "@/lib/risk-ui";
import type { RegionSummary, RiskLevel } from "@/lib/types";

type Boundary = Array<[number, number]>;

export function getRiskColor(riskLevel: RiskLevel) {
  return riskMeta[riskLevel].markerColor;
}

export function getRiskFillColor(riskLevel: RiskLevel) {
  return riskMeta[riskLevel].markerColor;
}

export function parseRegionBoundary(region: RegionSummary): Boundary | null {
  if (!region.boundaryCoordinates) return null;

  try {
    const parsed = JSON.parse(region.boundaryCoordinates) as unknown;

    if (!Array.isArray(parsed) || parsed.length < 3) return null;

    const boundary = parsed
      .map((point) => {
        if (
          Array.isArray(point) &&
          point.length === 2 &&
          typeof point[0] === "number" &&
          typeof point[1] === "number" &&
          Number.isFinite(point[0]) &&
          Number.isFinite(point[1])
        ) {
          return [point[0], point[1]] as [number, number];
        }

        return null;
      })
      .filter((point): point is [number, number] => point !== null);

    return boundary.length >= 3 ? boundary : null;
  } catch {
    return null;
  }
}

function markerIcon(color: string, selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="climavex-marker ${selected ? "climavex-marker-selected" : ""}" style="width:18px;height:18px;background:${color}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shortText(value: string | undefined, maxLength = 158) {
  if (!value) return "";
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`;
}

function tooltipHtml(
  region: RegionSummary,
  riskLabel: string,
  scoreLabel: string,
) {
  const score = region.latestRiskAssessment?.riskScore;

  return `
    <div class="climavex-map-tooltip">
      <p class="climavex-map-tooltip-title">${escapeHtml(region.name)}</p>
      <p class="climavex-map-tooltip-subtitle">${escapeHtml(region.cropType)}</p>
      <div class="climavex-map-tooltip-row">
        <span>${escapeHtml(riskLabel)}</span>
        <strong>${scoreLabel}: ${score == null ? "-" : score.toFixed(0)}</strong>
      </div>
    </div>
  `;
}

function popupHtml(region: RegionSummary, riskLabel: string) {
  const riskLevel = region.latestRiskAssessment?.riskLevel ?? "LOW";
  const meta = riskMeta[riskLevel];
  const recommendation = shortText(region.latestRiskAssessment?.recommendation);

  return `
    <div style="min-width: 210px; max-width: 280px;">
      <p style="margin:0;font-weight:700;color:#020617;">${escapeHtml(region.name)}</p>
      <p style="margin:4px 0 10px;color:#64748b;font-size:12px;">${escapeHtml(region.cropType)}</p>
      <span style="display:inline-flex;border:1px solid ${meta.markerColor};background:${meta.markerColor}1A;color:${meta.markerColor};border-radius:6px;padding:3px 8px;font-size:12px;font-weight:700;">
        ${escapeHtml(riskLabel)}
      </span>
      ${
        recommendation
          ? `<p style="margin:12px 0 0;color:#334155;font-size:12px;line-height:1.45;">${escapeHtml(recommendation)}</p>`
          : ""
      }
    </div>
  `;
}

export function RegionMap({
  regions,
  selectedRegionId,
  onSelectRegion,
  riskLevelOverrides,
}: {
  regions: RegionSummary[];
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string) => void;
  riskLevelOverrides?: Record<string, RiskLevel>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.LayerGroup | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const { dictionary } = useI18n();

  const selectedRegion = useMemo(
    () => regions.find((region) => region.id === selectedRegionId) ?? null,
    [regions, selectedRegionId],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    // Leaflet stores an internal id on the DOM node. During Next dev remounts
    // the node can survive briefly, so clear stale state before initializing.
    delete (container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id;

    const map = L.map(container, {
      center: [39.0, 35.2],
      zoom: 5.8,
      minZoom: 5,
      maxZoom: 9,
      zoomSnap: 0.2,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const polygonLayer = L.layerGroup().addTo(map);
    const markerLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    polygonLayerRef.current = polygonLayer;
    markerLayerRef.current = markerLayer;
    setMapReady(true);

    return () => {
      polygonLayer.clearLayers();
      markerLayer.clearLayers();
      map.remove();
      polygonLayerRef.current = null;
      markerLayerRef.current = null;
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const polygonLayer = polygonLayerRef.current;
    const markerLayer = markerLayerRef.current;
    if (!mapReady || !polygonLayer || !markerLayer) return;

    polygonLayer.clearLayers();
    markerLayer.clearLayers();

    for (const region of regions) {
      const riskLevel =
        riskLevelOverrides?.[region.id] ??
        region.latestRiskAssessment?.riskLevel ??
        "LOW";
      const riskLabel = dictionary.risk[riskLevel];
      const selected = region.id === selectedRegionId;
      const strokeColor = getRiskColor(riskLevel);
      const fillColor = getRiskFillColor(riskLevel);
      const popup = popupHtml(region, riskLabel);
      const tooltip = tooltipHtml(
        region,
        riskLabel,
        dictionary.assessmentsTable.score,
      );
      const boundary = parseRegionBoundary(region);

      if (boundary) {
        const polygon = L.polygon(boundary, {
          color: strokeColor,
          fillColor,
          fillOpacity: selected ? 0.4 : 0.28,
          opacity: selected ? 0.98 : 0.72,
          weight: selected ? 3.5 : 1.8,
          className: "climavex-risk-polygon",
          bubblingMouseEvents: false,
        })
          .bindTooltip(tooltip, {
            sticky: true,
            opacity: 0.96,
            className: "climavex-risk-tooltip",
          })
          .bindPopup(popup)
          .on("click", () => onSelectRegion(region.id))
          .on("mouseover", (event) => {
            const target = event.target as L.Polygon;
            target.setStyle({
              fillOpacity: selected ? 0.44 : 0.36,
              opacity: 1,
              weight: selected ? 4 : 2.5,
            });
          })
          .on("mouseout", (event) => {
            const target = event.target as L.Polygon;
            target.setStyle({
              fillOpacity: selected ? 0.4 : 0.28,
              opacity: selected ? 0.98 : 0.72,
              weight: selected ? 3.5 : 1.8,
            });
          })
          .addTo(polygonLayer);

        if (selected) {
          polygon.bringToFront();
        }
      }

      L.marker([region.latitude, region.longitude], {
        icon: markerIcon(strokeColor, selected),
      })
        .bindTooltip(tooltip, {
          sticky: true,
          opacity: 0.96,
          className: "climavex-risk-tooltip",
        })
        .bindPopup(popup)
        .on("click", () => onSelectRegion(region.id))
        .addTo(markerLayer);
    }
  }, [
    dictionary.assessmentsTable.score,
    dictionary.risk,
    mapReady,
    onSelectRegion,
    regions,
    riskLevelOverrides,
    selectedRegionId,
  ]);

  useEffect(() => {
    if (!mapReady || !selectedRegion || !mapRef.current) return;

    mapRef.current.flyTo([selectedRegion.latitude, selectedRegion.longitude], 7, {
      duration: 0.8,
    });
  }, [mapReady, selectedRegion]);

  return (
    <div className="h-[420px] overflow-hidden rounded-lg border border-slate-200">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
