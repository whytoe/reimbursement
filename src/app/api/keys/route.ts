import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequiredUserId } from "@/lib/session";
import { generateApiKey } from "@/lib/apiKey";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  let userId: string;
  try {
    userId = await getRequiredUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
  });

  return NextResponse.json(keys);
}

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await getRequiredUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { fullKey, keyPrefix, hashedKey } = generateApiKey();

  const created = await prisma.apiKey.create({
    data: { userId, name: parsed.data.name, keyPrefix, hashedKey },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  });

  // The full key is returned exactly once and never persisted in plaintext.
  return NextResponse.json({ ...created, key: fullKey }, { status: 201 });
}
