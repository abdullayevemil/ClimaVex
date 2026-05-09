"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, FileText, Printer } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/components/locale-provider";
import { RegionSelector } from "@/components/region-selector";
import { fetchJson } from "@/lib/fetch-json";
import { localeSearchParam } from "@/lib/i18n";
import { riskMeta } from "@/lib/risk-ui";
import type { RegionDetail, RegionSummary } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

export function ReportsPageClient() {
  const { dictionary, locale } = useI18n();
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [region, setRegion] = useState<RegionDetail | null>(null);
  const [timestamp, setTimestamp] = useState(new Date().toISOString());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRegion = useCallback(async (regionId: string) => {
    setError(null);
    const detail = await fetchJson<RegionDetail>(
      `/api/regions/${regionId}?${localeSearchParam(locale)}`,
    );
    setRegion(detail);
    setTimestamp(new Date().toISOString());
  }, [locale]);

  useEffect(() => {
    async function loadData() {
      try {
        const regionList = await fetchJson<RegionSummary[]>(
          `/api/regions?${localeSearchParam(locale)}`,
        );
        setRegions(regionList);

        if (regionList[0]) {
          setSelectedRegionId(regionList[0].id);
          await loadRegion(regionList[0].id);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : dictionary.reportsPage.unableLoad,
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [dictionary.reportsPage.unableLoad, loadRegion, locale]);

  const handleSelect = (regionId: string) => {
    setSelectedRegionId(regionId);
    void loadRegion(regionId);
  };

  const assessment = region?.latestRiskAssessment ?? null;
  const climate = region?.latestClimateSnapshot ?? null;
  const meta = assessment ? riskMeta[assessment.riskLevel] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-teal-700">
            <FileText className="h-4 w-4" />
            {dictionary.reportsPage.eyebrow}
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            {dictionary.reportsPage.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {dictionary.reportsPage.subtitle}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <RegionSelector
            regions={regions}
            selectedRegionId={selectedRegionId}
            onSelect={handleSelect}
          />
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            {dictionary.reportsPage.print}
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="absolute left-4 top-4 h-4 w-4" />
          <div className="pl-7">
            <AlertTitle>{dictionary.reportsPage.issueTitle}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </div>
        </Alert>
      ) : null}

      {loading ? (
        <div className="h-[720px] animate-pulse rounded-lg bg-slate-200" />
      ) : (
        <Card className="mx-auto max-w-5xl print:border-none print:shadow-none">
          <CardHeader className="border-b border-slate-200">
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <p className="text-sm font-semibold uppercase text-teal-700">
                  {dictionary.reportsPage.reportBrand}
                </p>
                <CardTitle className="mt-2 text-2xl">
                  {dictionary.reportsPage.reportTitle}
                </CardTitle>
                <p className="mt-2 text-sm text-slate-500">
                  {dictionary.reportsPage.generated}{" "}
                  {formatDate(timestamp, locale)}
                </p>
              </div>
              {assessment && meta ? (
                <Badge variant="outline" className={meta.badgeClass}>
                  {dictionary.risk[assessment.riskLevel]}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            {region ? (
              <>
                <section className="grid gap-6 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {dictionary.reportsPage.selectedRegion}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {region.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {region.cropType} |{" "}
                      {formatNumber(region.areaHectares, 0, locale)}{" "}
                      {dictionary.units.hectares}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {dictionary.reportsPage.riskLevel}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {assessment
                        ? dictionary.risk[assessment.riskLevel]
                        : dictionary.reportsPage.unavailable}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {dictionary.reportsPage.scoringModel}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {dictionary.reportsPage.riskScore}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {assessment ? `${assessment.riskScore.toFixed(0)} / 100` : "-"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {dictionary.reportsPage.assessmentBasis}
                    </p>
                  </div>
                </section>

                <Separator />

                <section>
                  <h2 className="text-base font-semibold text-slate-950">
                    {dictionary.reportsPage.climateIndicators}
                  </h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <ReportMetric
                      label={dictionary.climate.rainfall}
                      value={climate ? `${climate.rainfallMm.toFixed(0)} mm` : "-"}
                    />
                    <ReportMetric
                      label={dictionary.climate.temperature}
                      value={
                        climate
                          ? `${climate.temperatureC.toFixed(1)} ${
                              dictionary.units.celsius
                            }`
                          : "-"
                      }
                    />
                    <ReportMetric
                      label={dictionary.climate.soilMoisture}
                      value={climate ? `${climate.soilMoisture.toFixed(0)}%` : "-"}
                    />
                    <ReportMetric
                      label={dictionary.climate.vegetation}
                      value={climate ? climate.vegetationIndex.toFixed(2) : "-"}
                    />
                    <ReportMetric
                      label={dictionary.climate.droughtIndex}
                      value={climate ? `${climate.droughtIndex.toFixed(0)} / 100` : "-"}
                    />
                    <ReportMetric
                      label={dictionary.climate.floodExposure}
                      value={climate ? `${climate.floodExposure.toFixed(0)} / 100` : "-"}
                    />
                  </div>
                </section>

                <Separator />

                <section className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      {dictionary.reportsPage.interpretation}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {assessment?.financialInterpretation ??
                        dictionary.reportsPage.noInterpretation}
                    </p>
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      {dictionary.reportsPage.recommendation}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {assessment?.recommendation ??
                        dictionary.reportsPage.noRecommendation}
                    </p>
                  </div>
                </section>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 p-8 text-sm text-slate-500">
                {dictionary.reportsPage.selectRegion}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}
