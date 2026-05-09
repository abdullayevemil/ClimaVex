import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeRegionSummary } from "@/lib/api-serializers";
import { normalizeLocale } from "@/lib/i18n";

export async function GET(request: Request) {
  try {
    const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));
    const regions = await prisma.region.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
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
    });

    return NextResponse.json(
      regions.map((region) => serializeRegionSummary(region, locale)),
    );
  } catch (error) {
    console.error("GET /api/regions failed", error);
    return NextResponse.json(
      { error: "Unable to load regions." },
      { status: 500 },
    );
  }
}
