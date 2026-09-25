import { prisma } from "@/lib/prisma";
import { handle, ok, readJson } from "@/server/http";
import { HttpError, requireFarmRead, requireFinanceWrite } from "@/server/auth/guards";
import { createCashFlowSchema } from "@/server/schemas";
import { computeLedger } from "@/server/repositories/cashflow-repo";
import { Prisma } from "@prisma/client";
import { isoDateToUtcDate } from "@/domain/finance/dates";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle("GET /api/farms/[id]/cashflow", async () => {
    const { id } = await context.params;
    await requireFarmRead(id);

    const seasonId = new URL(request.url).searchParams.get("seasonId");
    if (!seasonId) throw new HttpError(400, "A seasonId is required.");

    const ledger = await computeLedger(id, seasonId);
    return ok({
      ledger,
      /* Three measures that are never interchangeable. */
      measures: {
        creditExposure: await outstandingFor(id),
        simulatedRepaymentShortfall: ledger.peakShortfall,
        actualCreditLoss: "0.00",
        actualCreditLossNote: "Not modelled. Credit exposed to an event is not automatically a credit loss.",
      },
      note: "Decision support only — the bank retains the credit decision.",
    });
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle("POST /api/farms/[id]/cashflow", async () => {
    const { id } = await context.params;
    // Banks and insurers add cash flows; this is the object class they own.
    const access = await requireFinanceWrite(id);

    const body = createCashFlowSchema.parse(await readJson(request));
    const season = await prisma.season.findFirst({ where: { id: body.seasonId, farmId: id } });
    if (!season) throw new HttpError(404, "Season not found for this farm.");

    const event = await prisma.cashFlowEvent.create({
      data: {
        seasonId: body.seasonId,
        farmId: id,
        loanId: body.loanId ?? null,
        kind: body.kind,
        date: isoDateToUtcDate(body.date),
        amount: new Prisma.Decimal(body.amount),
        label: body.label,
        source: "USER",
        createdByUserId: access.user.id,
        createdByRole: access.user.role,
      },
    });

    return ok({ id: event.id }, 201);
  });
}

async function outstandingFor(farmId: string): Promise<string> {
  const loans = await prisma.loan.findMany({ where: { farmId }, select: { outstandingPrincipal: true } });
  return loans
    .reduce((acc, l) => acc.plus(l.outstandingPrincipal), new Prisma.Decimal(0))
    .toFixed(2);
}
