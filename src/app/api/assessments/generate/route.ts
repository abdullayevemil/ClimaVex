import { RiskLevel as PrismaRiskLevel } from "@prisma/client";
import { NextResponse } from "next/server";
import { serializeRiskAssessment } from "@/lib/api-serializers";
import { dbLocales, normalizeLocale, supportedLocales } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { scoreClimateRisk } from "@/lib/risk-scoring";
import { readJson } from "@/server/http";

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

    const latestClimate = region.climateSnapshots[0];

    if (!latestClimate) {
      return NextResponse.json(
        { error: "Region has no climate snapshot to assess." },
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
    const scoring = scoreClimateRisk(input, "en");

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
              const localizedScoring = scoreClimateRisk(input, supportedLocale);

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
