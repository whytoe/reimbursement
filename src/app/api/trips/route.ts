import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUserId } from "@/lib/session";
import { createTripSchema } from "@/lib/validation";
import type { InputJsonValue } from "@prisma/client/runtime/library";

export async function GET(request: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: { userId: string; date?: { gte?: Date; lte?: Date } } = { userId };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    const trips = await prisma.trip.findMany({
      where,
      include: { legs: { orderBy: { index: "asc" } } },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(trips);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    const body = await request.json();

    const parsed = createTripSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { date, totalKm, purpose, notes, returnedToStart, startingPoint, legs } = parsed.data;

    const trip = await prisma.trip.create({
      data: {
        userId,
        date: date ? new Date(date) : new Date(),
        totalKm,
        purpose,
        notes,
        returnedToStart,
        startingPoint: startingPoint as InputJsonValue,
        legs: {
          create: legs.map((leg, index) => ({
            index,
            fromAddr: leg.from.address,
            fromLat: leg.from.coords.lat,
            fromLng: leg.from.coords.lng,
            toAddr: leg.to.address,
            toLat: leg.to.coords.lat,
            toLng: leg.to.coords.lng,
            distanceKm: leg.distanceKm,
          })),
        },
      },
      include: { legs: { orderBy: { index: "asc" } } },
    });

    return NextResponse.json(trip, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save trip" }, { status: 500 });
  }
}
