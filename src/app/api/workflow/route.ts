import { NextResponse } from "next/server";
import {
  localizePortfolio,
  serializeClimateAlert,
  serializeLoanApplication,
} from "@/lib/api-serializers";
import { normalizeLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import type { RiskLevel, WorkflowSummary } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

    const [portfolio, pendingApplications, alerts] = await Promise.all([
      prisma.portfolio.findFirst({
        orderBy: { createdAt: "asc" },
        include: {
          translations: true,
          regions: {
            include: {
              region: {
                include: {
                  translations: true,
                  riskAssessments: {
                    orderBy: { assessmentDate: "desc" },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      }),
      prisma.loanApplication.findMany({
        orderBy: { submittedAt: "desc" },
        include: {
          translations: true,
          region: {
            include: {
              translations: true,
              portfolioRegions: true,
              climateSnapshots: {
                orderBy: { date: "desc" },
                take: 1,
              },
              riskAssessments: {
                orderBy: { assessmentDate: "desc" },
                take: 1,
                include: { translations: true },
              },
            },
          },
          decisions: {
            orderBy: { decidedAt: "desc" },
            take: 1,
          },
          reports: {
            orderBy: { generatedAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.climateAlert.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          translations: true,
          region: {
            include: {
              translations: true,
            },
          },
        },
        take: 6,
      }),
    ]);

    const totalExposure =
      portfolio?.totalExposure ??
      portfolio?.regions.reduce((sum, item) => sum + item.exposureAmount, 0) ??
      0;

    const weightedAverageRisk =
      portfolio && totalExposure > 0
        ? portfolio.regions.reduce((sum, item) => {
            const latestRisk = item.region.riskAssessments[0];
            return sum + (latestRisk?.riskScore ?? 0) * item.exposureAmount;
          }, 0) / totalExposure
        : 0;

    const riskCounts: Record<RiskLevel, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
    };

    for (const item of portfolio?.regions ?? []) {
      const level = item.region.riskAssessments[0]?.riskLevel as RiskLevel | undefined;
      if (level) riskCounts[level] += 1;
    }

    const localizedPortfolio = portfolio
      ? localizePortfolio(portfolio, locale)
      : {
          name: "Central Anatolia Mixed Portfolio",
          institutionName: "Anatolian Agricultural Finance Group",
        };

    const summary: WorkflowSummary = {
      user: {
        name: "Aysel Karimova",
        role: "Agricultural Credit Risk Officer",
        institutionName: localizedPortfolio.institutionName,
        authProvider: "Internal portal SSO",
        licenseTier: "Institutional Risk Pro",
        loginTime: "2026-05-09T04:30:00.000Z",
      },
      portfolio: {
        activeLoans: 340,
        pendingApplications: pendingApplications.length,
        overnightAlerts: alerts.filter((alert) => alert.status === "OPEN").length,
        weightedAverageRisk: Math.round(weightedAverageRisk * 10) / 10,
        totalExposure,
      },
      pendingApplications: pendingApplications.map((application) =>
        serializeLoanApplication(application, locale),
      ),
      alerts: alerts.map((alert) => serializeClimateAlert(alert, locale)),
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("GET /api/workflow failed", error);
    return NextResponse.json(
      { error: "Unable to load operations workflow." },
      { status: 500 },
    );
  }
}
