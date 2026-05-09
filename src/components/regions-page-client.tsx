"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/components/locale-provider";
import { fetchJson } from "@/lib/fetch-json";
import { localeSearchParam } from "@/lib/i18n";
import { riskMeta } from "@/lib/risk-ui";
import type { RegionSummary } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

export function RegionsPageClient() {
  const { dictionary, locale } = useI18n();
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRegions() {
      try {
        setRegions(
          await fetchJson<RegionSummary[]>(
            `/api/regions?${localeSearchParam(locale)}`,
          ),
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : dictionary.regionsPage.unableLoad,
        );
      } finally {
        setLoading(false);
      }
    }

    void loadRegions();
  }, [dictionary.regionsPage.unableLoad, locale]);

  const filteredRegions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return regions;

    return regions.filter((region) =>
      [region.name, region.cropType, region.country, region.type]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, regions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
            {dictionary.regionsPage.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {dictionary.regionsPage.subtitle}
          </p>
        </div>
        <div className="flex h-10 w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm lg:w-80">
          <Search className="h-4 w-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
            placeholder={dictionary.regionsPage.searchPlaceholder}
          />
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="absolute left-4 top-4 h-4 w-4" />
          <div className="pl-7">
            <AlertTitle>{dictionary.regionsPage.errorTitle}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </div>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{dictionary.regionsPage.tableTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {filteredRegions.length} {dictionary.regionsPage.activeRecords}
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-72 animate-pulse rounded-lg bg-slate-100" />
          ) : filteredRegions.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 p-8 text-sm text-slate-500">
              {dictionary.regionsPage.empty}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dictionary.regionsPage.region}</TableHead>
                  <TableHead>{dictionary.regionsPage.type}</TableHead>
                  <TableHead>{dictionary.regionsPage.crop}</TableHead>
                  <TableHead className="text-right">
                    {dictionary.regionsPage.area}
                  </TableHead>
                  <TableHead>{dictionary.regionsPage.latestRisk}</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    {dictionary.regionsPage.climateSnapshot}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegions.map((region) => {
                  const riskLevel = region.latestRiskAssessment?.riskLevel ?? "LOW";
                  const meta = riskMeta[riskLevel];

                  return (
                    <TableRow key={region.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-950">
                          {region.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {region.latitude.toFixed(2)}, {region.longitude.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>{dictionary.regionType[region.type]}</TableCell>
                      <TableCell>{region.cropType}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(region.areaHectares, 0, locale)}{" "}
                        {dictionary.units.hectares}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={meta.badgeClass}>
                            {dictionary.risk[riskLevel]}
                          </Badge>
                          <span className="text-sm font-semibold text-slate-900">
                            {region.latestRiskAssessment?.riskScore.toFixed(0) ?? "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-slate-600 lg:table-cell">
                        {region.latestClimateSnapshot
                          ? formatDate(region.latestClimateSnapshot.date, locale)
                          : dictionary.regionsPage.noSnapshot}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
