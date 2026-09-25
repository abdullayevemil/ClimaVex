import { prisma } from "@/lib/prisma";
import { handle, ok, readJson } from "@/server/http";
import { requireFinanceWrite } from "@/server/auth/guards";
import { createPolicySchema } from "@/server/schemas";
import { Prisma } from "@prisma/client";

/**
 * Insurance terms are user-entered or fixture data — never current TARSIM
 * rules. Every policy is stored with isDemoAssumption set and a source string,
 * and the interface says so wherever a payout is shown.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle("POST /api/farms/[id]/insurance", async () => {
    const { id } = await context.params;
    const access = await requireFinanceWrite(id);
    const body = createPolicySchema.parse(await readJson(request));

    const policy = await prisma.insurancePolicy.create({
      data: {
        farmId: id,
        provider: body.provider,
        eligibleHazards: body.eligibleHazards,
        coverageLimit: new Prisma.Decimal(body.coverageLimit),
        deductible: new Prisma.Decimal(body.deductible),
        assumedEligibility: body.assumedEligibility ?? true,
        payoutLagDays: body.payoutLagDays ?? 45,
        isDemoAssumption: true,
        source: "User-entered assumption — not current TARSIM rules",
        createdByUserId: access.user.id,
        createdByRole: access.user.role,
      },
    });

    return ok({ id: policy.id }, 201);
  });
}
