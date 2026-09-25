import { prisma } from "@/lib/prisma";
import { money } from "@/domain/finance/money";
import { toIsoDate } from "@/domain/finance/dates";
import { runLedger, type LedgerEvent } from "@/domain/finance/ledger";

/**
 * Assemble the dated ledger for one farm-season from stored events plus every
 * scheduled repayment falling inside the season.
 *
 * Repayment instalments are pulled from the schedule rather than duplicated as
 * cash-flow rows, so a schedule edit cannot leave a stale copy behind and no
 * instalment can be counted twice.
 */
export async function buildLedgerEvents(
  farmId: string,
  seasonId: string,
  extra: LedgerEvent[] = [],
): Promise<{ events: LedgerEvent[]; seasonStart: string; seasonEnd: string }> {
  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new Error("Season not found");

  const seasonStart = toIsoDate(season.startDate);
  const seasonEnd = toIsoDate(season.endDate);

  const [stored, loans] = await Promise.all([
    prisma.cashFlowEvent.findMany({ where: { farmId, seasonId }, orderBy: [{ date: "asc" }, { id: "asc" }] }),
    prisma.loan.findMany({ where: { farmId }, include: { schedule: { orderBy: { sequence: "asc" } } } }),
  ]);

  const events: LedgerEvent[] = stored.map((e) => ({
    id: e.id,
    kind: e.kind,
    date: toIsoDate(e.date),
    amount: money(e.amount.toString()),
    label: e.label,
    loanId: e.loanId,
  }));

  for (const loan of loans) {
    for (const instalment of loan.schedule) {
      const due = toIsoDate(instalment.dueDate);
      if (due < seasonStart || due > seasonEnd) continue;
      events.push({
        id: instalment.id,
        kind: "LOAN_REPAYMENT_DUE",
        date: due,
        amount: money(instalment.amount.toString()),
        label: `${loan.reference} instalment ${instalment.sequence}`,
        loanId: loan.id,
      });
    }
  }

  return { events: [...events, ...extra], seasonStart, seasonEnd };
}

export async function computeLedger(farmId: string, seasonId: string, extra: LedgerEvent[] = []) {
  const { events, seasonStart, seasonEnd } = await buildLedgerEvents(farmId, seasonId, extra);
  return { ...runLedger(events), seasonStart, seasonEnd, eventCount: events.length };
}
