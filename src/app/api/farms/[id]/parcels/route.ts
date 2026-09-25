import { prisma } from "@/lib/prisma";
import { handle, ok, readJson } from "@/server/http";
import { HttpError, requireTwinWrite } from "@/server/auth/guards";
import { createParcelSchema } from "@/server/schemas";
import { formatCompact, formatFull, parseCadastralRef } from "@/lib/cadastral";
import { Prisma } from "@prisma/client";

/**
 * Attach a cadastral reference to a farm.
 *
 * Typing an identifier does NOT verify that the drawn polygon is the official
 * boundary, so the parcel is recorded as an UNVERIFIED_DRAFT and the original
 * input is preserved verbatim.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle("POST /api/farms/[id]/parcels", async () => {
    const { id } = await context.params;
    await requireTwinWrite(id);

    const body = createParcelSchema.parse(await readJson(request));
    const parsed = parseCadastralRef(body.reference);
    if (!parsed.ok) throw new HttpError(422, parsed.error);

    const existing = await prisma.cadastralParcel.findUnique({
      where: {
        il_ilce_mahalleKoy_ada_parsel: {
          il: body.il, ilce: body.ilce, mahalleKoy: body.mahalleKoy,
          ada: parsed.value.ada, parsel: parsed.value.parsel,
        },
      },
    });
    if (existing) {
      throw new HttpError(409, `${formatFull({ ...body, ...parsed.value })} is already registered.`);
    }

    const parcel = await prisma.cadastralParcel.create({
      data: {
        farmId: id,
        il: body.il,
        ilce: body.ilce,
        mahalleKoy: body.mahalleKoy,
        ada: parsed.value.ada,
        parsel: parsed.value.parsel,
        originalInput: parsed.value.originalInput,
        officialAreaM2: body.officialAreaM2 != null ? new Prisma.Decimal(String(body.officialAreaM2)) : null,
        geometrySource: "USER_DRAWN",
        verificationStatus: "UNVERIFIED_DRAFT",
      },
    });

    return ok({ id: parcel.id, compact: formatCompact(parcel), full: formatFull(parcel) }, 201);
  });
}
