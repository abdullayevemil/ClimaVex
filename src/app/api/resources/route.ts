import { prisma } from "@/lib/prisma";
import { handle, ok, readJson } from "@/server/http";
import { requireUser, visibleFarmWhere } from "@/server/auth/guards";
import { createResourceSchema } from "@/server/schemas";
import { Prisma } from "@prisma/client";

export async function GET() {
  return handle("GET /api/resources", async () => {
    const user = await requireUser();
    const farmWhere = await visibleFarmWhere(user);

    // A resource is visible when the user owns it, or when it supplies any
    // section on a farm they can see — that is what makes cross-borrower
    // sharing visible to a lender at all.
    const resources = await prisma.resource.findMany({
      where: { OR: [{ ownerUserId: user.id }, { links: { some: { section: { farm: farmWhere } } } }] },
      include: {
        links: {
          include: {
            section: {
              select: {
                id: true, label: true,
                farm: { select: { id: true, name: true, borrower: { select: { id: true, name: true } } } },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return ok({
      resources: resources.map((r) => ({
        id: r.id, name: r.name, type: r.type, geometry: r.geojson,
        capacityLpm: r.capacityLpm, isDemo: r.isDemo,
        links: r.links.map((l) => ({
          linkId: l.id, sectionId: l.sectionId, sectionLabel: l.section.label,
          farmId: l.section.farm.id, farmName: l.section.farm.name,
          borrower: l.section.farm.borrower, sharePct: l.sharePct,
        })),
        distinctFarms: new Set(r.links.map((l) => l.section.farm.id)).size,
        distinctBorrowers: new Set(r.links.map((l) => l.section.farm.borrower?.id).filter(Boolean)).size,
      })),
    });
  });
}

export async function POST(request: Request) {
  return handle("POST /api/resources", async () => {
    const user = await requireUser();
    const body = createResourceSchema.parse(await readJson(request));

    const resource = await prisma.resource.create({
      data: {
        ownerUserId: user.id,
        name: body.name,
        type: body.type,
        geojson: body.geometry as Prisma.InputJsonValue,
        capacityLpm: body.capacityLpm,
      },
    });

    return ok({ id: resource.id }, 201);
  });
}
