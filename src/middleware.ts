export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login, /register (auth pages)
     * - /api/auth/* (auth API)
     * - /api/v1/* (API-key authed integration API — handles its own auth)
     * - /api/openapi.json, /api/docs (public API spec + docs)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /test.html (static files)
     */
    "/((?!login|register|api/auth|api/health|api/v1|api/openapi\\.json|api/docs|_next|favicon\\.ico|test\\.html).*)",
  ],
};
