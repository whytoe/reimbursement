import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { createRateLimiter } from "./rate-limit";

// 10 login attempts per 15 minutes per email address
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true, // Required: app runs behind a reverse proxy in production
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 }, // 7 days
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("[auth] reject reason=missing-credentials");
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const { allowed } = loginLimiter(email);
        if (!allowed) {
          console.error(`[auth] reject reason=rate-limited email=${email}`);
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            console.error(`[auth] reject reason=no-user email=${email}`);
            return null;
          }
          if (!user.passwordHash) {
            console.error(`[auth] reject reason=no-hash email=${email}`);
            return null;
          }

          const isValid = await compare(password, user.passwordHash);
          if (!isValid) {
            console.error(`[auth] reject reason=bad-password email=${email}`);
            return null;
          }

          console.error(`[auth] accept email=${email}`);
          return { id: user.id, email: user.email, name: user.name };
        } catch (err) {
          console.error("[auth] authorize error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const { pathname } = request.nextUrl;

      // Allow auth pages for unauthenticated users
      if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
        return isLoggedIn
          ? Response.redirect(new URL("/", request.url))
          : true;
      }

      // All other routes require auth
      if (!isLoggedIn) {
        return Response.redirect(new URL("/login", request.url));
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
