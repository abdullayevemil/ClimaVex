import { LoanApplicationStatus, RiskLevel as PrismaRiskLevel } from "@prisma/client";
import { NextResponse } from "next/server";
import { buildLoanReviewFromModel, buildLoanReviewResult } from "@/lib/loan-workflow";
import { dbLocales, normalizeLocale, supportedLocales } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { scoreClimateRisk, scoreFromModel, type ClimateScoringInput } from "@/lib/risk-scoring";
import { readJson } from "@/server/http";
import { loadRegionClimate, storeObservedMonths } from "@/server/ml/region-climate";
import type { Locale, LoanReviewResult } from "@/lib/types";

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

    const cropType = body.cropType ?? application.cropType;
    const startedAt = Date.now();
    const { climate: model, notice } = await loadRegionClimate(application.region);

    // One review per locale, from whichever source answered: the ML service
    // when it is connected, the heuristic over the stored snapshot otherwise.
    let reviewFor: (target: Locale) => LoanReviewResult;
    let scoreFor: (target: Locale) => ReturnType<typeof scoreClimateRisk>;

    if (model) {
      await storeObservedMonths(prisma, application.regionId, model.history);
      const latencyMs = Date.now() - startedAt;
      reviewFor = (target) => buildLoanReviewFromModel(model, target, latencyMs);
      scoreFor = (target) => scoreFromModel(model.latest, model.forecast, target);
    } else {
      const latestClimate = application.region.climateSnapshots[0];

      if (!latestClimate) {
        return NextResponse.json(
          { error: notice ?? "No climate snapshot is available for this application." },
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
      reviewFor = (target) => {
        const heuristic = buildLoanReviewResult({
          cropType,
          regionName: application.region.name,
          requestedAmount: application.requestedAmount,
          tenorYears: application.tenorYears,
          climate,
          locale: target,
        });
        return notice ? { ...heuristic, modelMode: `${notice} ${heuristic.modelMode}` } : heuristic;
      };
      scoreFor = (target) => scoreClimateRisk(climate, target);
    }

    const review = reviewFor(locale);
    const baseScoring = scoreFor(locale);
    // A measured score explains itself; the heuristic leads with its top factor.
    const explain = (target: Locale) =>
      model
        ? scoreFor(target).explanation
        : `${reviewFor(target).modelMode}. ${reviewFor(target).factorContributions[0]?.explanation ?? scoreFor(target).explanation}`;

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
          explanation: explain(locale),
          financialInterpretation: review.creditRecommendation.summary,
          recommendation: review.creditRecommendation.summary,
          translations: {
            createMany: {
              data: supportedLocales.map((supportedLocale) => {
                const localizedReview = reviewFor(supportedLocale);

                return {
                  locale: dbLocales[supportedLocale],
                  explanation: explain(supportedLocale),
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
