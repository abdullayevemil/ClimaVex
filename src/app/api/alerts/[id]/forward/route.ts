import { NextResponse } from "next/server";
import { serializeClimateAlert } from "@/lib/api-serializers";
import { normalizeLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { readJson } from "@/server/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await readJson(request).catch(() => ({}))) as {
      locale?: string;
    };
    const locale = normalizeLocale(body.locale);

    const alert = await prisma.climateAlert.update({
      where: { id },
      data: { status: "FORWARDED" },
      include: {
        translations: true,
        region: {
          include: {
            translations: true,
          },
        },
      },
    });

    return NextResponse.json(serializeClimateAlert(alert, locale));
  } catch (error) {
    console.error("POST /api/alerts/[id]/forward failed", error);
    return NextResponse.json(
      { error: "Unable to forward the alert." },
      { status: 500 },
    );
  }
}
