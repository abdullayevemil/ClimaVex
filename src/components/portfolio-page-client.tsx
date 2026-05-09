"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Landmark } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/components/locale-provider";
import { PortfolioMonitoringPanel } from "@/components/portfolio-monitoring-panel";
import { PortfolioSummaryCards } from "@/components/portfolio-summary-cards";
import { fetchJson } from "@/lib/fetch-json";
import { localeSearchParam } from "@/lib/i18n";
import { riskMeta } from "@/lib/risk-ui";
import type { PortfolioSummary, RiskLevel, WorkflowSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const riskLevels: RiskLevel[] = ["LOW", "MEDIUM", "HIGH"];

export function PortfolioPageClient() {
  const { dictionary, locale } = useI18n();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        const [portfolioPayload, workflowPayload] = await Promise.all([
          fetchJson<PortfolioSummary>(
            `/api/portfolio?${localeSearchParam(locale)}`,
          ),
          fetchJson<WorkflowSummary>(`/api/workflow?${localeSearchParam(locale)}`),
        ]);
        setPortfolio(portfolioPayload);
        setWorkflow(workflowPayload);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : dictionary.portfolioPage.unableLoad,
        );
      } finally {
        setLoading(false);
      }
    }

    void loadPortfolio();
  }, [dictionary.portfolioPage.unableLoad, locale]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-slate-950 p-3 text-white">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
            {dictionary.portfolioPage.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {dictionary.portfolioPage.subtitle}
          </p>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="absolute left-4 top-4 h-4 w-4" />
          <div className="pl-7">
            <AlertTitle>{dictionary.portfolioPage.issueTitle}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </div>
        </Alert>
      ) : null}

      <PortfolioSummaryCards portfolio={portfolio} />

      <PortfolioMonitoringPanel workflow={workflow} />

      {portfolio ? (
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>{dictionary.portfolioPage.distributionTitle}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {dictionary.portfolioPage.distributionSubtitle}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {riskLevels.map((level) => {
                const count = portfolio.riskCounts[level];
                const total =
                  portfolio.riskCounts.LOW +
                  portfolio.riskCounts.MEDIUM +
                  portfolio.riskCounts.HIGH;
                const percent = total ? (count / total) * 100 : 0;
                const meta = riskMeta[level];

                return (
                  <div key={level} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {dictionary.risk[level]}
                      </span>
                      <span className="font-semibold text-slate-950">{count}</span>
                    </div>
                    <Progress value={percent} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{dictionary.portfolioPage.topRiskyTitle}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {dictionary.portfolioPage.topRiskySubtitle}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dictionary.portfolioPage.region}</TableHead>
                    <TableHead>{dictionary.portfolioPage.crop}</TableHead>
                    <TableHead>{dictionary.portfolioPage.risk}</TableHead>
                    <TableHead className="text-right">
                      {dictionary.portfolioPage.exposure}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolio.topRiskyRegions.map((region) => {
                    const meta = riskMeta[region.riskLevel];

                    return (
                      <TableRow key={region.id}>
                        <TableCell className="font-semibold text-slate-950">
                          {region.name}
                        </TableCell>
                        <TableCell>{region.cropType}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={meta.badgeClass}>
                              {dictionary.risk[region.riskLevel]}
                            </Badge>
                            <span className="font-semibold">
                              {region.riskScore.toFixed(0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(region.exposureAmount, locale)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
