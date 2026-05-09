"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";
import { buildScenarioProjections, type ScenarioId } from "@/lib/financial-analytics";
import { riskMeta } from "@/lib/risk-ui";
import type { RegionDetail } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const scenarioColors: Record<ScenarioId, string> = {
  base: "#0f766e",
  dry: "#d97706",
  flood: "#2563eb",
  mitigation: "#16a34a",
};

const scenarioOrder: ScenarioId[] = ["base", "dry", "flood", "mitigation"];

export function ScenarioProjectionPanel({
  region,
}: {
  region: RegionDetail | null;
}) {
  const { dictionary, locale } = useI18n();
  const projections = buildScenarioProjections(region);

  if (projections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dictionary.scenarioProjection.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {dictionary.scenarioProjection.empty}
        </CardContent>
      </Card>
    );
  }

  const chartData = [0, 3, 6, 9, 12].map((month) => {
    const point: Record<string, number | string> = {
      month: `${dictionary.scenarioProjection.month} ${month}`,
    };

    for (const scenario of scenarioOrder) {
      const projection = projections.find(
        (item) => item.id === scenario && item.month === month,
      );
      point[scenario] = projection?.riskScore ?? 0;
    }

    return point;
  });

  const month12 = scenarioOrder.map((scenario) => {
    const projection = projections.find(
      (item) => item.id === scenario && item.month === 12,
    );

    return projection;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dictionary.scenarioProjection.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {dictionary.scenarioProjection.subtitle}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  borderColor: "#cbd5e1",
                  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                }}
              />
              <Legend />
              {scenarioOrder.map((scenario) => (
                <Line
                  key={scenario}
                  type="monotone"
                  dataKey={scenario}
                  name={dictionary.scenarioProjection.scenario[scenario]}
                  stroke={scenarioColors[scenario]}
                  strokeWidth={2.5}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {month12.map((projection) => {
            if (!projection) return null;
            const meta = riskMeta[projection.riskLevel];

            return (
              <div
                key={projection.id}
                className="rounded-md border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {dictionary.scenarioProjection.scenario[projection.id]}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {dictionary.scenarioProjection.description[projection.id]}
                    </p>
                  </div>
                  <Badge variant="outline" className={meta.badgeClass}>
                    {dictionary.risk[projection.riskLevel]}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {dictionary.scenarioProjection.projectedRisk}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">
                      {projection.riskScore.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {dictionary.scenarioProjection.projectedLoss}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">
                      {formatCurrency(projection.expectedLoss, locale)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
