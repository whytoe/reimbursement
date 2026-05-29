import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { requireApiKeyUser } from "./apiAuth";
import { serializeReimbursement } from "./serialize";
import { emitWebhookEvent, type WebhookEvent } from "./webhooks";
import type { ReimbursementStatus } from "@prisma/client";

type StampField = "submittedAt" | "approvedAt" | "paidAt";

interface TransitionSpec {
  from: ReimbursementStatus;
  to: ReimbursementStatus;
  stamp: StampField;
  event: WebhookEvent;
}

export const REIMBURSEMENT_TRANSITIONS = {
  submit: { from: "DRAFT", to: "SUBMITTED", stamp: "submittedAt", event: "reimbursement.submitted" },
  approve: { from: "SUBMITTED", to: "APPROVED", stamp: "approvedAt", event: "reimbursement.approved" },
  "mark-paid": { from: "APPROVED", to: "PAID", stamp: "paidAt", event: "reimbursement.paid" },
} satisfies Record<string, TransitionSpec>;

export type TransitionName = keyof typeof REIMBURSEMENT_TRANSITIONS;

/**
 * Runs a reimbursement lifecycle transition for an /api/v1 request: authenticates,
 * verifies ownership, enforces the allowed source state, stamps the transition
 * time, and emits the corresponding integration webhook. Returns the response.
 */
export async function runReimbursementTransition(
  request: Request,
  id: string,
  name: TransitionName
): Promise<NextResponse> {
  const auth = await requireApiKeyUser(request);
  if (auth.response) return auth.response;
  const userId = auth.user.id;

  const spec = REIMBURSEMENT_TRANSITIONS[name];

  const existing = await prisma.reimbursement.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Reimbursement not found" }, { status: 404 });
  }

  if (existing.status !== spec.from) {
    return NextResponse.json(
      {
        error: `Cannot ${name} a reimbursement in status ${existing.status}; expected ${spec.from}`,
      },
      { status: 409 }
    );
  }

  const updated = await prisma.reimbursement.update({
    where: { id },
    data: { status: spec.to, [spec.stamp]: new Date() },
    include: { expenses: { orderBy: { date: "desc" } } },
  });

  const serialized = serializeReimbursement(updated);
  await emitWebhookEvent(userId, spec.event, serialized);

  return NextResponse.json(serialized);
}
