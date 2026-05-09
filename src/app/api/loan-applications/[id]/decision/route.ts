import { LoanApplicationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { serializeLoanDecision } from "@/lib/api-serializers";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      maxLtv?: number;
      provisioningRateAdjustment?: number;
      insuranceRequirement?: string;
      note?: string;
      decidedBy?: string;
      status?: LoanApplicationStatus;
    };

    const application = await prisma.loanApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Loan application not found." },
        { status: 404 },
      );
    }

    const status =
      body.status === LoanApplicationStatus.DECLINED
        ? LoanApplicationStatus.DECLINED
        : LoanApplicationStatus.APPROVED_WITH_CONDITIONS;

    const decision = await prisma.$transaction(async (tx) => {
      const createdDecision = await tx.loanDecision.create({
        data: {
          loanApplicationId: id,
          status,
          maxLtv: body.maxLtv ?? 58,
          provisioningRateAdjustment: body.provisioningRateAdjustment ?? 15,
          insuranceRequirement:
            body.insuranceRequirement ?? "Mandatory TARSİM drought coverage",
          note:
            body.note ??
            "Approved with modified climate-risk conditions for audit record.",
          decidedBy: body.decidedBy ?? "Aysel Karimova",
          decidedAt: new Date(),
        },
      });

      await tx.loanApplication.update({
        where: { id },
        data: { status },
      });

      return createdDecision;
    });

    return NextResponse.json(serializeLoanDecision(decision));
  } catch (error) {
    console.error("POST /api/loan-applications/[id]/decision failed", error);
    return NextResponse.json(
      { error: "Unable to log the credit decision." },
      { status: 500 },
    );
  }
}
