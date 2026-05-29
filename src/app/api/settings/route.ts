import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUserId } from "@/lib/session";

export async function GET() {
  try {
    const userId = await getRequiredUserId();

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return NextResponse.json({
        startingPointA: null,
        startingPointB: null,
        mileageRate: 0,
      });
    }

    return NextResponse.json({
      startingPointA: settings.startingPointA,
      startingPointB: settings.startingPointB,
      mileageRate: settings.mileageRate,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getRequiredUserId();
    const body = await request.json();

    const { startingPointA, startingPointB, mileageRate } = body;

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        ...(startingPointA !== undefined && { startingPointA }),
        ...(startingPointB !== undefined && { startingPointB }),
        ...(mileageRate !== undefined && { mileageRate }),
      },
      create: {
        userId,
        startingPointA: startingPointA ?? {},
        startingPointB: startingPointB ?? {},
        mileageRate: mileageRate ?? 0,
      },
    });

    return NextResponse.json({
      startingPointA: settings.startingPointA,
      startingPointB: settings.startingPointB,
      mileageRate: settings.mileageRate,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
