import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUserId } from "@/lib/session";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    userId = await getRequiredUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const key = await prisma.apiKey.findFirst({ where: { id, userId } });
  if (!key) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  if (key.revokedAt) {
    return NextResponse.json({ id: key.id, revokedAt: key.revokedAt });
  }

  const revoked = await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
    select: { id: true, revokedAt: true },
  });

  return NextResponse.json(revoked);
}
