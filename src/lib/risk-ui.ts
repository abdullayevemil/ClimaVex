import type { RiskLevel } from "./types";

export const riskMeta: Record<
  RiskLevel,
  {
    label: string;
    badgeClass: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
    markerColor: string;
    chartColor: string;
  }
> = {
  LOW: {
    label: "Low",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    textClass: "text-emerald-700",
    bgClass: "bg-emerald-500",
    borderClass: "border-emerald-200",
    markerColor: "#10b981",
    chartColor: "#059669",
  },
  MEDIUM: {
    label: "Medium",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    textClass: "text-amber-700",
    bgClass: "bg-amber-500",
    borderClass: "border-amber-200",
    markerColor: "#f59e0b",
    chartColor: "#d97706",
  },
  HIGH: {
    label: "High",
    badgeClass: "border-red-200 bg-red-50 text-red-800",
    textClass: "text-red-700",
    bgClass: "bg-red-500",
    borderClass: "border-red-200",
    markerColor: "#ef4444",
    chartColor: "#dc2626",
  },
};

export function riskLevelFromScore(score: number): RiskLevel {
  if (score < 40) return "LOW";
  if (score < 70) return "MEDIUM";
  return "HIGH";
}
