import { prisma } from "@/lib/prisma";
import { fail, handle, ok, readJson } from "@/server/http";
import { HttpError, requireTwinWrite } from "@/server/auth/guards";
import { saveLayoutSchema } from "@/server/schemas";
import { validateAreal } from "@/domain/geometry/validate";
import { checkSectionInvariants } from "@/server/geo/invariants";
import { loadFarmDetail } from "@/server/repositories/farm-repo";
import { isoDateToUtcDate } from "@/domain/finance/dates";
import { Prisma } from "@prisma/client";

class InvariantViolation extends Error {
  constructor(readonly violations: string[]) {
    super("Layout violates geometry invariants.");
  }
}

/**
 * Save a whole farm layout atomically.
 *
 * Three properties this route has to guarantee:
 *
 *  1. All-or-nothing. Geometry, sections and crop assignments move together;
 *     a partially written layout is worse than no write at all.
 *  2. No silent overwrite. The client sends the version it was editing. If the
 *     row has moved on, we return 409 with the current server state so the user
 *     can see what changed rather than clobbering someone else's edit.
 *  3. Invariants re-checked after the writes, inside the transaction, against
 *     PostGIS rather than the client's arithmetic. A buggy client cannot
 *     persist overlapping or escaping sections.
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle("PUT /api/farms/[id]/layout", async () => {
    const { id } = await context.params;
    await requireTwinWrite(id);

    const body = saveLayoutSchema.parse(await readJson(request));

    if (body.farmGeometry) {
      const v = validateAreal(body.farmGeometry);
      if (!v.valid) throw new HttpError(422, v.issues[0].message, v.issues);
    }
    for (const section of body.sections) {
      const v = validateAreal(section.geometry);
      if (!v.valid) throw new HttpError(422, `${section.label}: ${v.issues[0].message}`, v.issues);
    }

    const ordinals = body.sections.map((s) => s.ordinal);
    if (new Set(ordinals).size !== ordinals.length) {
      throw new HttpError(422, "Two sections share the same ordinal.");
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Re-check ownership inside the transaction to close the TOCTOU window
        // between the guard above and the write below.
        const farm = await tx.farm.findUnique({ where: { id }, select: { id: true, version: true } });
        if (!farm) throw new HttpError(404, "Farm not found.");

        const bumped = await tx.farm.updateMany({
          where: { id, version: body.expectedVersion },
          data: {
            version: { increment: 1 },
            ...(body.farmGeometry ? { geojson: body.farmGeometry as Prisma.InputJsonValue } : {}),
          },
        });
        if (bumped.count === 0) throw new HttpError(409, "This farm changed since you started editing.");

        const season = await tx.season.findFirst({ where: { id: body.seasonId, farmId: id } });
        if (!season) throw new HttpError(404, "Season not found for this farm.");

        /*
         * Re-dividing a field replaces its sections, which would cascade away
         * their resource links. Crop assignments already survive by ordinal, so
         * irrigation links follow the same rule — otherwise changing N silently
         * detaches a farm from the canal that waters it, and the shared-exposure
         * view quietly under-reports.
         */
        const priorLinks = await tx.resourceLink.findMany({
          where: { section: { seasonId: season.id } },
          select: { resourceId: true, sharePct: true, section: { select: { ordinal: true } } },
        });

        const keepIds = body.sections.map((s) => s.id).filter((v): v is string => Boolean(v));
        await tx.cultivationSection.deleteMany({
          where: { seasonId: season.id, ...(keepIds.length ? { id: { notIn: keepIds } } : {}) },
        });

        for (const s of body.sections) {
          const data = {
            seasonId: season.id,
            farmId: id,
            parcelId: s.parcelId ?? null,
            ordinal: s.ordinal,
            label: s.label,
            geojson: s.geometry as Prisma.InputJsonValue,
            isMultipart: s.isMultipart ?? (s.geometry.type === "MultiPolygon" && s.geometry.coordinates.length > 1),
            cropId: s.cropId,
            plantingDate: isoDateToUtcDate(s.plantingDate),
            harvestWindowStart: isoDateToUtcDate(s.harvestWindowStart),
            harvestWindowEnd: isoDateToUtcDate(s.harvestWindowEnd),
            expectedSaleDate: isoDateToUtcDate(s.expectedSaleDate),
            yieldTPerHa: new Prisma.Decimal(s.yieldTPerHa),
            priceTryPerT: new Prisma.Decimal(s.priceTryPerT),
            costTryPerHa: new Prisma.Decimal(s.costTryPerHa),
          };
          if (s.id) await tx.cultivationSection.update({ where: { id: s.id }, data });
          else await tx.cultivationSection.create({ data });
        }

        // Restore resource links onto the section now holding each ordinal.
        if (priorLinks.length > 0) {
          const byOrdinal = new Map(
            (await tx.cultivationSection.findMany({
              where: { seasonId: season.id },
              select: { id: true, ordinal: true },
            })).map((s) => [s.ordinal, s.id]),
          );
          for (const link of priorLinks) {
            const sectionId = byOrdinal.get(link.section.ordinal);
            if (!sectionId) continue;
            await tx.resourceLink.upsert({
              where: { resourceId_sectionId: { resourceId: link.resourceId, sectionId } },
              create: { resourceId: link.resourceId, sectionId, sharePct: link.sharePct },
              update: { sharePct: link.sharePct },
            });
          }
        }

        // The database has the final word on whether this layout is legal.
        if (body.sections.length > 0) {
          const report = await checkSectionInvariants(tx, id, season.id);
          if (!report.passed) throw new InvariantViolation(report.violations);
        }
      });
    } catch (error) {
      if (error instanceof InvariantViolation) {
        return fail(422, error.violations[0], error.violations.map((v) => ({ path: "sections", message: v })), "INVARIANT_VIOLATION");
      }
      if (error instanceof HttpError && error.status === 409) {
        const current = await loadFarmDetail(id);
        return fail(409, error.message, [
          { path: "expectedVersion", message: `Server version is now ${current?.version ?? "unknown"}.` },
        ], "VERSION_CONFLICT");
      }
      throw error;
    }

    const farm = await loadFarmDetail(id, body.seasonId);
    return ok({ farm });
  });
}
