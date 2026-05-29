import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyUser } from "@/lib/apiAuth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiKeyUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const { id } = await params;

  const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id, userId } });
  if (!endpoint) {
    return NextResponse.json({ error: "Webhook endpoint not found" }, { status: 404 });
  }

  await prisma.webhookEndpoint.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
