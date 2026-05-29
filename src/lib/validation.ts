import { z } from "zod";

const coordsSchema = z.object({
  lat: z.number().finite(),
  lng: z.number().finite(),
});

const locationSchema = z.object({
  address: z.string().min(1).max(500),
  coords: coordsSchema,
});

const legSchema = z.object({
  from: locationSchema,
  to: locationSchema,
  distanceKm: z.number().positive().finite(),
});

// Validates JSON-serializable objects for Prisma Json fields
const jsonObjectSchema = z.record(z.string(), z.unknown()).transform(
  (val) => val as Record<string, unknown>
);

export const createTripSchema = z.object({
  date: z.string().optional(),
  totalKm: z.number().positive().finite().max(100_000),
  purpose: z.string().max(500).default(""),
  notes: z.string().max(2000).default(""),
  returnedToStart: z.boolean().default(false),
  startingPoint: jsonObjectSchema.default({}),
  legs: z.array(legSchema).nonempty(),
});

export const updateTripSchema = z.object({
  date: z.string().optional(),
  totalKm: z.number().positive().finite().max(100_000).optional(),
  purpose: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  returnedToStart: z.boolean().optional(),
  startingPoint: jsonObjectSchema.optional(),
  legs: z.array(legSchema).nonempty().optional(),
});
