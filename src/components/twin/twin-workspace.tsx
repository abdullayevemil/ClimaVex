"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers2, Loader2, LogOut, Pencil, PlusSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FarmSidebar } from "./farm-sidebar";
import { Inspector } from "./inspector";
import { SeasonTimeline } from "./season-timeline";
import { AiStatusBanner } from "./demo-banner";
import { MapLegend } from "./map-legend";
import { fetchJson } from "@/lib/fetch-json";
import { BASEMAPS, DEFAULT_BASEMAP, MAP_CONFIG, type BasemapId } from "@/config/map";
import type { ArealGeometry } from "@/domain/geometry/types";
import type {
  AccessDto, AssessmentDto, CropDto, FarmDetailDto, FarmListItemDto, LedgerDto,
  ResourceDto, ScenarioRunDto, SessionUserDto, SubdivisionPreviewDto, WeatherDatasetDto,
} from "@/lib/twin-types";
import type { MapSection } from "./twin-map";

const TwinMap = dynamic(() => import("./twin-map").then((m) => m.TwinMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading map…
    </div>
  ),
});

const MAX_N = 24;

export function TwinWorkspace({ user }: { user: SessionUserDto }) {
  const [farms, setFarms] = useState<FarmListItemDto[]>([]);
  const [crops, setCrops] = useState<CropDto[]>([]);
  const [resources, setResources] = useState<ResourceDto[]>([]);
  const [datasets, setDatasets] = useState<WeatherDatasetDto[]>([]);

  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [farm, setFarm] = useState<FarmDetailDto | null>(null);
  const [access, setAccess] = useState<AccessDto | null>(null);
  const [farmLoading, setFarmLoading] = useState(false);

  const [ledger, setLedger] = useState<LedgerDto | null>(null);
  const [creditExposure, setCreditExposure] = useState("0.00");
  const [assessment, setAssessment] = useState<AssessmentDto | null>(null);
  const [assessmentBusy, setAssessmentBusy] = useState(false);

  const [preview, setPreview] = useState<SubdivisionPreviewDto | null>(null);
  const [previewAssignments, setPreviewAssignments] = useState<string[]>([]);
  const [subdivisionBusy, setSubdivisionBusy] = useState(false);
  const [subdivisionError, setSubdivisionError] = useState<string | null>(null);

  const [scenarioRun, setScenarioRun] = useState<ScenarioRunDto | null>(null);
  const [scenarioBusy, setScenarioBusy] = useState(false);

  const [drawing, setDrawing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftGeometry, setDraftGeometry] = useState<ArealGeometry | null>(null);
  const [layers, setLayers] = useState({ sections: true, resources: true, scenario: false, exposure: false });
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [cursor, setCursor] = useState("2026-06-15");
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const notify = useCallback((tone: "ok" | "error", text: string) => {
    setToast({ tone, text });
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  /* Initial load. */
  useEffect(() => {
    void (async () => {
      try {
        // Weather datasets are farm-scoped for authorization, so they load
        // with the first selected farm rather than on a throwaway bootstrap call.
        const [farmsRes, cropsRes, resourcesRes] = await Promise.all([
          fetchJson<{ farms: FarmListItemDto[] }>("/api/farms"),
          fetchJson<{ crops: CropDto[]; defaultCropId: string | null }>("/api/crops"),
          fetchJson<{ resources: ResourceDto[] }>("/api/resources"),
        ]);
        setFarms(farmsRes.farms);
        setCrops(cropsRes.crops);
        setResources(resourcesRes.resources);
        if (farmsRes.farms[0]) setSelectedFarmId(farmsRes.farms[0].id);
      } catch (error) {
        notify("error", error instanceof Error ? error.message : "Could not load the workspace.");
      }
    })();
  }, [notify]);

  /* Selected farm detail + its ledger. */
  const loadFarm = useCallback(async (id: string) => {
    setFarmLoading(true);
    try {
      const res = await fetchJson<{ farm: FarmDetailDto; access: AccessDto }>(`/api/farms/${id}`);
      setFarm(res.farm);
      setAccess(res.access);
      setAssessment(null);
      setScenarioRun(null);
      setPreview(null);

      if (res.farm.activeSeasonId) {
        const [cash, scen] = await Promise.all([
          fetchJson<{ ledger: LedgerDto; measures: { creditExposure: string } }>(
            `/api/farms/${id}/cashflow?seasonId=${res.farm.activeSeasonId}`,
          ),
          fetchJson<{ weatherDatasets: WeatherDatasetDto[] }>(`/api/scenarios?farmId=${id}`).catch(() => null),
        ]);
        setLedger(cash.ledger);
        setCreditExposure(cash.measures.creditExposure);
        if (scen?.weatherDatasets?.length) setDatasets(scen.weatherDatasets);
        const season = res.farm.seasons.find((s) => s.id === res.farm.activeSeasonId);
        if (season && (cursor < season.startDate || cursor > season.endDate)) setCursor(season.startDate);
      } else {
        setLedger(null);
      }
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Could not load that farm.");
      setFarm(null);
      setAccess(null);
    } finally {
      setFarmLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notify]);

  useEffect(() => {
    if (selectedFarmId) void loadFarm(selectedFarmId);
  }, [selectedFarmId, loadFarm]);

  const selectFarm = (id: string) => {
    setSelectedFarmId(id);
    const target = farms.find((f) => f.id === id);
    if (target) setFlyTo({ lat: target.centroid.lat, lng: target.centroid.lng, zoom: 14 });
  };

  /* Subdivision preview. */
  const runPreview = async (n: number, weights?: number[]) => {
    const geometry = draftGeometry ?? farm?.geometry;
    if (!geometry) return;
    setSubdivisionBusy(true);
    setSubdivisionError(null);
    try {
      const res = await fetchJson<SubdivisionPreviewDto>("/api/geometry/subdivide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geometry, n, weights }),
      });
      setPreview(res);
      // Re-apply existing crops by ordinal; new sections take the regional default.
      setPreviewAssignments(
        res.sections.map((_, i) => farm?.sections[i]?.crop.id ?? crops[0]?.id ?? ""),
      );
    } catch (error) {
      setSubdivisionError(error instanceof Error ? error.message : "Could not divide this field.");
      setPreview(null);
    } finally {
      setSubdivisionBusy(false);
    }
  };

  const saveLayout = async () => {
    if (!farm || !preview || !farm.activeSeasonId) return;
    setSubdivisionBusy(true);
    setSubdivisionError(null);
    try {
      const sections = preview.sections.map((s, i) => {
        const cropId = previewAssignments[i] ?? crops[0]?.id ?? "";
        const crop = crops.find((c) => c.id === cropId);
        const existing = farm.sections[i];
        return {
          ordinal: s.ordinal,
          label: s.label,
          geometry: s.geometry,
          cropId,
          plantingDate: existing?.plantingDate ?? "2025-10-12",
          harvestWindowStart: existing?.harvestWindowStart ?? "2026-07-05",
          harvestWindowEnd: existing?.harvestWindowEnd ?? "2026-07-25",
          expectedSaleDate: existing?.expectedSaleDate ?? "2026-08-24",
          yieldTPerHa: crop?.assumption?.yieldTPerHa ?? "4.0",
          priceTryPerT: crop?.assumption?.priceTryPerT ?? "9000",
          costTryPerHa: crop?.assumption?.costTryPerHa ?? "14000",
          isMultipart: s.isMultipart,
        };
      });

      const res = await fetchJson<{ farm: FarmDetailDto }>(`/api/farms/${farm.id}/layout`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: farm.version,
          seasonId: farm.activeSeasonId,
          farmGeometry: draftGeometry ?? undefined,
          sections,
        }),
      });

      setFarm(res.farm);
      setPreview(null);
      setDraftGeometry(null);
      setAssessment(null);
      notify("ok", `Saved ${sections.length} sections. Reload the page — the layout persists.`);
      const list = await fetchJson<{ farms: FarmListItemDto[] }>("/api/farms");
      setFarms(list.farms);
    } catch (error) {
      setSubdivisionError(error instanceof Error ? error.message : "Could not save the layout.");
    } finally {
      setSubdivisionBusy(false);
    }
  };

  const runAssessment = async () => {
    if (!farm?.activeSeasonId) return;
    setAssessmentBusy(true);
    try {
      setAssessment(
        await fetchJson<AssessmentDto>(`/api/farms/${farm.id}/assessment?seasonId=${farm.activeSeasonId}`, { method: "POST" }),
      );
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Could not calculate a risk score.");
    } finally {
      setAssessmentBusy(false);
    }
  };

  const runScenario = async (payload: Record<string, unknown>) => {
    if (!farm?.activeSeasonId) return;
    setScenarioBusy(true);
    try {
      const created = await fetchJson<{ id: string }>(`/api/scenarios?farmId=${farm.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId: farm.activeSeasonId, ...payload }),
      });
      const run = await fetchJson<ScenarioRunDto>(`/api/scenarios/${created.id}/run`, { method: "POST" });
      setScenarioRun(run);
      setLayers((l) => ({ ...l, scenario: true }));
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Could not run that scenario.");
    } finally {
      setScenarioBusy(false);
    }
  };

  const affectedIds = useMemo(
    () => new Set((layers.scenario ? scenarioRun?.impact.affectedSections ?? [] : []).map((s) => s.sectionId)),
    [scenarioRun, layers.scenario],
  );

  const mapSections: MapSection[] = useMemo(() => {
    const source = preview
      ? preview.sections.map((s, i) => {
          const crop = crops.find((c) => c.id === previewAssignments[i]);
          return {
            id: `preview-${s.ordinal}`, label: s.label, geometry: s.geometry,
            colorHex: crop?.colorHex ?? "#94a3b8", cropName: crop?.nameEn ?? "Unassigned",
            areaDekar: s.area.dekar,
            sharePct: preview.report.parentAreaM2 ? (s.areaM2 / preview.report.parentAreaM2) * 100 : 0,
          };
        })
      : (farm?.sections ?? []).map((s) => ({
          id: s.id, label: s.label, geometry: s.geometry, colorHex: s.crop.colorHex,
          cropName: s.crop.nameEn, areaDekar: s.area.dekar, sharePct: s.shareOfFarm * 100,
          affected: affectedIds.has(s.id),
        }));
    return source;
  }, [preview, previewAssignments, farm, crops, affectedIds]);

  const mapResources = useMemo(
    () => resources.map((r) => ({
      id: r.id, name: r.name, type: r.type, geometry: r.geometry,
      disrupted: layers.scenario && scenarioRun?.financial.hazard === "IRRIGATION_FAILURE",
    })),
    [resources, layers.scenario, scenarioRun],
  );

  const activeSeason = farm?.seasons.find((s) => s.id === farm.activeSeasonId) ?? null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-teal-700 text-xs font-bold text-white">CV</div>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-950">ClimaVex</p>
            <p className="text-[10px] leading-tight text-slate-500">Agricultural digital twin · Anatolia</p>
          </div>
          {farm && farm.seasons.length > 0 ? (
            <Select
              value={farm.activeSeasonId ?? ""}
              onValueChange={(v) => { void loadFarm(farm.id); void v; }}
            >
              <SelectTrigger className="ml-2 h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {farm.seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <AiStatusBanner className="hidden md:flex" />

        <div className="flex items-center gap-2">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium leading-tight text-slate-900">{user.name}</p>
            <p className="text-[10px] leading-tight text-slate-500">
              {user.role.replace("_", " ").toLowerCase()}{user.organisation ? ` · ${user.organisation}` : ""}
            </p>
          </div>
          <form action="/api/auth/logout" method="post" onSubmit={(e) => {
            e.preventDefault();
            void fetch("/api/auth/logout", { method: "POST" }).then(() => window.location.reload());
          }}>
            <Button type="submit" variant="outline" size="icon" className="h-8 w-8" aria-label="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <FarmSidebar
          farms={farms}
          selectedFarmId={selectedFarmId}
          onSelect={selectFarm}
          onZoomDemo={() => setFlyTo({ ...MAP_CONFIG.demoFocus.center.reduce((a, v, i) => (i === 0 ? { ...a, lat: v } : { ...a, lng: v }), { lat: 0, lng: 0 }), zoom: MAP_CONFIG.demoFocus.zoom })}
          layers={layers}
          onToggleLayer={(k, v) => setLayers((l) => ({ ...l, [k]: v }))}
        />

        <main className="relative min-w-0 flex-1">
          <TwinMap
            farms={farms.map((f) => ({
              id: f.id, name: f.name, centroid: f.centroid, isDemo: f.isDemo,
              verificationStatus: f.verificationStatus, areaDekar: f.area.dekar, parcelRefs: f.parcelRefs,
            }))}
            selectedFarmId={selectedFarmId}
            activeFarmGeometry={draftGeometry ?? farm?.geometry ?? null}
            sections={mapSections}
            resources={mapResources}
            drawing={drawing}
            editing={editing}
            showSections={layers.sections}
            showResources={layers.resources}
            basemap={basemap}
            onSelectFarm={selectFarm}
            onDrawComplete={(g) => { setDraftGeometry(g); setDrawing(false); notify("ok", "Outline captured. Open the Divide tab to split it into sections."); }}
            onEditGeometry={(g) => setDraftGeometry(g)}
            flyTo={flyTo}
          />

          {/* Above Leaflet's own panes (z-400) and controls (z-800): .leaflet-container
              does not create a stacking context, so an unpositioned overlay
              would sit underneath the tiles. */}
          <div className="pointer-events-none absolute inset-0 z-[1000] flex flex-col justify-between p-3">
            <div className="pointer-events-auto flex gap-2">
              <Button
                size="sm" variant={drawing ? "default" : "outline"}
                className="gap-1.5 bg-white" onClick={() => { setDrawing((d) => !d); setEditing(false); }}
                disabled={!access?.canWriteTwin && farms.length > 0}
              >
                <PlusSquare className="h-3.5 w-3.5" /> {drawing ? "Cancel drawing" : "Draw field"}
              </Button>
              <Button
                size="sm" variant={editing ? "default" : "outline"}
                className="gap-1.5 bg-white" onClick={() => { setEditing((e) => !e); setDrawing(false); }}
                disabled={!farm || !access?.canWriteTwin}
              >
                <Pencil className="h-3.5 w-3.5" /> {editing ? "Finish editing" : "Edit outline"}
              </Button>
              {draftGeometry ? (
                <Button size="sm" variant="outline" className="gap-1.5 bg-white" onClick={() => { setDraftGeometry(null); setPreview(null); }}>
                  <X className="h-3.5 w-3.5" /> Discard draft
                </Button>
              ) : null}

              <div className="ml-auto flex overflow-hidden rounded-md border border-slate-200 bg-white">
                {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setBasemap(id)}
                    className={
                      "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition " +
                      (basemap === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50")
                    }
                  >
                    {id === "satellite" ? <Layers2 className="h-3.5 w-3.5" /> : null}
                    {BASEMAPS[id].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pointer-events-auto flex items-end justify-between gap-3">
              <MapLegend crops={crops} />
              {toast ? (
                <div className={`rounded-md border px-3 py-2 text-xs ${
                  toast.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"
                }`}>
                  {toast.text}
                </div>
              ) : null}
            </div>
          </div>
        </main>

        <Inspector
          farm={farm} access={access} crops={crops} loading={farmLoading}
          ledger={ledger} creditExposure={creditExposure}
          assessment={assessment} assessmentBusy={assessmentBusy} onRunAssessment={runAssessment}
          preview={preview} previewAssignments={previewAssignments}
          subdivisionBusy={subdivisionBusy} subdivisionError={subdivisionError} maxN={MAX_N}
          onPreview={runPreview}
          onAssign={(i, cropId) => setPreviewAssignments((a) => a.map((v, idx) => (idx === i ? cropId : v)))}
          onCancelPreview={() => { setPreview(null); setSubdivisionError(null); }}
          onSaveLayout={saveLayout}
          datasets={datasets} resources={resources} scenarioRun={scenarioRun} scenarioBusy={scenarioBusy}
          onRunWeather={(datasetId, alignment) => void runScenario({ name: "Weather replay", kind: "WEATHER_REPLAY", weatherDatasetId: datasetId, dateAlignment: alignment })}
          onRunDisruption={(resourceIds, startDate, endDate) => void runScenario({ name: "Supply restriction", kind: "RESOURCE_DISRUPTION", disruption: { resourceIds, startDate, endDate } })}
          cursor={cursor}
        />
      </div>

      {activeSeason ? (
        <SeasonTimeline
          seasonStart={activeSeason.startDate}
          seasonEnd={activeSeason.endDate}
          cursor={cursor}
          onCursorChange={setCursor}
          sections={farm?.sections ?? []}
          ledger={ledger}
        />
      ) : null}
    </div>
  );
}
