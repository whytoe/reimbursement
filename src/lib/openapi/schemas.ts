import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const CoordsSchema = z
  .object({
    lat: z.number().finite().openapi({ example: 51.5074 }),
    lng: z.number().finite().openapi({ example: -0.1278 }),
  })
  .openapi("Coords");

export const LocationSchema = z
  .object({
    address: z.string().min(1).max(500).openapi({ example: "10 Downing St, London" }),
    coords: CoordsSchema,
  })
  .openapi("Location");

export const LegInputSchema = z
  .object({
    from: LocationSchema,
    to: LocationSchema,
    distanceKm: z.number().positive().finite().openapi({ example: 12.4 }),
  })
  .openapi("LegInput");

export const TripLegSchema = z
  .object({
    id: z.string(),
    index: z.number().int(),
    from: LocationSchema,
    to: LocationSchema,
    distanceKm: z.number().positive().finite(),
  })
  .openapi("TripLeg");

// startingPoint is a free-form JSON object (typically a Location).
const StartingPointSchema = z
  .record(z.string(), z.unknown())
  .openapi("StartingPoint", { type: "object", additionalProperties: true });

export const TripSchema = z
  .object({
    id: z.string(),
    date: z.string().openapi({ format: "date-time" }),
    totalKm: z.number(),
    purpose: z.string(),
    notes: z.string(),
    returnedToStart: z.boolean(),
    startingPoint: StartingPointSchema,
    createdAt: z.string().openapi({ format: "date-time" }),
    updatedAt: z.string().openapi({ format: "date-time" }),
    legs: z.array(TripLegSchema),
  })
  .openapi("Trip");

export const CreateTripSchema = z
  .object({
    date: z.string().optional().openapi({ format: "date-time" }),
    totalKm: z.number().positive().finite().max(100_000),
    purpose: z.string().max(500).default(""),
    notes: z.string().max(2000).default(""),
    returnedToStart: z.boolean().default(false),
    startingPoint: StartingPointSchema.default({}),
    legs: z.array(LegInputSchema).nonempty(),
  })
  .openapi("CreateTripRequest");

export const ExpenseTypeSchema = z
  .enum(["MILEAGE", "MEALS", "LODGING", "SUPPLIES", "OTHER"])
  .openapi("ExpenseType", { example: "MEALS" });

export const ExpenseStatusSchema = z
  .enum(["PENDING", "SUBMITTED", "APPROVED", "REJECTED", "REIMBURSED"])
  .openapi("ExpenseStatus", { example: "PENDING" });

export const ExpenseSchema = z
  .object({
    id: z.string(),
    type: ExpenseTypeSchema,
    amount: z.number().openapi({ example: 42.5 }),
    currency: z.string().openapi({ example: "CAD" }),
    date: z.string().openapi({ format: "date-time" }),
    description: z.string(),
    receiptUrl: z.string().nullable(),
    status: ExpenseStatusSchema,
    tripId: z.string().nullable(),
    createdAt: z.string().openapi({ format: "date-time" }),
    updatedAt: z.string().openapi({ format: "date-time" }),
  })
  .openapi("Expense");

export const CreateExpenseSchema = z
  .object({
    type: ExpenseTypeSchema,
    // Optional when linking a MILEAGE expense to a trip — the amount is then
    // computed from the trip distance and the user's mileage rate.
    amount: z.number().positive().finite().max(1_000_000).optional(),
    currency: z.string().min(1).max(10).default("CAD"),
    date: z.string().optional().openapi({ format: "date-time" }),
    description: z.string().max(2000).default(""),
    receiptUrl: z.string().url().max(2000).optional(),
    status: ExpenseStatusSchema.default("PENDING"),
    tripId: z.string().optional().openapi({
      description: "Link this expense to a trip. For MILEAGE expenses, amount is computed if omitted.",
    }),
  })
  .openapi("CreateExpenseRequest");

export const UpdateExpenseSchema = z
  .object({
    type: ExpenseTypeSchema.optional(),
    amount: z.number().positive().finite().max(1_000_000).optional(),
    currency: z.string().min(1).max(10).optional(),
    date: z.string().optional().openapi({ format: "date-time" }),
    description: z.string().max(2000).optional(),
    receiptUrl: z.string().url().max(2000).nullable().optional(),
    status: ExpenseStatusSchema.optional(),
  })
  .openapi("UpdateExpenseRequest");

export const SettingsSchema = z
  .object({
    startingPointA: z.record(z.string(), z.unknown()).nullable(),
    startingPointB: z.record(z.string(), z.unknown()).nullable(),
    mileageRate: z.number().openapi({ example: 0.45 }),
  })
  .openapi("Settings");

export const UpdateSettingsSchema = z
  .object({
    startingPointA: z.record(z.string(), z.unknown()).optional(),
    startingPointB: z.record(z.string(), z.unknown()).optional(),
    mileageRate: z.number().nonnegative().optional(),
  })
  .openapi("UpdateSettingsRequest");

export const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: "Invalid or missing API key" }),
  })
  .openapi("Error");
