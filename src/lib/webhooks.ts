import { createHmac, randomBytes, randomUUID } from "crypto";
import { prisma } from "./prisma";

export const WEBHOOK_EVENTS = [
  "expense.created",
  "reimbursement.submitted",
  "reimbursement.approved",
  "reimbursement.paid",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** Mints a webhook signing secret shown to the caller once at registration. */
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString("base64url")}`;
}

/** HMAC-SHA256 over the raw payload, hex-encoded, prefixed `sha256=`. */
export function signWebhookPayload(secret: string, payload: string): string {
  const digest = createHmac("sha256", secret).update(payload).digest("hex");
  return `sha256=${digest}`;
}

interface DeliveryResult {
  endpointId: string;
  ok: boolean;
  status?: number;
  error?: string;
}

async function deliver(
  endpoint: { id: string; url: string; secret: string },
  body: string,
  headers: Record<string, string>
): Promise<DeliveryResult> {
  const maxAttempts = 2;
  let lastError = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
      if (res.ok) return { endpointId: endpoint.id, ok: true, status: res.status };
      lastError = `HTTP ${res.status}`;
      // Don't retry client errors — they won't succeed on a second try.
      if (res.status >= 400 && res.status < 500) {
        return { endpointId: endpoint.id, ok: false, status: res.status, error: lastError };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "delivery failed";
    }
  }
  return { endpointId: endpoint.id, ok: false, error: lastError };
}

/**
 * Best-effort fan-out of an integration event to a user's enabled webhook
 * endpoints. Each endpoint receives a JSON body and an HMAC-SHA256 signature
 * computed with that endpoint's secret. Failures are swallowed so they never
 * block the originating API request.
 */
export async function emitWebhookEvent(
  userId: string,
  event: WebhookEvent,
  data: unknown
): Promise<void> {
  let endpoints: { id: string; url: string; secret: string }[];
  try {
    endpoints = await prisma.webhookEndpoint.findMany({
      where: { userId, enabled: true },
      select: { id: true, url: true, secret: true },
    });
  } catch {
    return;
  }
  if (endpoints.length === 0) return;

  const envelope = {
    id: randomUUID(),
    event,
    createdAt: new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(envelope);

  await Promise.allSettled(
    endpoints.map((endpoint) =>
      deliver(endpoint, body, {
        "Content-Type": "application/json",
        "X-Webhook-Id": envelope.id,
        "X-Webhook-Event": event,
        "X-Webhook-Signature": signWebhookPayload(endpoint.secret, body),
      })
    )
  );
}
