import { RiskLevel as PrismaRiskLevel } from "@prisma/client";
import { NextResponse } from "next/server";
import { serializeRiskAssessment } from "@/lib/api-serializers";
import { dbLocales, normalizeLocale, supportedLocales } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { scoreClimateRisk, scoreFromModel, type RiskScoringResult } from "@/lib/risk-scoring";
import { readJson } from "@/server/http";
import { loadRegionClimate, storeObservedMonths } from "@/server/ml/region-climate";
import type { Locale } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await readJson(request)) as { regionId?: unknown; locale?: unknown };
    const locale = normalizeLocale(
      typeof body.locale === "string"
        ? body.locale
        : new URL(request.url).searchParams.get("locale"),
    );

    if (typeof body.regionId !== "string" || body.regionId.length === 0) {
      return NextResponse.json(
        { error: "A valid regionId is required." },
        { status: 400 },
      );
    }

    const region = await prisma.region.findUnique({
      where: { id: body.regionId },
      include: {
        climateSnapshots: {
          orderBy: { date: "desc" },
          take: 1,
        },
      },
    });

    if (!region) {
      return NextResponse.json({ error: "Region not found." }, { status: 404 });
    }

    // With the ML service connected the assessment is its measured index for
    // the latest observed month. Otherwise the heuristic scores the stored
    // snapshot, and says so if a model was expected.
    const { climate, notice } = await loadRegionClimate(region);
    let scoreFor: (target: Locale) => RiskScoringResult;

    if (climate) {
      await storeObservedMonths(prisma, region.id, climate.history);
      scoreFor = (target) => scoreFromModel(climate.latest, climate.forecast, target);
    } else {
      const latestClimate = region.climateSnapshots[0];

      if (!latestClimate) {
        return NextResponse.json(
          { error: notice ?? "Region has no climate snapshot to assess." },
          { status: 409 },
        );
      }

      const input = {
        rainfallMm: latestClimate.rainfallMm,
        temperatureC: latestClimate.temperatureC,
        soilMoisture: latestClimate.soilMoisture,
        vegetationIndex: latestClimate.vegetationIndex,
        droughtIndex: latestClimate.droughtIndex,
        floodExposure: latestClimate.floodExposure,
      };
      scoreFor = (target) => {
        const heuristic = scoreClimateRisk(input, target);
        return notice ? { ...heuristic, explanation: `${notice} ${heuristic.explanation}` } : heuristic;
      };
    }

    const scoring = scoreFor("en");

    const assessment = await prisma.riskAssessment.create({
      data: {
        regionId: region.id,
        assessmentDate: new Date(),
        riskLevel: scoring.riskLevel as PrismaRiskLevel,
        riskScore: scoring.riskScore,
        droughtRisk: scoring.droughtRisk,
        floodRisk: scoring.floodRisk,
        soilRisk: scoring.soilRisk,
        yieldVolatilityRisk: scoring.yieldVolatilityRisk,
        explanation: scoring.explanation,
        financialInterpretation: scoring.financialInterpretation,
        recommendation: scoring.recommendation,
        translations: {
          createMany: {
            data: supportedLocales.map((supportedLocale) => {
              const localizedScoring = scoreFor(supportedLocale);

              return {
                locale: dbLocales[supportedLocale],
                explanation: localizedScoring.explanation,
                financialInterpretation:
                  localizedScoring.financialInterpretation,
                recommendation: localizedScoring.recommendation,
              };
            }),
          },
        },
      },
      include: { translations: true },
    });

    return NextResponse.json(serializeRiskAssessment(assessment, locale), {
      status: 201,
    });
  } catch (error) {
    console.error("POST /api/assessments/generate failed", error);
    return NextResponse.json(
      { error: "Unable to generate risk assessment." },
      { status: 500 },
    );
  }
}
