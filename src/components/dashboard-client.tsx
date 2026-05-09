"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock, MapPinned } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ClimateIndicatorCards } from "@/components/climate-indicator-cards";
import { FinancialImpactEstimates } from "@/components/financial-impact-estimates";
import { FinancialInterpretationPanel } from "@/components/financial-interpretation-panel";
import { GenerateAssessmentButton } from "@/components/generate-assessment-button";
import { LoanReviewWorkflow } from "@/components/loan-review-workflow";
import { useI18n } from "@/components/locale-provider";
import { MorningOperationsPanel } from "@/components/morning-operations-panel";
import { PortfolioSummaryCards } from "@/components/portfolio-summary-cards";
import { RecentAssessmentsTable } from "@/components/recent-assessments-table";
import { RecommendationPanel } from "@/components/recommendation-panel";
import { RegionSelector } from "@/components/region-selector";
import { RiskScoreCard } from "@/components/risk-score-card";
import { RiskTrendChart } from "@/components/risk-trend-chart";
import { ScenarioProjectionPanel } from "@/components/scenario-projection-panel";
import { fetchJson } from "@/lib/fetch-json";
import { localeSearchParam } from "@/lib/i18n";
import type {
  PortfolioSummary,
  RegionDetail,
  RegionHistoryPoint,
  RegionSummary,
  RiskLevel,
  WorkflowSummary,
} from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

const RegionMap = dynamic(
  () => import("@/components/region-map").then((mod) => mod.RegionMap),
  {
    ssr: false,
    loading: () => <MapLoading />,
  },
);

