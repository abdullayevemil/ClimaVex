import { prisma } from "@/lib/prisma";
import { fail, handle, ok, readJson } from "@/server/http";
import { requireUser, visibleFarmWhere } from "@/server/auth/guards";
import { parcelSearchSchema } from "@/server/schemas";
import { formatCompact, formatFull, parseCadastralRef } from "@/lib/cadastral";

/**
 * Parcel lookup by cadastral reference.
 *
 * `463:21` identifies a parcel only within one neighbourhood — the same pair
 * recurs all over Türkiye. So when the reference alone matches more than one
 * parcel this returns 409 and the full candidate list rather than guessing.
 * Silently picking the first match would attach a loan to the wrong field.
 */
export async function POST(request: Request) {
  return handle("POST /api/parcels/search", async () => {
    const user = await requireUser();
    const body = parcelSearchSchema.parse(await readJson(request));

    const parsed = parseCadastralRef(body.reference);
    if (!parsed.ok) return fail(422, parsed.error, undefined, "UNPARSEABLE_REFERENCE");

    const farmWhere = await visibleFarmWhere(user);
    const matches = await prisma.cadastralParcel.findMany({
      where: {
        ada: parsed.value.ada,
        parsel: parsed.value.parsel,
        ...(body.il ? { il: body.il } : {}),
        ...(body.ilce ? { ilce: body.ilce } : {}),
        ...(body.mahalleKoy ? { mahalleKoy: body.mahalleKoy } : {}),
        farm: farmWhere,
      },
      include: { farm: { select: { id: true, name: true, centroidLat: true, centroidLng: true } } },
      orderBy: [{ il: "asc" }, { ilce: "asc" }, { mahalleKoy: "asc" }],
    });

    const candidates = matches.map((p) => ({
      id: p.id,
      compact: formatCompact(p),
      full: formatFull(p),
      il: p.il,
      ilce: p.ilce,
      mahalleKoy: p.mahalleKoy,
      verificationStatus: p.verificationStatus,
      farm: p.farm,
    }));

    const administrativeFilterGiven = Boolean(body.il || body.ilce || body.mahalleKoy);

    if (candidates.length > 1 && !administrativeFilterGiven) {
      return fail(
        409,
        `${candidates.length} parcels match ${formatCompact(parsed.value)}. Ada and parsel are not unique nationally — choose a province, district and neighbourhood.`,
        candidates.map((c) => ({ path: c.id, message: c.full })),
        "AMBIGUOUS_REFERENCE",
      );
    }

    return ok({ reference: formatCompact(parsed.value), parsed: parsed.value, candidates, ambiguous: candidates.length > 1 });
  });
}
