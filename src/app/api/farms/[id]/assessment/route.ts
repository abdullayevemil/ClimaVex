import { handle, ok } from "@/server/http";
import { HttpError, requireFarmRead } from "@/server/auth/guards";
import { assessFarmRisk } from "@/server/repositories/scenario-service";
import { DEMO_DISCLAIMER } from "@/domain/scenario/contract";

/**
 * The headline output for bank and insurance users: a deterministic,
 * explainable risk score for one farm-season.
 *
 * Deliberately absent from the response: any approve/decline verdict,
 * eligibility outcome, or recommended limit presented as a decision. The
 * institution retains the credit decision — ClimaVex supplies the evidence.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle("POST /api/farms/[id]/assessment", async () => {
    const { id } = await context.params;
    const access = await requireFarmRead(id);

    const seasonId = new URL(request.url).searchParams.get("seasonId");
    if (!seasonId) throw new HttpError(400, "A seasonId is required.");

    const result = await assessFarmRisk(id, seasonId, access.user.id);

    return ok({
      assessment: result.assessment,
      runId: result.runId,
      exposure: result.exposure,
      ledger: result.ledger,
      disclaimer: DEMO_DISCLAIMER,
      note: "Decision support only — the bank retains the credit decision.",
    });
  });
}
