"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RegionHistoryPoint } from "@/lib/types";
import { intlLocales } from "@/lib/i18n";

function formatShortDate(value: string, locale: keyof typeof intlLocales) {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    month: "short",
  }).format(new Date(value));
}

export function RiskTrendChart({
  history,
}: {
  history: RegionHistoryPoint[];
}) {
  const { dictionary, locale } = useI18n();

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dictionary.chart.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {dictionary.chart.empty}
        </CardContent>
      </Card>
    );
  }

  const data = history.map((point) => ({
    ...point,
    month: formatShortDate(point.date, locale),
    vegetationIndex: Math.round(point.vegetationIndex * 100),
  }));

  return (
    <Card>
      <CardHeader className="flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{dictionary.chart.title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {dictionary.chart.subtitle}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="risk">
          <TabsList>
            <TabsTrigger value="risk">{dictionary.chart.riskTab}</TabsTrigger>
            <TabsTrigger value="climate">{dictionary.chart.climateTab}</TabsTrigger>
          </TabsList>
          <TabsContent value="risk" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskScoreFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    borderColor: "#cbd5e1",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="riskScore"
                  name={dictionary.chart.riskScore}
                  stroke="#0f766e"
                  strokeWidth={3}
                  fill="url(#riskScoreFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="climate" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    borderColor: "#cbd5e1",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="rainfallMm"
                  name={dictionary.chart.rainfall}
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="soilMoisture"
                  name={dictionary.chart.soilMoisture}
                  stroke="#0f766e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="vegetationIndex"
                  name={dictionary.chart.vegetation}
                  stroke="#65a30d"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
