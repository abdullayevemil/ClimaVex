import { prisma } from "@/lib/prisma";
import { handle, ok } from "@/server/http";
import { requireUser, visibleFarmWhere } from "@/server/auth/guards";
import { resourceExposure, type ExposureLink } from "@/domain/vulnerability/resource-exposure";

/**
 * Aggregate credit exposure behind one shared resource.
 *
 * Totals are computed over distinct loans. A canal feeding seven sections
 * across four loans must report four — summing per section would triple-count
 * a borrower and overstate concentration, which is exactly the number a
 * lending committee would act on.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handle("GET /api/portfolio/resource-exposure/[id]", async () => {
    const { id } = await context.params;
    const user = await requireUser();
    const farmWhere = await visibleFarmWhere(user);

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        links: {
          include: {
            section: {
              include: {
                farm: {
                  include: {
                    borrower: true,
                    loans: { orderBy: { reference: "asc" } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!resource) return ok({ exposure: null });

    const visibleFarms = await prisma.farm.findMany({ where: farmWhere, select: { id: true } });
    const visible = new Set(visibleFarms.map((f) => f.id));

    const links: ExposureLink[] = [];
    for (const link of resource.links) {
      const farm = link.section.farm;
      if (!visible.has(farm.id)) continue;
      const loan = farm.loans[0] ?? null;
      links.push({
        sectionId: link.sectionId,
        sectionLabel: link.section.label,
        farmId: farm.id,
        farmName: farm.name,
        borrowerId: farm.borrower?.id ?? "unknown",
        borrowerName: farm.borrower?.name ?? "Unassigned",
        loanId: loan?.id ?? null,
        loanReference: loan?.reference ?? null,
        outstandingPrincipal: loan?.outstandingPrincipal.toString() ?? null,
      });
    }

    return ok({ exposure: resourceExposure(resource.id, resource.name, links) });
  });
}
