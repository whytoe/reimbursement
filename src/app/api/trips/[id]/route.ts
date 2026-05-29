import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUserId } from "@/lib/session";
import { updateTripSchema } from "@/lib/validation";
import type { InputJsonValue } from "@prisma/client/runtime/library";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequiredUserId();
    const { id } = await params;

    const trip = await prisma.trip.findFirst({
      where: { id, userId },
      include: { legs: { orderBy: { index: "asc" } } },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequiredUserId();
    const { id } = await params;
    const body = await request.json();

    const parsed = updateTripSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.trip.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const { date, totalKm, purpose, notes, returnedToStart, startingPoint, legs } = parsed.data;

    const trip = await prisma.$transaction(async (tx) => {
      // Delete old legs
      await tx.tripLeg.deleteMany({ where: { tripId: id } });

      // Update trip and create new legs
      return tx.trip.update({
        where: { id },
        data: {
          ...(date !== undefined && { date: new Date(date) }),
          ...(totalKm !== undefined && { totalKm }),
          ...(purpose !== undefined && { purpose }),
          ...(notes !== undefined && { notes }),
          ...(returnedToStart !== undefined && { returnedToStart }),
          ...(startingPoint !== undefined && { startingPoint: startingPoint as InputJsonValue }),
          ...(legs && {
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
          }),
        },
        include: { legs: { orderBy: { index: "asc" } } },
      });
    });

    return NextResponse.json(trip);
  } catch {
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequiredUserId();
    const { id } = await params;

    const existing = await prisma.trip.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    await prisma.trip.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
