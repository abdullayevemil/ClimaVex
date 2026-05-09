"use client";

import {
  Banknote,
  CircleDollarSign,
  Percent,
  ShieldPlus,
  TrendingDown,
  Wheat,
  WalletCards,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";
import { calculateFinancialImpact } from "@/lib/financial-analytics";
import type { RegionDetail } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function FinancialImpactEstimates({
  region,
}: {
  region: RegionDetail | null;
}) {
  const { dictionary, locale } = useI18n();
  const impact = calculateFinancialImpact(region);

  if (!impact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dictionary.financialImpact.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {dictionary.financialImpact.empty}
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: dictionary.financialImpact.exposure,
      value: formatCurrency(impact.exposureAmount, locale),
      icon: CircleDollarSign,
    },
    {
      label: dictionary.financialImpact.expectedLoss,
      value: formatCurrency(impact.expectedLoss, locale),
      icon: Banknote,
    },
    {
      label: dictionary.financialImpact.capitalBuffer,
      value: formatCurrency(impact.capitalBuffer, locale),
      icon: ShieldPlus,
    },
    {
      label: dictionary.financialImpact.premiumUplift,
      value: formatCurrency(impact.premiumUplift, locale),
      icon: WalletCards,
    },
    {
      label: dictionary.financialImpact.liquidityStress,
      value: formatCurrency(impact.liquidityStress, locale),
      icon: TrendingDown,
    },
    {
      label: dictionary.financialImpact.yieldRevenueAtRisk,
      value: formatCurrency(impact.yieldRevenueAtRisk, locale),
      icon: Wheat,
    },
    {
      label: dictionary.financialImpact.impactRate,
      value: `${(impact.impactRate * 100).toFixed(1)}%`,
      icon: Percent,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dictionary.financialImpact.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {dictionary.financialImpact.subtitle}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <div
                key={metric.label}
                className="rounded-md border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {metric.value}
                    </p>
                  </div>
                  <div className="rounded-md bg-teal-50 p-2 text-teal-700">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
          {dictionary.financialImpact.note}
        </div>
      </CardContent>
    </Card>
  );
}
