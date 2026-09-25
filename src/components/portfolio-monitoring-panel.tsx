"use client";

import { useMemo, useState } from "react";
import { BellRing, Forward, Loader2, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";
import { fetchJson } from "@/lib/fetch-json";
import { riskMeta } from "@/lib/risk-ui";
import type { ClimateAlertDto, WorkflowSummary } from "@/lib/types";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

export function PortfolioMonitoringPanel({
  workflow,
}: {
  workflow: WorkflowSummary | null;
}) {
  const { dictionary, locale } = useI18n();
  const [forwardedAlert, setForwardedAlert] = useState<ClimateAlertDto | null>(null);
  const [forwarding, setForwarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alert = forwardedAlert ?? workflow?.alerts[0] ?? null;

  const cells = useMemo(
    () =>
      Array.from({ length: workflow?.portfolio.activeLoans ?? 340 }).map((_, index) => {
        if (index >= 82 && index < 94) return "HIGH";
        if (index % 7 === 0 || index % 11 === 0) return "MEDIUM";
        return "LOW";
      }),
    [workflow?.portfolio.activeLoans],
  );

  async function handleForward() {
    if (!alert) return;

    setError(null);
    setForwarding(true);

    try {
      setForwardedAlert(
        await fetchJson<ClimateAlertDto>(`/api/alerts/${alert.id}/forward`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        }),
      );
    } catch (forwardError) {
      setError(
        forwardError instanceof Error
          ? forwardError.message
          : dictionary.portfolioMonitoring.unableForward,
      );
    } finally {
      setForwarding(false);
    }
  }

  if (!workflow) {
    return (
      <Card>
        <CardContent className="h-80 animate-pulse rounded-lg bg-slate-100" />
      </Card>
    );
  }

  const alertMeta = alert ? riskMeta[alert.severity] : riskMeta.MEDIUM;

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-teal-700">
              <TrendingUp className="h-4 w-4" />
              {dictionary.portfolioMonitoring.title}
            </div>
            <CardTitle className="mt-2 text-xl text-slate-950">
              {dictionary.portfolioMonitoring.heatMapTitle}
            </CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {dictionary.portfolioMonitoring.subtitle}
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
            {formatNumber(workflow.portfolio.activeLoans, 0, locale)} loans
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{dictionary.portfolioPage.issueTitle}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {dictionary.portfolioMonitoring.heatMapTitle}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {dictionary.portfolioMonitoring.heatMapSubtitle}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                <span className="h-2.5 w-2.5 rounded-sm bg-red-600" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(34,minmax(0,1fr))]">
              {cells.map((risk, index) => (
                <div
                  key={index}
                  className={cn(
                    "aspect-square rounded-[2px] transition hover:scale-125",
                    risk === "LOW" && "bg-emerald-500/70",
                    risk === "MEDIUM" && "bg-amber-500/80",
                    risk === "HIGH" && "bg-red-600 ring-1 ring-red-800/30",
                  )}
                  title={`${risk} loan ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className={cn("rounded-lg border p-5", alertMeta.bgClass)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {dictionary.portfolioMonitoring.alertTitle}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {alert?.triggerType}
                </p>
              </div>
              <BellRing className="h-5 w-5 text-red-700" />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-950">
              {alert?.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {alert?.message}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <ClusterMetric
                label={dictionary.portfolioMonitoring.affectedLoans}
                value={alert ? formatNumber(alert.affectedLoans, 0, locale) : "-"}
              />
              <ClusterMetric
                label={dictionary.portfolioMonitoring.exposure}
                value={alert ? formatCurrency(alert.exposureAmount, locale) : "-"}
              />
            </div>
            <div className="mt-5 rounded-md border border-slate-200 bg-white/70 p-4">
              <p className="text-sm font-semibold text-slate-950">
                {dictionary.portfolioMonitoring.stressTestTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {dictionary.portfolioMonitoring.stressTestBody}
              </p>
            </div>
            <Button
              className="mt-5 w-full bg-slate-950 text-white hover:bg-slate-800"
              onClick={handleForward}
              disabled={forwarding || !alert}
            >
              {forwarding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Forward className="h-4 w-4" />
              )}
              {alert?.status === "FORWARDED"
                ? dictionary.portfolioMonitoring.forwarded
                : dictionary.portfolioMonitoring.forwardAlert}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClusterMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white/80 p-3">
      <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
