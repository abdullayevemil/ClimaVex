import { prisma } from "@/lib/prisma";
import { handle, ok, readJson } from "@/server/http";
import { HttpError, requireFinanceWrite } from "@/server/auth/guards";
import { createLoanSchema } from "@/server/schemas";
import { Prisma } from "@prisma/client";
import { isoDateToUtcDate } from "@/domain/finance/dates";

/** Loan terms are added by the lending or insuring institution, per the approved concept. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle("POST /api/farms/[id]/loans", async () => {
    const { id } = await context.params;
    const access = await requireFinanceWrite(id);

    const body = createLoanSchema.parse(await readJson(request));
    const farm = await prisma.farm.findUnique({ where: { id }, select: { borrowerId: true } });
    if (!farm?.borrowerId) throw new HttpError(422, "This farm has no borrower on record, so a loan cannot be attached.");

    const loan = await prisma.loan.create({
      data: {
        borrowerId: farm.borrowerId,
        farmId: id,
        reference: body.reference,
        principal: new Prisma.Decimal(body.principal),
        outstandingPrincipal: new Prisma.Decimal(body.principal),
        interestRatePct: new Prisma.Decimal(body.interestRatePct),
        startDate: isoDateToUtcDate(body.startDate),
        endDate: isoDateToUtcDate(body.endDate),
        createdByUserId: access.user.id,
        createdByRole: access.user.role,
        schedule: {
          create: body.instalments.map((i) => ({
            sequence: i.sequence,
            dueDate: isoDateToUtcDate(i.dueDate),
            amount: new Prisma.Decimal(i.amount),
          })),
        },
      },
    });

    return ok({ id: loan.id }, 201);
  });
}
