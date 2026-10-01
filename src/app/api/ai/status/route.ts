import { NextResponse } from "next/server";
import { resolveProviderMode } from "@/domain/scenario/providers";
import { getHealth } from "@/server/ml/client";

export const dynamic = "force-dynamic";

/**
 * Whether the risk score is currently backed by the ML service. Drives the
 * banner: it reports what is true right now, not what was configured.
 */
export async function GET() {
  const mode = resolveProviderMode(process.env.PROVIDER);
  if (mode === "deterministic") return NextResponse.json({ mode, connected: false });

  try {
    const health = await getHealth();
    return NextResponse.json({
      mode,
      connected: health.modelAvailable,
      serviceVersion: health.serviceVersion,
      modelTrainedAt: health.modelTrainedAt ?? null,
      regions: health.regions,
    });
  } catch (error) {
    return NextResponse.json({
      mode,
      connected: false,
      reason: error instanceof Error ? error.message : "ML service unreachable.",
    });
  }
}
