import { LoanApplicationStatus, RiskLevel as PrismaRiskLevel } from "@prisma/client";
import { NextResponse } from "next/server";
import { buildLoanReviewResult } from "@/lib/loan-workflow";
import { dbLocales, normalizeLocale, supportedLocales } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { scoreClimateRisk, type ClimateScoringInput } from "@/lib/risk-scoring";
import { readJson } from "@/server/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await readJson(request).catch(() => ({}))) as {
      locale?: string;
      cropType?: string;
    };
    const locale = normalizeLocale(body.locale);

    const application = await prisma.loanApplication.findUnique({
      where: { id },
      include: {
        region: {
          include: {
            climateSnapshots: {
              orderBy: { date: "desc" },
              take: 1,
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

    const latestClimate = application.region.climateSnapshots[0];

    if (!latestClimate) {
      return NextResponse.json(
        { error: "No climate snapshot is available for this application." },
        { status: 400 },
      );
    }

    const climate: ClimateScoringInput = {
      rainfallMm: latestClimate.rainfallMm,
      temperatureC: latestClimate.temperatureC,
      soilMoisture: latestClimate.soilMoisture,
      vegetationIndex: latestClimate.vegetationIndex,
      droughtIndex: latestClimate.droughtIndex,
      floodExposure: latestClimate.floodExposure,
    };
    const cropType = body.cropType ?? application.cropType;
    const review = buildLoanReviewResult({
      cropType,
      regionName: application.region.name,
      requestedAmount: application.requestedAmount,
      tenorYears: application.tenorYears,
      climate,
      locale,
    });
    const baseScoring = scoreClimateRisk(climate, locale);

    await prisma.$transaction([
      prisma.riskAssessment.create({
        data: {
          regionId: application.regionId,
          assessmentDate: new Date(),
          riskLevel: review.riskLevel as PrismaRiskLevel,
          riskScore: review.riskScore,
          droughtRisk: baseScoring.droughtRisk,
          floodRisk: baseScoring.floodRisk,
          soilRisk: baseScoring.soilRisk,
          yieldVolatilityRisk: baseScoring.yieldVolatilityRisk,
          explanation: `${review.modelMode}. ${review.factorContributions[0]?.explanation ?? baseScoring.explanation}`,
          financialInterpretation: review.creditRecommendation.summary,
          recommendation: review.creditRecommendation.summary,
          translations: {
            createMany: {
              data: supportedLocales.map((supportedLocale) => {
                const localizedBase = scoreClimateRisk(climate, supportedLocale);
                const localizedReview = buildLoanReviewResult({
                  cropType,
                  regionName: application.region.name,
                  requestedAmount: application.requestedAmount,
                  tenorYears: application.tenorYears,
                  climate,
                  locale: supportedLocale,
                });

                return {
                  locale: dbLocales[supportedLocale],
                  explanation: `${localizedReview.modelMode}. ${
                    localizedReview.factorContributions[0]?.explanation ??
                    localizedBase.explanation
                  }`,
                  financialInterpretation:
                    localizedReview.creditRecommendation.summary,
                  recommendation: localizedReview.creditRecommendation.summary,
                };
              }),
            },
          },
        },
      }),
      prisma.loanApplication.update({
        where: { id: application.id },
        data: {
          status: LoanApplicationStatus.UNDER_REVIEW,
          cropType,
        },
      }),
    ]);

    return NextResponse.json(review);
  } catch (error) {
    console.error("POST /api/loan-applications/[id]/review failed", error);
    return NextResponse.json(
      { error: "Unable to run the loan climate review." },
      { status: 500 },
    );
  }
}
