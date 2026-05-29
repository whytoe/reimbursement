import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyUser } from "@/lib/apiAuth";
import { serializeReimbursement } from "@/lib/serialize";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiKeyUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const { id } = await params;

  const reimbursement = await prisma.reimbursement.findFirst({
    where: { id, userId },
    include: { expenses: { orderBy: { date: "desc" } } },
  });

  if (!reimbursement) {
    return NextResponse.json({ error: "Reimbursement not found" }, { status: 404 });
  }

  return NextResponse.json(serializeReimbursement(reimbursement));
}
