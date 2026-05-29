import type {
  Expense,
  Reimbursement,
  Trip,
  TripLeg,
  WebhookEndpoint,
} from "@prisma/client";

type TripWithLegs = Trip & { legs: TripLeg[] };

/**
 * Maps a persisted Trip (with flat leg columns) into the symmetric external
 * v1 shape: legs as { from, to, distanceKm } with nested coords.
 */
export function serializeTrip(trip: TripWithLegs) {
  return {
    id: trip.id,
    date: trip.date.toISOString(),
    totalKm: trip.totalKm,
    purpose: trip.purpose,
    notes: trip.notes,
    returnedToStart: trip.returnedToStart,
    startingPoint: trip.startingPoint,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
    legs: trip.legs.map((leg) => ({
      id: leg.id,
      index: leg.index,
      from: { address: leg.fromAddr, coords: { lat: leg.fromLat, lng: leg.fromLng } },
      to: { address: leg.toAddr, coords: { lat: leg.toLat, lng: leg.toLng } },
      distanceKm: leg.distanceKm,
    })),
  };
}

/** Maps a persisted Expense into the external v1 JSON shape. */
export function serializeExpense(expense: Expense) {
  return {
    id: expense.id,
    type: expense.type,
    amount: expense.amount,
    currency: expense.currency,
    date: expense.date.toISOString(),
    description: expense.description,
    receiptUrl: expense.receiptUrl,
    status: expense.status,
    tripId: expense.tripId,
    reimbursementId: expense.reimbursementId,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

type ReimbursementWithExpenses = Reimbursement & { expenses: Expense[] };

/** Maps a persisted Reimbursement (with its expenses) into the v1 JSON shape. */
export function serializeReimbursement(reimbursement: ReimbursementWithExpenses) {
  return {
    id: reimbursement.id,
    title: reimbursement.title,
    notes: reimbursement.notes,
    status: reimbursement.status,
    submittedAt: reimbursement.submittedAt?.toISOString() ?? null,
    approvedAt: reimbursement.approvedAt?.toISOString() ?? null,
    paidAt: reimbursement.paidAt?.toISOString() ?? null,
    total: reimbursement.expenses.reduce((sum, e) => sum + e.amount, 0),
    expenses: reimbursement.expenses.map(serializeExpense),
    createdAt: reimbursement.createdAt.toISOString(),
    updatedAt: reimbursement.updatedAt.toISOString(),
  };
}

/**
 * Maps a persisted WebhookEndpoint into the v1 JSON shape. The signing secret
 * is intentionally omitted — it is returned only once, at registration time.
 */
export function serializeWebhookEndpoint(endpoint: WebhookEndpoint) {
  return {
    id: endpoint.id,
    url: endpoint.url,
    enabled: endpoint.enabled,
    createdAt: endpoint.createdAt.toISOString(),
    updatedAt: endpoint.updatedAt.toISOString(),
  };
}
