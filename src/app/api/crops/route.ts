import { prisma } from "@/lib/prisma";
import { handle, ok } from "@/server/http";

export async function GET() {
  return handle("GET /api/crops", async () => {
    const [crops, defaults] = await Promise.all([
      prisma.crop.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: { assumptions: { where: { regionCode: "TR-42" }, orderBy: { year: "desc" }, take: 1 } },
      }),
      prisma.regionalCropDefault.findMany({ where: { regionCode: "TR-42" }, orderBy: { rank: "asc" } }),
    ]);

    return ok({
      // Stated plainly rather than buried: the regional ranking is unverified.
      catalogueNote:
        "Provisional demo crop catalogue for the Konya pilot. Regional ranking is not verified against official statistics.",
      defaultCropId: defaults[0]?.cropId ?? crops[0]?.id ?? null,
      crops: crops.map((c) => ({
        id: c.id, code: c.code, nameEn: c.nameEn, nameTr: c.nameTr,
        colorHex: c.colorHex, isIrrigated: c.isIrrigated,
        assumption: c.assumptions[0]
          ? {
              yieldTPerHa: c.assumptions[0].yieldTPerHa.toString(),
              priceTryPerT: c.assumptions[0].priceTryPerT.toString(),
              costTryPerHa: c.assumptions[0].costTryPerHa.toString(),
              source: c.assumptions[0].source,
              isDemoAssumption: c.assumptions[0].isDemoAssumption,
            }
          : null,
      })),
    });
  });
}
