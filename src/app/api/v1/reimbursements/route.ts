import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyUser } from "@/lib/apiAuth";
import { serializeReimbursement } from "@/lib/serialize";
import { CreateReimbursementSchema } from "@/lib/openapi/schemas";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireApiKeyUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: Prisma.ReimbursementWhereInput = { userId };
  if (status) where.status = status as Prisma.ReimbursementWhereInput["status"];

  const reimbursements = await prisma.reimbursement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { expenses: { orderBy: { date: "desc" } } },
  });

  return NextResponse.json(reimbursements.map(serializeReimbursement));
}

export async function POST(request: NextRequest) {
  const auth = await requireApiKeyUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateReimbursementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, notes, expenseIds } = parsed.data;
  const uniqueIds = [...new Set(expenseIds)];

  if (uniqueIds.length > 0) {
    const owned = await prisma.expense.findMany({
      where: { id: { in: uniqueIds }, userId },
      select: { id: true, reimbursementId: true },
    });
    if (owned.length !== uniqueIds.length) {
      return NextResponse.json(
        { error: "One or more expenses were not found" },
        { status: 404 }
      );
    }
    const alreadyGrouped = owned.filter((e) => e.reimbursementId !== null);
    if (alreadyGrouped.length > 0) {
      return NextResponse.json(
        {
          error: "One or more expenses already belong to a reimbursement",
          expenseIds: alreadyGrouped.map((e) => e.id),
        },
        { status: 409 }
      );
    }
  }

  const reimbursement = await prisma.reimbursement.create({
    data: {
      userId,
      title,
      notes,
      ...(uniqueIds.length > 0 && {
        expenses: { connect: uniqueIds.map((id) => ({ id })) },
      }),
    },
    include: { expenses: { orderBy: { date: "desc" } } },
  });

  return NextResponse.json(serializeReimbursement(reimbursement), { status: 201 });
}
