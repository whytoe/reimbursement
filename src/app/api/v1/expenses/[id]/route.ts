import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyUser } from "@/lib/apiAuth";
import { serializeExpense } from "@/lib/serialize";
import { UpdateExpenseSchema } from "@/lib/openapi/schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiKeyUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const { id } = await params;

  const expense = await prisma.expense.findFirst({ where: { id, userId } });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  return NextResponse.json(serializeExpense(expense));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiKeyUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const { type, amount, currency, date, description, receiptUrl, status } = parsed.data;

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      ...(type !== undefined && { type }),
      ...(amount !== undefined && { amount }),
      ...(currency !== undefined && { currency }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(description !== undefined && { description }),
      ...(receiptUrl !== undefined && { receiptUrl }),
      ...(status !== undefined && { status }),
    },
  });

  return NextResponse.json(serializeExpense(expense));
}