export function DashboardClient() {
  const { dictionary, locale } = useI18n();
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowSummary | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<RegionDetail | null>(null);
  const [history, setHistory] = useState<RegionHistoryPoint[]>([]);
  const [mapRiskOverrides, setMapRiskOverrides] = useState<
    Record<string, RiskLevel>
  >({});
  const [loading, setLoading] = useState(true);
  const [regionLoading, setRegionLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedSummary = useMemo(
    () => regions.find((region) => region.id === selectedRegionId) ?? null,
    [regions, selectedRegionId],
  );

  const loadRegion = useCallback(async (regionId: string) => {
    setRegionLoading(true);
    setError(null);

    try {
      const [detail, regionHistory] = await Promise.all([
        fetchJson<RegionDetail>(
          `/api/regions/${regionId}?${localeSearchParam(locale)}`,
        ),
        fetchJson<RegionHistoryPoint[]>(`/api/regions/${regionId}/history`),
      ]);

      setSelectedRegion(detail);
      setHistory(regionHistory);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : dictionary.dashboard.unableSelected,
      );
    } finally {
      setRegionLoading(false);
    }
  }, [dictionary.dashboard.unableSelected, locale]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [regionsPayload, portfolioPayload, workflowPayload] = await Promise.all([
        fetchJson<RegionSummary[]>(`/api/regions?${localeSearchParam(locale)}`),
        fetchJson<PortfolioSummary>(`/api/portfolio?${localeSearchParam(locale)}`),
        fetchJson<WorkflowSummary>(`/api/workflow?${localeSearchParam(locale)}`),
      ]);

      setRegions(regionsPayload);
      setPortfolio(portfolioPayload);
      setWorkflow(workflowPayload);

      const firstHighRisk =
        regionsPayload.find(
          (region) => region.latestRiskAssessment?.riskLevel === "HIGH",
        ) ?? regionsPayload[0];

      if (firstHighRisk) {
        setSelectedRegionId(firstHighRisk.id);
        await loadRegion(firstHighRisk.id);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : dictionary.dashboard.unableDashboard,
      );
    } finally {
      setLoading(false);
    }
  }, [dictionary.dashboard.unableDashboard, loadRegion, locale]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  const handleSelectRegion = useCallback((regionId: string) => {
    setSelectedRegionId(regionId);
    setNotice(null);
    void loadRegion(regionId);
  }, [loadRegion]);

  const handleProjectionRiskChange = useCallback(
    (regionId: string, riskLevel: RiskLevel | null) => {
      setMapRiskOverrides((current) => {
        if (!riskLevel) {
          const next = { ...current };
          delete next[regionId];
          return next;
        }

        return {
          ...current,
          [regionId]: riskLevel,
        };
      });
    },
    [],
  );

  const handleGenerateAssessment = async () => {
    if (!selectedRegionId) return;

    setGenerating(true);
    setError(null);
    setNotice(null);

    try {
      await fetchJson("/api/assessments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionId: selectedRegionId, locale }),
      });

      const [regionsPayload, portfolioPayload] = await Promise.all([
        fetchJson<RegionSummary[]>(`/api/regions?${localeSearchParam(locale)}`),
        fetchJson<PortfolioSummary>(`/api/portfolio?${localeSearchParam(locale)}`),
      ]);

      setRegions(regionsPayload);
      setPortfolio(portfolioPayload);
      await loadRegion(selectedRegionId);
      setNotice(dictionary.dashboard.noticeBody);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : dictionary.dashboard.unableGenerate,
      );
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <DashboardLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-teal-700">
            <MapPinned className="h-4 w-4" />
            {dictionary.dashboard.eyebrow}
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            {dictionary.dashboard.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {dictionary.dashboard.subtitle}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <RegionSelector
            regions={regions}
            selectedRegionId={selectedRegionId}
            onSelect={handleSelectRegion}
          />
          <GenerateAssessmentButton
            regionId={selectedRegionId}
            isGenerating={generating}
            onGenerate={handleGenerateAssessment}
          />
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="absolute left-4 top-4 h-4 w-4" />
          <div className="pl-7">
            <AlertTitle>{dictionary.dashboard.issueTitle}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </div>
        </Alert>
      ) : null}

      {notice ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <CalendarClock className="absolute left-4 top-4 h-4 w-4 text-emerald-700" />
          <div className="pl-7">
            <AlertTitle>{dictionary.dashboard.noticeTitle}</AlertTitle>
            <AlertDescription>{notice}</AlertDescription>
          </div>
        </Alert>
      ) : null}

      <PortfolioSummaryCards portfolio={portfolio} />

      <MorningOperationsPanel workflow={workflow} />

      <LoanReviewWorkflow
        workflow={workflow}
        onSelectRegion={handleSelectRegion}
        onProjectionRiskChange={handleProjectionRiskChange}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <Card>
          <CardHeader className="flex-col gap-2 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{dictionary.dashboard.mapTitle}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {dictionary.dashboard.mapDescription}
              </p>
            </div>
            {selectedSummary ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {dictionary.dashboard.selected}:{" "}
                <span className="font-semibold text-slate-950">
                  {selectedSummary.name}
                </span>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            <RegionMap
              regions={regions}
              selectedRegionId={selectedRegionId}
              onSelectRegion={handleSelectRegion}
              riskLevelOverrides={mapRiskOverrides}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <RiskScoreCard assessment={selectedRegion?.latestRiskAssessment ?? null} />
          <RegionSnapshotCard region={selectedRegion} loading={regionLoading} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <FinancialImpactEstimates region={selectedRegion} />
        <ScenarioProjectionPanel region={selectedRegion} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <RiskTrendChart history={history} />
        <div className="space-y-6">
          <FinancialInterpretationPanel
            assessment={selectedRegion?.latestRiskAssessment ?? null}
          />
          <RecommendationPanel
            assessment={selectedRegion?.latestRiskAssessment ?? null}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <CardTitle>{dictionary.climate.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {dictionary.climate.latestDescription}
            </p>
          </CardHeader>
          <CardContent>
            <ClimateIndicatorCards
              snapshot={selectedRegion?.latestClimateSnapshot ?? null}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dictionary.assessmentsTable.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {dictionary.assessmentsTable.subtitle}
            </p>
          </CardHeader>
          <CardContent>
            <RecentAssessmentsTable assessments={selectedRegion?.riskAssessments ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RegionSnapshotCard({
  region,
  loading,
}: {
  region: RegionDetail | null;
  loading: boolean;
}) {
  const { dictionary, locale } = useI18n();

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
          <div className="h-20 animate-pulse rounded bg-slate-100" />
        </CardContent>
      </Card>
    );
  }

  if (!region) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-slate-500">
          {dictionary.dashboard.selectRegionPrompt}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{region.name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {dictionary.regionType[region.type]} | {region.cropType}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              {dictionary.regionsPage.area}
            </p>
            <p className="mt-1 font-semibold text-slate-950">
              {formatNumber(region.areaHectares, 0, locale)}{" "}
              {dictionary.units.hectares}
            </p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              {dictionary.regionsPage.country}
            </p>
            <p className="mt-1 font-semibold text-slate-950">{region.country}</p>
          </div>
        </div>
        <Separator />
        <div className="text-sm leading-6 text-slate-600">
          {region.latestRiskAssessment?.explanation ??
            dictionary.dashboard.noExplanation}
        </div>
        {region.latestClimateSnapshot ? (
          <p className="text-xs text-slate-500">
            {dictionary.dashboard.latestSnapshot}:{" "}
            {formatDate(region.latestClimateSnapshot.date, locale)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MapLoading() {
  const { dictionary } = useI18n();

  return (
    <div className="flex h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500">
      {dictionary.dashboard.loadingMap}
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="h-[520px] animate-pulse rounded-lg bg-slate-200" />
        <div className="h-[520px] animate-pulse rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}
