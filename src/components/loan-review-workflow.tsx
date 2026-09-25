"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle2,
  FileText,
  Landmark,
  Loader2,
  MapPin,
  Radar,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/locale-provider";
import { fetchJson } from "@/lib/fetch-json";
import { riskMeta } from "@/lib/risk-ui";
import type {
  ClimateReportDto,
  LoanDecisionDto,
  LoanReviewResult,
  RiskLevel,
  WorkflowSummary,
} from "@/lib/types";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

const years = [2026, 2030, 2050] as const;
const scenarios = ["SSP1-2.6", "SSP2-4.5", "SSP5-8.5"] as const;
const crops = ["Winter wheat", "Irrigated cotton", "Olives", "Greenhouse vegetables"];

export function LoanReviewWorkflow({
  workflow,
  onSelectRegion,
  onProjectionRiskChange,
}: {
  workflow: WorkflowSummary | null;
  onSelectRegion: (regionId: string) => void;
  onProjectionRiskChange: (regionId: string, riskLevel: RiskLevel | null) => void;
}) {
  const { dictionary, locale } = useI18n();
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [cropType, setCropType] = useState(crops[0]);
  const [coordinates, setCoordinates] = useState("37.1811, 33.2150");
  const [review, setReview] = useState<LoanReviewResult | null>(null);
  const [yearIndex, setYearIndex] = useState(0);
  const [scenario, setScenario] =
    useState<(typeof scenarios)[number]>("SSP2-4.5");
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [report, setReport] = useState<ClimateReportDto | null>(null);
  const [decision, setDecision] = useState<LoanDecisionDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applications = workflow?.pendingApplications ?? [];
  const selectedApplication = useMemo(
    () =>
      applications.find((application) => application.id === selectedLoanId) ??
      applications[0] ??
      null,
    [applications, selectedLoanId],
  );

  useEffect(() => {
    if (!applications[0] || selectedLoanId) return;
    setSelectedLoanId(applications[0].id);
  }, [applications, selectedLoanId]);

  useEffect(() => {
    if (!selectedApplication) return;
    setCropType(selectedApplication.cropType);
    setCoordinates(
      `${selectedApplication.latitude.toFixed(4)}, ${selectedApplication.longitude.toFixed(4)}`,
    );
    onSelectRegion(selectedApplication.region.id);
    // The application id is the stable workflow pivot; parent callbacks can
    // change as dashboard data refreshes.
  }, [selectedApplication?.id]);

  const selectedYear = years[yearIndex];
  const selectedProjection = useMemo(
    () =>
      review?.projections.find(
        (projection) =>
          projection.scenario === scenario && projection.year === selectedYear,
      ) ?? null,
    [review, scenario, selectedYear],
  );

  useEffect(() => {
    if (!selectedApplication || !selectedProjection) {
      if (selectedApplication) {
        onProjectionRiskChange(selectedApplication.region.id, null);
      }
      return;
    }

    onProjectionRiskChange(
      selectedApplication.region.id,
      selectedProjection.riskLevel,
    );

    return () => {
      onProjectionRiskChange(selectedApplication.region.id, null);
    };
  }, [onProjectionRiskChange, selectedApplication, selectedProjection]);

  async function handleReview() {
    if (!selectedApplication) return;

    setError(null);
    setReviewLoading(true);

    try {
      const payload = await fetchJson<LoanReviewResult>(
        `/api/loan-applications/${selectedApplication.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale, cropType }),
        },
      );
      setReview(payload);
      setBreakdownOpen(true);
      setYearIndex(0);
      onSelectRegion(selectedApplication.region.id);
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : dictionary.workflow.unableReview,
      );
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleReport() {
    if (!selectedApplication) return;

    setError(null);
    setReportLoading(true);

    try {
      setReport(
        await fetchJson<ClimateReportDto>("/api/reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loanApplicationId: selectedApplication.id,
            locale,
          }),
        }),
      );
    } catch (reportError) {
      setError(
        reportError instanceof Error
          ? reportError.message
          : dictionary.workflow.unableReport,
      );
    } finally {
      setReportLoading(false);
    }
  }

  async function handleDecision() {
    if (!selectedApplication || !review) return;

    setError(null);
    setDecisionLoading(true);

    try {
      setDecision(
        await fetchJson<LoanDecisionDto>(
          `/api/loan-applications/${selectedApplication.id}/decision`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              maxLtv: review.creditRecommendation.recommendedLtv,
              provisioningRateAdjustment:
                review.creditRecommendation.provisioningRateIncrease,
              insuranceRequirement:
                review.creditRecommendation.insuranceRequirement,
              note: review.creditRecommendation.summary,
              decidedBy: workflow?.user.name,
            }),
          },
        ),
      );
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : dictionary.workflow.unableDecision,
      );
    } finally {
      setDecisionLoading(false);
    }
  }

  if (!workflow || !selectedApplication) {
    return (
      <Card>
        <CardContent className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </Card>
    );
  }

  const currentMeta = review ? riskMeta[review.riskLevel] : null;
  const projectedMeta = selectedProjection
    ? riskMeta[selectedProjection.riskLevel]
    : null;

  return (
    <Card className="overflow-hidden border-slate-200">
      <CardHeader className="border-b border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-teal-700">
              <Landmark className="h-4 w-4" />
              {dictionary.workflow.loanTitle}
            </div>
            <CardTitle className="mt-2 text-xl text-slate-950">
              {selectedApplication.applicantName} |{" "}
              {selectedApplication.locationLabel}
            </CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {dictionary.workflow.loanSubtitle}
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-amber-200 bg-amber-50 text-amber-800">
            {dictionary.workflow.applicationQueue}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-5">
        {error ? (
          <Alert variant="destructive">
            <ShieldAlert className="absolute left-4 top-4 h-4 w-4" />
            <div className="pl-7">
              <AlertTitle>{dictionary.dashboard.issueTitle}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </div>
          </Alert>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                {dictionary.workflow.applicant}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {selectedApplication.applicantName}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <MiniMetric
                  label={dictionary.workflow.requestedLoan}
                  value={formatCurrency(selectedApplication.requestedAmount, locale)}
                />
                <MiniMetric
                  label={dictionary.workflow.tenor}
                  value={`${selectedApplication.tenorYears} years`}
                />
                <MiniMetric
                  label={dictionary.workflow.area}
                  value={`${formatNumber(
                    selectedApplication.areaHectares,
                    0,
                    locale,
                  )} ${dictionary.units.hectares}`}
                />
                <MiniMetric
                  label={dictionary.workflow.district}
                  value={selectedApplication.locationLabel}
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="grid gap-3">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  {dictionary.workflow.coordinates}
                  <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <MapPin className="h-4 w-4 text-teal-700" />
                    <input
                      value={coordinates}
                      onChange={(event) => setCoordinates(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent outline-none"
                    />
                  </div>
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  {dictionary.workflow.cropSelection}
                  <Select value={cropType} onValueChange={setCropType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {crops.map((crop) => (
                        <SelectItem key={crop} value={crop}>
                          {crop}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <Button
                  onClick={handleReview}
                  disabled={reviewLoading}
                  className="mt-1 bg-teal-700 text-white hover:bg-teal-800"
                >
                  {reviewLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Radar className="h-4 w-4" />
                  )}
                  {reviewLoading
                    ? dictionary.workflow.runningReview
                    : dictionary.workflow.runReview}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
              <div
                className={cn(
                  "rounded-lg border p-5",
                  currentMeta
                    ? currentMeta.bgClass
                    : "border-slate-200 bg-slate-50",
                )}
              >
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {dictionary.workflow.currentRisk}
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-normal text-slate-950">
                  {review ? `${review.score5.toFixed(1)} / 5` : "-"}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {review && currentMeta ? (
                    <Badge variant="outline" className={currentMeta.badgeClass}>
                      {review.displayLevel}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                  {review ? (
                    <span className="text-xs text-slate-500">
                      {review.latencyMs / 1000}s workflow
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {dictionary.workflow.dataPipeline}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {review?.modelMode ?? dictionary.workflow.modelDisclosure}
                    </p>
                  </div>
                  <SlidersHorizontal className="h-4 w-4 text-teal-700" />
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {(review?.dataSources ?? []).map((source) => (
                    <div
                      key={`${source.label}-${source.window}`}
                      className="rounded-md border border-slate-200 bg-slate-50 p-3"
                    >
                      <p className="text-xs font-semibold text-slate-900">
                        {source.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{source.window}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {source.value}
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-slate-500">
                        {source.mode}
                      </p>
                    </div>
                  ))}
                  {!review ? (
                    <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500 md:col-span-2">
                      {dictionary.workflow.modelDisclosure}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {dictionary.workflow.factorBreakdown}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {dictionary.workflow.modelDisclosure}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBreakdownOpen((open) => !open)}
                  disabled={!review}
                >
                  {breakdownOpen
                    ? dictionary.workflow.hideBreakdown
                    : dictionary.workflow.viewBreakdown}
                </Button>
              </div>
              {breakdownOpen && review ? (
                <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                  <FactorContributionChart review={review} />
                  <div className="space-y-2">
                    {review.factorContributions.map((factor) => (
                      <div
                        key={factor.id}
                        className="rounded-md border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-950">
                            {factor.label}
                          </p>
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              factor.value < 0 ? "text-emerald-700" : "text-red-700",
                            )}
                          >
                            {factor.value > 0 ? "+" : ""}
                            {factor.value.toFixed(1)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          {factor.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-950">
                  {dictionary.workflow.projections}
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    {dictionary.workflow.scenario}
                    <Select
                      value={scenario}
                      onValueChange={(value) =>
                        setScenario(value as (typeof scenarios)[number])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {scenarios.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    {dictionary.workflow.timeline}: {selectedYear}
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={1}
                      value={yearIndex}
                      onChange={(event) => setYearIndex(Number(event.target.value))}
                      className="accent-teal-700"
                      disabled={!review}
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      {years.map((year) => (
                        <span key={year}>{year}</span>
                      ))}
                    </div>
                  </label>
                </div>
                {selectedProjection && projectedMeta ? (
                  <div
                    className={cn(
                      "mt-5 rounded-lg border p-4",
                      projectedMeta.bgClass,
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          {scenario} | {selectedYear}
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-slate-950">
                          {selectedProjection.score5.toFixed(1)} / 5
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={projectedMeta.badgeClass}
                      >
                        {dictionary.risk[selectedProjection.riskLevel]}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {selectedProjection.note}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {dictionary.workflow.confidenceRange}:{" "}
                      {selectedProjection.confidenceLow.toFixed(1)}-
                      {selectedProjection.confidenceHigh.toFixed(1)}
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    {dictionary.workflow.runReview}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white">
                <p className="text-sm font-semibold">
                  {dictionary.workflow.creditRecommendation}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {review
                    ? review.creditRecommendation.summary
                    : dictionary.workflow.modelDisclosure}
                </p>
                {review ? (
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <MiniDarkMetric
                      label="LTV"
                      value={`${review.creditRecommendation.recommendedLtv}%`}
                    />
                    <MiniDarkMetric
                      label="Provision"
                      value={`+${review.creditRecommendation.provisioningRateIncrease}%`}
                    />
                    <MiniDarkMetric
                      label="TARSİM"
                      value="Required"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-950">
                  {dictionary.workflow.reportTitle}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {report?.summary ?? dictionary.reportsPage.subtitle}
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={handleReport}
                  disabled={!review || reportLoading}
                >
                  {reportLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {reportLoading
                    ? dictionary.workflow.exportingReport
                    : dictionary.workflow.exportReport}
                </Button>
                {report ? (
                  <p className="mt-3 text-xs font-semibold text-emerald-700">
                    {dictionary.workflow.reportReady}: {report.reportNumber}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-950">
                  {dictionary.workflow.decisionTitle}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {decision?.note ?? dictionary.workflow.auditTrail}
                </p>
                <Button
                  className="mt-4 bg-slate-950 text-white hover:bg-slate-800"
                  onClick={handleDecision}
                  disabled={!review || decisionLoading}
                >
                  {decisionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {dictionary.workflow.approveWithConditions}
                </Button>
                {decision ? (
                  <p className="mt-3 text-xs font-semibold text-emerald-700">
                    {dictionary.workflow.decisionLogged}: LTV{" "}
                    {decision.maxLtv.toFixed(0)}%
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white p-3">
      <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function MiniDarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
      <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function FactorContributionChart({ review }: { review: LoanReviewResult }) {
  return (
    <div className="h-[320px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={review.factorContributions}
          layout="vertical"
          margin={{ left: 18, right: 18, top: 8, bottom: 8 }}
        >
          <CartesianGrid stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" domain={[-0.4, 1]} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#475569", fontSize: 12 }}
          />
          <RechartsTooltip
            formatter={(value) => [`${Number(value).toFixed(1)}`, "Contribution"]}
            contentStyle={{
              borderRadius: "8px",
              borderColor: "#cbd5e1",
            }}
          />
          <ReferenceLine x={0} stroke="#94a3b8" />
          <Bar dataKey="value" radius={[4, 4, 4, 4]}>
            {review.factorContributions.map((factor) => (
              <Cell
                key={factor.id}
                fill={factor.value < 0 ? "#059669" : "#dc2626"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
