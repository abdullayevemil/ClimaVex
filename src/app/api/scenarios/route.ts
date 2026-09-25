import { prisma } from "@/lib/prisma";
import { handle, ok, readJson } from "@/server/http";
import { HttpError, requireScenarioRun } from "@/server/auth/guards";
import { runScenarioSchema } from "@/server/schemas";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  return handle("GET /api/scenarios", async () => {
    const farmId = new URL(request.url).searchParams.get("farmId");
    if (!farmId) throw new HttpError(400, "A farmId is required.");
    await requireScenarioRun(farmId);

    const [scenarios, datasets] = await Promise.all([
      prisma.scenario.findMany({
        where: { farmId },
        orderBy: { createdAt: "desc" },
        include: { runs: { orderBy: { createdAt: "desc" }, take: 1 }, weatherDataset: true },
      }),
      prisma.weatherDataset.findMany({ orderBy: { name: "asc" } }),
    ]);

    return ok({
      scenarios: scenarios.map((s) => ({
        id: s.id, name: s.name, kind: s.kind, dateAlignment: s.dateAlignment,
        weatherDataset: s.weatherDataset
          ? { id: s.weatherDataset.id, name: s.weatherDataset.name, kind: s.weatherDataset.kind, provenance: s.weatherDataset.provenance }
          : null,
        latestRunId: s.runs[0]?.id ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
      weatherDatasets: datasets.map((d) => ({
        id: d.id, name: d.name, kind: d.kind, provenance: d.provenance,
        attribution: d.attribution, license: d.license,
        startDate: d.startDate.toISOString().slice(0, 10),
        endDate: d.endDate.toISOString().slice(0, 10),
      })),
    });
  });
}

export async function POST(request: Request) {
  return handle("POST /api/scenarios", async () => {
    const url = new URL(request.url);
    const farmId = url.searchParams.get("farmId");
    if (!farmId) throw new HttpError(400, "A farmId is required.");
    const access = await requireScenarioRun(farmId);

    const body = runScenarioSchema.parse(await readJson(request));
    const season = await prisma.season.findFirst({ where: { id: body.seasonId, farmId } });
    if (!season) throw new HttpError(404, "Season not found for this farm.");

    if (body.kind === "WEATHER_REPLAY" && !body.weatherDatasetId) {
      throw new HttpError(422, "A weather replay needs a weather dataset.");
    }
    if (body.kind === "RESOURCE_DISRUPTION" && !body.disruption) {
      throw new HttpError(422, "A disruption scenario needs resources and a date range.");
    }

    const scenario = await prisma.scenario.create({
      data: {
        farmId,
        seasonId: body.seasonId,
        name: body.name,
        kind: body.kind,
        weatherDatasetId: body.weatherDatasetId ?? null,
        dateAlignment: body.dateAlignment ?? "ALIGN_TO_PLANTING",
        params: (body.disruption ? { disruption: body.disruption } : {}) as Prisma.InputJsonValue,
        createdByUserId: access.user.id,
      },
    });

    return ok({ id: scenario.id }, 201);
  });
}
