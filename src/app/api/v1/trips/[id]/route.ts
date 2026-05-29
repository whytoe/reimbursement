import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyUser } from "@/lib/apiAuth";
import { serializeTrip } from "@/lib/serialize";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiKeyUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const { id } = await params;

  const trip = await prisma.trip.findFirst({
    where: { id, userId },
    include: { legs: { orderBy: { index: "asc" } } },
  });

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json(serializeTrip(trip));
}
