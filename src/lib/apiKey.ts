import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";
import type { User } from "@prisma/client";

const KEY_NAMESPACE = "wis";

export interface GeneratedApiKey {
  /** The full secret key, shown to the user exactly once. */
  fullKey: string;
  /** Stable lookup prefix stored in the DB (e.g. "wis_a1b2c3d4"). */
  keyPrefix: string;
  /** SHA-256 hex digest of the full key. */
  hashedKey: string;
}

export function hashKey(fullKey: string): string {
  return createHash("sha256").update(fullKey).digest("hex");
}

/**
 * Mints a new API key. The full key has the shape
 * `wis_<prefixId>_<secret>`. `wis_<prefixId>` is the lookup prefix; only the
 * SHA-256 hash of the full key is persisted.
 */
export function generateApiKey(): GeneratedApiKey {
  const prefixId = randomBytes(6).toString("hex"); // 12 hex chars
  const secret = randomBytes(32).toString("base64url");
  const keyPrefix = `${KEY_NAMESPACE}_${prefixId}`;
  const fullKey = `${keyPrefix}_${secret}`;
  return { fullKey, keyPrefix, hashedKey: hashKey(fullKey) };
}

function extractKeyPrefix(fullKey: string): string | null {
  const parts = fullKey.split("_");
  if (parts.length < 3 || parts[0] !== KEY_NAMESPACE || !parts[1]) {
    return null;
  }
  return `${parts[0]}_${parts[1]}`;
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function parseBearer(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match ? match[1].trim() : null;
}

/**
 * Authenticates a request via `Authorization: Bearer <key>`. Returns the
 * owning User on success (and bumps lastUsedAt), or null for any
 * missing/invalid/revoked key.
 */
export async function authenticateApiKey(request: Request): Promise<User | null> {
  const fullKey = parseBearer(request.headers.get("authorization"));
  if (!fullKey) return null;

  const keyPrefix = extractKeyPrefix(fullKey);
  if (!keyPrefix) return null;

  const record = await prisma.apiKey.findUnique({
    where: { keyPrefix },
    include: { user: true },
  });
  if (!record || record.revokedAt) return null;

  if (!safeEqualHex(hashKey(fullKey), record.hashedKey)) return null;

  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return record.user;
}
