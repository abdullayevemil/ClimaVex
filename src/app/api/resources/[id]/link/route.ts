import { prisma } from "@/lib/prisma";
import { handle, ok, readJson } from "@/server/http";
import { HttpError, requireTwinWrite } from "@/server/auth/guards";
import { linkResourceSchema } from "@/server/schemas";

/**
 * Link a resource to the sections it supplies. Sections may belong to
 * different farms and different borrowers — that is the point of the feature.
 * Each link is authorised against its own farm.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle("POST /api/resources/[id]/link", async () => {
    const { id } = await context.params;
    const body = linkResourceSchema.parse(await readJson(request));

    const sections = await prisma.cultivationSection.findMany({
      where: { id: { in: body.sectionIds } },
      select: { id: true, farmId: true },
    });
    if (sections.length !== body.sectionIds.length) throw new HttpError(404, "One or more sections were not found.");

    for (const farmId of new Set(sections.map((s) => s.farmId))) {
      await requireTwinWrite(farmId);
    }

    await prisma.$transaction(
      sections.map((s) =>
        prisma.resourceLink.upsert({
          where: { resourceId_sectionId: { resourceId: id, sectionId: s.id } },
          create: { resourceId: id, sectionId: s.id, sharePct: body.sharePct ?? 100 },
          update: { sharePct: body.sharePct ?? 100 },
        }),
      ),
    );

    return ok({ linked: sections.length });
  });
}
