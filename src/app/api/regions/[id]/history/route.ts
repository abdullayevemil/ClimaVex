import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RegionHistoryPoint } from "@/lib/types";

function monthKey(value: Date) {
  return value.toISOString().slice(0, 7);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const region = await prisma.region.findUnique({
      where: { id },
      include: {
        climateSnapshots: {
          orderBy: { date: "asc" },
        },
        riskAssessments: {
          orderBy: { assessmentDate: "asc" },
        },
      },
    });

    if (!region) {
      return NextResponse.json({ error: "Region not found." }, { status: 404 });
    }

    const assessmentByMonth = new Map(
      region.riskAssessments.map((assessment) => [
        monthKey(assessment.assessmentDate),
        assessment,
      ]),
    );

    const history: RegionHistoryPoint[] = region.climateSnapshots.map(
      (snapshot) => {
        const assessment = assessmentByMonth.get(monthKey(snapshot.date));

        return {
          date: snapshot.date.toISOString(),
          rainfallMm: snapshot.rainfallMm,
          temperatureC: snapshot.temperatureC,
          soilMoisture: snapshot.soilMoisture,
          vegetationIndex: snapshot.vegetationIndex,
          droughtIndex: snapshot.droughtIndex,
          floodExposure: snapshot.floodExposure,
          riskScore: assessment?.riskScore ?? null,
          riskLevel: assessment?.riskLevel ?? null,
        };
      },
    );

    return NextResponse.json(history);
  } catch (error) {
    console.error("GET /api/regions/[id]/history failed", error);
    return NextResponse.json(
      { error: "Unable to load region history." },
      { status: 500 },
    );
  }
}
