import { prisma } from "@/lib/prisma";
import { getSessionUser, type SessionUser } from "./session";

/**
 * Authorization is enforced here, in the backend, on every route — never in
 * the interface. Hiding a button is a usability choice; this is the control.
 *
 * Access is split by OBJECT CLASS rather than read/write, because the approved
 * concept has farmers defining the twin while banks and insurers add loan
 * terms, cash flows and insurance details to it:
 *
 *   twin write    (geometry, parcels, sections, crops, seasons, resources) — owner only
 *   finance write (loans, schedules, cash-flow events, policies)           — owner or granted institution
 *   scenario run                                                            — owner or any granted reader
 *   read                                                                    — owner or any granted reader
 *
 * There is no demo bypass. The demo user is an ordinary seeded row and passes
 * through exactly these checks.
 */
export class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly details?: unknown) {
    super(message);
    this.name = "HttpError";
  }
}

export const UNAUTHORIZED = () => new HttpError(401, "Sign in to continue.");
export const FORBIDDEN = () => new HttpError(403, "You do not have access to this farm.");

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw UNAUTHORIZED();
  return user;
}

export async function requireRole(roles: SessionUser["role"][]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw FORBIDDEN();
  return user;
}

type FarmAccess = {
  user: SessionUser;
  isOwner: boolean;
  canReadTwin: boolean;
  canWriteTwin: boolean;
  canWriteFinance: boolean;
  canRunScenario: boolean;
};

export async function getFarmAccess(farmId: string): Promise<FarmAccess> {
  const user = await requireUser();

  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    select: { id: true, ownerUserId: true, borrowerId: true },
  });
  if (!farm) throw new HttpError(404, "Farm not found.");

  if (user.role === "ADMIN") {
    return { user, isOwner: false, canReadTwin: true, canWriteTwin: true, canWriteFinance: true, canRunScenario: true };
  }

  const isOwner = farm.ownerUserId === user.id;
  if (isOwner) {
    return { user, isOwner: true, canReadTwin: true, canWriteTwin: true, canWriteFinance: true, canRunScenario: true };
  }

  if (user.role !== "BANK_USER" && user.role !== "INSURER") {
    return { user, isOwner: false, canReadTwin: false, canWriteTwin: false, canWriteFinance: false, canRunScenario: false };
  }

  const grant = await prisma.accessGrant.findFirst({
    where: {
      grantedToId: user.id,
      revokedAt: null,
      OR: [{ farmId: farm.id }, { farmId: null, borrowerId: farm.borrowerId ?? "__none__" }],
    },
    orderBy: { grantedAt: "desc" },
  });

  if (!grant) {
    return { user, isOwner: false, canReadTwin: false, canWriteTwin: false, canWriteFinance: false, canRunScenario: false };
  }

  return {
    user,
    isOwner: false,
    canReadTwin: true,
    // An institution never writes geometry, whatever its grant scope.
    canWriteTwin: false,
    canWriteFinance: grant.scope === "FINANCE_WRITE",
    canRunScenario: grant.scope === "READ_SCENARIO" || grant.scope === "FINANCE_WRITE",
  };
}

export async function requireFarmRead(farmId: string): Promise<FarmAccess> {
  const access = await getFarmAccess(farmId);
  if (!access.canReadTwin) throw FORBIDDEN();
  return access;
}

export async function requireTwinWrite(farmId: string): Promise<FarmAccess> {
  const access = await getFarmAccess(farmId);
  if (!access.canWriteTwin) {
    if (access.canReadTwin) {
      throw new HttpError(403, "Only the farm owner can change field geometry, sections or crops.");
    }
    throw FORBIDDEN();
  }
  return access;
}

export async function requireFinanceWrite(farmId: string): Promise<FarmAccess> {
  const access = await getFarmAccess(farmId);
  if (!access.canWriteFinance) {
    if (access.canReadTwin) {
      throw new HttpError(403, "Your access to this farm does not include adding financial terms.");
    }
    throw FORBIDDEN();
  }
  return access;
}

export async function requireScenarioRun(farmId: string): Promise<FarmAccess> {
  const access = await getFarmAccess(farmId);
  if (!access.canRunScenario) {
    if (access.canReadTwin) throw new HttpError(403, "Your access to this farm does not include running scenarios.");
    throw FORBIDDEN();
  }
  return access;
}

/** Farms the signed-in user may see: their own, plus anything granted to them. */
export async function visibleFarmWhere(user: SessionUser) {
  if (user.role === "ADMIN") return {};
  if (user.role === "FARMER") return { ownerUserId: user.id };

  const grants = await prisma.accessGrant.findMany({
    where: { grantedToId: user.id, revokedAt: null },
    select: { farmId: true, borrowerId: true },
  });

  const farmIds = grants.map((g) => g.farmId).filter((v): v is string => Boolean(v));
  const borrowerIds = grants.filter((g) => !g.farmId).map((g) => g.borrowerId);

  if (farmIds.length === 0 && borrowerIds.length === 0) return { id: "__none__" };
  return { OR: [{ id: { in: farmIds } }, { borrowerId: { in: borrowerIds } }] };
}
