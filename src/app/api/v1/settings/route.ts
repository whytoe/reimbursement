import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyUser } from "@/lib/apiAuth";
import { UpdateSettingsSchema } from "@/lib/openapi/schemas";
import type { InputJsonValue } from "@prisma/client/runtime/library";

export async function GET(request: NextRequest) {
  const auth = await requireApiKeyUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const settings = await prisma.userSettings.findUnique({ where: { userId } });

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
}

export async function PUT(request: NextRequest) {
  const auth = await requireApiKeyUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { startingPointA, startingPointB, mileageRate } = parsed.data;

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {
      ...(startingPointA !== undefined && { startingPointA: startingPointA as InputJsonValue }),
      ...(startingPointB !== undefined && { startingPointB: startingPointB as InputJsonValue }),
      ...(mileageRate !== undefined && { mileageRate }),
    },
    create: {
      userId,
      startingPointA: (startingPointA ?? {}) as InputJsonValue,
      startingPointB: (startingPointB ?? {}) as InputJsonValue,
      mileageRate: mileageRate ?? 0,
    },
  });

  return NextResponse.json({
    startingPointA: settings.startingPointA,
    startingPointB: settings.startingPointB,
    mileageRate: settings.mileageRate,
  });
}
