import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
  },
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => queryRaw.mockReset());

  it("returns 200 ok when the database responds", async () => {
    queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("returns 503 degraded when the database throws", async () => {
    queryRaw.mockRejectedValueOnce(new Error("connection refused"));

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "degraded" });
  });
});
