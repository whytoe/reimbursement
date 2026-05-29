import type { Expense, Trip, TripLeg } from "@prisma/client";

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
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}
