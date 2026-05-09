import { NextResponse } from "next/server";
import { localizePortfolio } from "@/lib/api-serializers";
import { dbLocales, normalizeLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import type { PortfolioSummary, RiskLevel } from "@/lib/types";

const riskOrder: Record<RiskLevel, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export async function GET(request: Request) {
  try {
    const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));
    const portfolio = await prisma.portfolio.findFirst({
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
                  include: { translations: true },
                },
              },
            },
          },
        },
      },
    });

    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio data has not been seeded." },
        { status: 404 },
      );
    }

    const totalExposure =
      portfolio.totalExposure ||
      portfolio.regions.reduce((sum, item) => sum + item.exposureAmount, 0);

    const regionRisks = portfolio.regions
      .map((item) => {
        const latestRisk = item.region.riskAssessments[0];

        if (!latestRisk) return null;

        return {
          id: item.region.id,
          name:
            item.region.translations.find(
              (translation) => translation.locale === dbLocales[locale],
            )?.name ?? item.region.name,
          cropType:
            item.region.translations.find(
              (translation) => translation.locale === dbLocales[locale],
            )?.cropType ?? item.region.cropType,
          exposureAmount: item.exposureAmount,
          riskScore: latestRisk.riskScore,
          riskLevel: latestRisk.riskLevel as RiskLevel,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const weightedAverageRisk =
      totalExposure > 0
        ? regionRisks.reduce(
            (sum, item) => sum + item.riskScore * item.exposureAmount,
            0,
          ) / totalExposure
        : 0;

    const riskCounts: Record<RiskLevel, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
    };

    for (const item of regionRisks) {
      riskCounts[item.riskLevel] += 1;
    }

    const localizedPortfolio = localizePortfolio(portfolio, locale);

    const summary: PortfolioSummary = {
      id: portfolio.id,
      name: localizedPortfolio.name,
      institutionName: localizedPortfolio.institutionName,
      totalExposure,
      weightedAverageRisk: Math.round(weightedAverageRisk * 10) / 10,
      riskCounts,
      topRiskyRegions: [...regionRisks]
        .sort((a, b) => {
          if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
          return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
        })
        .slice(0, 4),
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("GET /api/portfolio failed", error);
    return NextResponse.json(
      { error: "Unable to load portfolio summary." },
      { status: 500 },
    );
  }
}
