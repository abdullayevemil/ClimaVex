import { prisma } from "@/lib/prisma";
import { handle, ok } from "@/server/http";
import { HttpError, requireScenarioRun } from "@/server/auth/guards";
import { runScenario } from "@/server/repositories/scenario-service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handle("POST /api/scenarios/[id]/run", async () => {
    const { id } = await context.params;
    const scenario = await prisma.scenario.findUnique({ where: { id }, select: { farmId: true } });
    if (!scenario) throw new HttpError(404, "Scenario not found.");
    await requireScenarioRun(scenario.farmId);

    const result = await runScenario(id);

    return ok({
      runId: result.run.id,
      reused: result.reused,
      impact: result.impact,
      financial: result.financial ?? result.run.financialResultJson,
      disclaimer: result.impact.disclaimer,
      note: "Decision support only — the bank retains the credit decision.",
    });
  });
}
