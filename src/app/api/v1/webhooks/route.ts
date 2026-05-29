import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKeyUser } from "@/lib/apiAuth";
import { serializeWebhookEndpoint } from "@/lib/serialize";
import { CreateWebhookEndpointSchema } from "@/lib/openapi/schemas";
import { generateWebhookSecret } from "@/lib/webhooks";

export async function GET(request: NextRequest) {
  const auth = await requireApiKeyUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(endpoints.map(serializeWebhookEndpoint));
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

  const parsed = CreateWebhookEndpointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const secret = generateWebhookSecret();
  const endpoint = await prisma.webhookEndpoint.create({
    data: { userId, url: parsed.data.url, enabled: parsed.data.enabled, secret },
  });

  // The signing secret is returned exactly once and never exposed again.
  return NextResponse.json(
    { ...serializeWebhookEndpoint(endpoint), secret },
    { status: 201 }
  );
}
