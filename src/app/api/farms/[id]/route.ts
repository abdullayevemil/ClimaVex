import { handle, ok } from "@/server/http";
import { requireFarmRead } from "@/server/auth/guards";
import { loadFarmDetail } from "@/server/repositories/farm-repo";
import { fail } from "@/server/http";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle("GET /api/farms/[id]", async () => {
    const { id } = await context.params;
    const access = await requireFarmRead(id);

    const seasonId = new URL(request.url).searchParams.get("seasonId") ?? undefined;
    const farm = await loadFarmDetail(id, seasonId);
    if (!farm) return fail(404, "Farm not found.");

    return ok({
      farm,
      access: {
        isOwner: access.isOwner,
        canWriteTwin: access.canWriteTwin,
        canWriteFinance: access.canWriteFinance,
        canRunScenario: access.canRunScenario,
        role: access.user.role,
      },
    });
  });
}
