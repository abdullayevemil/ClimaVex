import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeRegionDetail } from "@/lib/api-serializers";
import { normalizeLocale } from "@/lib/i18n";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));
    const { id } = await context.params;
    const region = await prisma.region.findUnique({
      where: { id },
      include: {
        translations: true,
        portfolioRegions: true,
        climateSnapshots: {
          orderBy: { date: "desc" },
          take: 12,
        },
        riskAssessments: {
          orderBy: { assessmentDate: "desc" },
          take: 8,
          include: { translations: true },
        },
      },
    });

    if (!region) {
      return NextResponse.json({ error: "Region not found." }, { status: 404 });
    }

    return NextResponse.json(serializeRegionDetail(region, locale));
  } catch (error) {
    console.error("GET /api/regions/[id] failed", error);
    return NextResponse.json(
      { error: "Unable to load region details." },
      { status: 500 },
    );
  }
}
