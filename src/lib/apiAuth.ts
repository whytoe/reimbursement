import { NextResponse } from "next/server";
import { authenticateApiKey } from "./apiKey";
import type { User } from "@prisma/client";

export const UNAUTHORIZED = NextResponse.json(
  { error: "Invalid or missing API key" },
  { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
);

type ApiKeyAuthResult =
  | { user: User; response?: never }
  | { user?: never; response: NextResponse };

/**
 * Resolves the authenticated user for an /api/v1 request, or yields a ready-to-
 * return 401 response. Usage:
 *   const auth = await requireApiKeyUser(request);
 *   if (auth.response) return auth.response;
 *   const userId = auth.user.id;
 */
export async function requireApiKeyUser(request: Request): Promise<ApiKeyAuthResult> {
  const user = await authenticateApiKey(request);
  if (!user) return { response: UNAUTHORIZED };
  return { user };
}
