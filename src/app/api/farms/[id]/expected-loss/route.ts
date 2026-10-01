import { prisma } from "@/lib/prisma";
import { handle, ok, readJson } from "@/server/http";
import { HttpError, requireFarmRead } from "@/server/auth/guards";
import { expectedLossSchema } from "@/server/schemas";
import { expectedLoss } from "@/domain/finance/expected-loss";
import { money } from "@/domain/finance/money";

/**
 * Expected loss on a prospective loan against a stored risk assessment.
 *
 * The score is read from the saved run rather than taken from the request, so
 * the figure always belongs to a score this farm was actually given.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle("POST /api/farms/[id]/expected-loss", async () => {
    const { id } = await context.params;
    await requireFarmRead(id);
    const body = expectedLossSchema.parse(await readJson(request));

    const run = await prisma.riskAssessmentRun.findFirst({
      where: { id: body.runId, farmId: id },
      select: { score: true },
    });
    if (!run) throw new HttpError(404, "Risk assessment not found for this farm.");

    return ok(expectedLoss(money(body.loanAmount), run.score));
  });
}
