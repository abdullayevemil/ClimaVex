import { NextResponse } from "next/server";
import { serializeClimateReport } from "@/lib/api-serializers";
import { normalizeLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      loanApplicationId?: string;
      locale?: string;
    };
    const locale = normalizeLocale(body.locale);

    if (!body.loanApplicationId) {
      return NextResponse.json(
        { error: "loanApplicationId is required." },
        { status: 400 },
      );
    }

    const application = await prisma.loanApplication.findUnique({
      where: { id: body.loanApplicationId },
      include: {
        region: {
          include: {
            translations: true,
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
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Loan application not found." },
        { status: 404 },
      );
    }

    const latestRisk = application.region.riskAssessments[0];
    const summary =
      locale === "tr"
        ? `${application.applicantName} için iklim kredi riski raporu oluşturuldu. Skor, iklim göstergeleri, açıklanabilirlik katkıları, 2030/2050 SSP projeksiyonları ve kredi koşulu önerilerini içerir.`
        : locale === "az"
          ? `${application.applicantName} üçün iqlim kredit riski hesabatı yaradıldı. Buraya risk balı, iqlim göstəriciləri, izah edilə bilən töhfələr, 2030/2050 SSP proqnozları və kredit şərti tövsiyələri daxildir.`
          : `Climate credit risk report generated for ${application.applicantName}. It includes the risk score, climate indicators, explainability contributions, 2030/2050 SSP projections, and credit condition recommendations.`;

    const dataSourcesAppendix = [
      "Sentinel-2 NDVI proxy, last 30 days",
      "MGM precipitation anomaly proxy, last 12 months",
      "Soil moisture and degradation proxy",
      "MVP climate risk scoring model; XGBoost-ready feature pipeline",
      `Latest risk score: ${latestRisk?.riskScore.toFixed(1) ?? "unavailable"}`,
    ].join("\n");

    const report = await prisma.climateReport.create({
      data: {
        loanApplicationId: application.id,
        reportNumber: `CVX-${new Date()
          .toISOString()
          .slice(0, 10)
          .replaceAll("-", "")}-${Date.now().toString().slice(-5)}`,
        generatedBy: "Aysel Karimova",
        generatedAt: new Date(),
        summary,
        dataSourcesAppendix,
      },
    });

    return NextResponse.json(serializeClimateReport(report));
  } catch (error) {
    console.error("POST /api/reports/generate failed", error);
    return NextResponse.json(
      { error: "Unable to generate the credit risk report." },
      { status: 500 },
    );
  }
}
