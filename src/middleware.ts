export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login, /register (auth pages)
     * - /api/auth/* (auth API)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /test.html (static files)
     */
    "/((?!login|register|api/auth|api/health|_next|favicon\\.ico|test\\.html).*)",
  ],
};
