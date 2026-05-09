import { Droplets, Gauge, Leaf, Thermometer, Waves } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";
import type { ClimateSnapshotDto } from "@/lib/types";

const indicators = [
  {
    key: "rainfallMm",
    labelKey: "rainfall",
    unit: "mm",
    icon: Droplets,
    detailKey: "monthlyAccumulation",
  },
  {
    key: "temperatureC",
    labelKey: "temperature",
    unit: "celsius",
    icon: Thermometer,
    detailKey: "meanTemperature",
  },
  {
    key: "soilMoisture",
    labelKey: "soilMoisture",
    unit: "%",
    icon: Gauge,
    detailKey: "rootZoneEstimate",
  },
  {
    key: "vegetationIndex",
    labelKey: "vegetation",
    unit: "NDVI",
    icon: Leaf,
    detailKey: "cropVigorSignal",
  },
  {
    key: "droughtIndex",
    labelKey: "droughtIndex",
    unit: "/100",
    icon: Thermometer,
    detailKey: "waterStressSignal",
  },
  {
    key: "floodExposure",
    labelKey: "floodExposure",
    unit: "/100",
    icon: Waves,
    detailKey: "surfaceWaterHazard",
  },
] as const;

export function ClimateIndicatorCards({
  snapshot,
}: {
  snapshot: ClimateSnapshotDto | null;
}) {
  const { dictionary } = useI18n();

  if (!snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dictionary.climate.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {dictionary.climate.noSnapshot}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {indicators.map((indicator) => {
        const Icon = indicator.icon;
        const value = snapshot[indicator.key];
        const formatted =
          indicator.key === "vegetationIndex"
            ? value.toFixed(2)
            : value.toFixed(0);

        return (
          <Card key={indicator.key} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    {dictionary.climate[indicator.labelKey]}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {formatted}
                    <span className="ml-1 text-sm font-medium text-slate-500">
                      {indicator.unit === "celsius"
                        ? dictionary.units.celsius
                        : indicator.unit}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {dictionary.climate[indicator.detailKey]}
                  </p>
                </div>
                <div className="rounded-md bg-teal-50 p-2 text-teal-700">
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
