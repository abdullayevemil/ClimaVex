import { prisma } from "@/lib/prisma";
import { handle, ok, readJson } from "@/server/http";
import { requireUser } from "@/server/auth/guards";
import { visibleFarmWhere } from "@/server/auth/guards";
import { createFarmSchema } from "@/server/schemas";
import { serializeFarmListItem } from "@/server/repositories/farm-repo";
import { validateAreal } from "@/domain/geometry/validate";
import { HttpError } from "@/server/auth/guards";
import { isoDateToUtcDate } from "@/domain/finance/dates";

export async function GET() {
  return handle("GET /api/farms", async () => {
    const user = await requireUser();
    const where = await visibleFarmWhere(user);

    const farms = await prisma.farm.findMany({
      where,
      orderBy: [{ isDemo: "desc" }, { name: "asc" }],
      include: {
        borrower: { select: { id: true, name: true } },
        parcels: { select: { ada: true, parsel: true }, orderBy: [{ ada: "asc" }, { parsel: "asc" }] },
        _count: { select: { sections: true } },
      },
    });

    return ok({ farms: farms.map(serializeFarmListItem) });
  });
}

export async function POST(request: Request) {
  return handle("POST /api/farms", async () => {
    const user = await requireUser();
    if (user.role !== "FARMER" && user.role !== "ADMIN") {
      throw new HttpError(403, "Only farm owners can create a farm. Banks and insurers add financial terms to existing twins.");
    }

    const body = createFarmSchema.parse(await readJson(request));
    const validation = validateAreal(body.geometry);
    if (!validation.valid) throw new HttpError(422, validation.issues[0].message, validation.issues);

    const farm = await prisma.$transaction(async (tx) => {
      const created = await tx.farm.create({
        data: {
          ownerUserId: user.id,
          name: body.name,
          description: body.description,
          il: body.il,
          ilce: body.ilce,
          geojson: body.geometry,
          geometrySource: "USER_DRAWN",
          verificationStatus: "UNVERIFIED_DRAFT",
        },
      });

      await tx.season.create({
        data: {
          farmId: created.id,
          name: body.seasonName ?? "2025-26",
          startDate: isoDateToUtcDate(body.seasonStart ?? "2025-10-01"),
          endDate: isoDateToUtcDate(body.seasonEnd ?? "2026-09-30"),
          isActive: true,
        },
      });

      return created;
    });

    return ok({ id: farm.id }, 201);
  });
}
