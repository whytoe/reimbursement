import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  CreateTripSchema,
  ErrorSchema,
  SettingsSchema,
  TripSchema,
  UpdateSettingsSchema,
} from "./schemas";

function buildRegistry(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();

  const bearerAuth = registry.registerComponent("securitySchemes", "apiKey", {
    type: "http",
    scheme: "bearer",
    description:
      "Machine-to-machine API key. Send as `Authorization: Bearer wis_<key>`. " +
      "Create keys via POST /api/keys while signed in to the web app.",
  });

  const security = [{ [bearerAuth.name]: [] }];

  const jsonResponse = <T extends z.ZodType>(description: string, schema: T) => ({
    description,
    content: { "application/json": { schema } },
  });

  const errorResponse = (description: string) => jsonResponse(description, ErrorSchema);

  registry.registerPath({
    method: "get",
    path: "/api/v1/trips",
    summary: "List trips",
    description: "Returns all trips for the authenticated user, newest first.",
    tags: ["Trips"],
    security,
    request: {
      query: z.object({
        from: z.string().optional().openapi({ description: "Inclusive start date (ISO 8601)" }),
        to: z.string().optional().openapi({ description: "Inclusive end date (ISO 8601)" }),
      }),
    },
    responses: {
      200: jsonResponse("List of trips", z.array(TripSchema)),
      401: errorResponse("Missing or invalid API key"),
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/trips",
    summary: "Create a trip",
    description: "Creates a trip with its legs for the authenticated user.",
    tags: ["Trips"],
    security,
    request: {
      body: { content: { "application/json": { schema: CreateTripSchema } } },
    },
    responses: {
      201: jsonResponse("Created trip", TripSchema),
      400: errorResponse("Invalid input"),
      401: errorResponse("Missing or invalid API key"),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/trips/{id}",
    summary: "Get a trip",
    description: "Returns a single trip owned by the authenticated user.",
    tags: ["Trips"],
    security,
    request: {
      params: z.object({ id: z.string().openapi({ description: "Trip ID" }) }),
    },
    responses: {
      200: jsonResponse("The trip", TripSchema),
      401: errorResponse("Missing or invalid API key"),
      404: errorResponse("Trip not found"),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/settings",
    summary: "Get settings",
    description: "Returns the authenticated user's starting points and mileage rate.",
    tags: ["Settings"],
    security,
    responses: {
      200: jsonResponse("User settings", SettingsSchema),
      401: errorResponse("Missing or invalid API key"),
    },
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/settings",
    summary: "Update settings",
    description: "Updates (upserts) the authenticated user's settings.",
    tags: ["Settings"],
    security,
    request: {
      body: { content: { "application/json": { schema: UpdateSettingsSchema } } },
    },
    responses: {
      200: jsonResponse("Updated settings", SettingsSchema),
      400: errorResponse("Invalid input"),
      401: errorResponse("Missing or invalid API key"),
    },
  });

  return registry;
}

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(buildRegistry().definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Which is shorter? — Integration API",
      version: "1.0.0",
      description:
        "External integration API for mileage trips and settings. " +
        "Authenticate machine-to-machine requests with an API key via the " +
        "`Authorization: Bearer` header.",
    },
    servers: [{ url: "/", description: "This deployment" }],
    tags: [
      { name: "Trips", description: "Mileage trips and their legs" },
      { name: "Settings", description: "Per-user starting points and mileage rate" },
    ],
  });
}
