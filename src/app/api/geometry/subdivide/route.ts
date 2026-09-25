import { handle, ok, readJson } from "@/server/http";
import { subdividePreviewSchema } from "@/server/schemas";
import { subdivide } from "@/domain/geometry/subdivide";
import { areaBreakdown } from "@/domain/geometry/units";
import { requireUser } from "@/server/auth/guards";

/**
 * Stateless subdivision preview. Nothing is persisted, so previewing is free
 * and cancelling is trivial — the client can call this on every slider nudge.
 */
export async function POST(request: Request) {
  return handle("POST /api/geometry/subdivide", async () => {
    await requireUser();
    const body = subdividePreviewSchema.parse(await readJson(request));
    const result = subdivide(body.geometry, body.n, body.weights);

    return ok({
      sections: result.sections.map((s) => ({ ...s, area: areaBreakdown(s.areaM2) })),
      report: { ...result.report, parentArea: areaBreakdown(result.report.parentAreaM2) },
    });
  });
}
