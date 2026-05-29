import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyUser } from "@/lib/apiAuth";
import { serializeExpense } from "@/lib/serialize";
import { CreateExpenseSchema } from "@/lib/openapi/schemas";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireApiKeyUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  const where: Prisma.ExpenseWhereInput = { userId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.date.lte = toDate;
    }
  }
  if (type) where.type = type as Prisma.ExpenseWhereInput["type"];
  if (status) where.status = status as Prisma.ExpenseWhereInput["status"];

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses.map(serializeExpense));
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

  const parsed = CreateExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { type, currency, date, description, receiptUrl, status, tripId } = parsed.data;
  let amount = parsed.data.amount;
  let expenseDate = date ? new Date(date) : undefined;

  if (tripId !== undefined) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
      include: { expense: true },
    });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    if (trip.expense) {
      return NextResponse.json(
        { error: "Trip already has a linked expense" },
        { status: 409 }
      );
    }
    // Inherit the trip date when one wasn't supplied.
    if (!expenseDate) expenseDate = trip.date;
    // Compute mileage reimbursement from the trip distance when amount is omitted.
    if (amount === undefined && type === "MILEAGE") {
      const settings = await prisma.userSettings.findUnique({ where: { userId } });
      amount = trip.totalKm * (settings?.mileageRate ?? 0);
    }
  }

  if (amount === undefined) {
    return NextResponse.json(
      {
        error:
          "amount is required (only omittable for a MILEAGE expense linked to a trip)",
      },
      { status: 400 }
    );
  }

  const expense = await prisma.expense.create({
    data: {
      userId,
      type,
      amount,
      currency,
      date: expenseDate ?? new Date(),
      description,
      receiptUrl: receiptUrl ?? null,
      status,
      tripId: tripId ?? null,
    },
  });

  return NextResponse.json(serializeExpense(expense), { status: 201 });
}
