import { BarChart3, CircleDollarSign, Gauge, Layers3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";
import type { PortfolioSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function PortfolioSummaryCards({
  portfolio,
}: {
  portfolio: PortfolioSummary | null;
}) {
  const { dictionary, locale } = useI18n();
  const cards = [
    {
      label: dictionary.portfolioCards.totalExposure,
      value: portfolio ? formatCurrency(portfolio.totalExposure, locale) : "-",
      detail: portfolio?.institutionName ?? dictionary.portfolioCards.unavailable,
      icon: CircleDollarSign,
    },
    {
      label: dictionary.portfolioCards.weightedRisk,
      value: portfolio ? `${portfolio.weightedAverageRisk.toFixed(1)}` : "-",
      detail: dictionary.portfolioCards.exposureAdjusted,
      icon: Gauge,
    },
    {
      label: dictionary.portfolioCards.regionsMonitored,
      value: portfolio
        ? String(
            portfolio.riskCounts.LOW +
              portfolio.riskCounts.MEDIUM +
              portfolio.riskCounts.HIGH,
          )
        : "-",
      detail: dictionary.portfolioCards.regionTypes,
      icon: Layers3,
    },
    {
      label: dictionary.portfolioCards.highRiskRegions,
      value: portfolio ? String(portfolio.riskCounts.HIGH) : "-",
      detail: dictionary.portfolioCards.closerReview,
      icon: BarChart3,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {card.value}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{card.detail}</p>
                </div>
                <div className="rounded-md bg-slate-950 p-2 text-white">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
