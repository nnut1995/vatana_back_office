import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config (no database / bcrypt imports) so it can run in
 * middleware. The Credentials provider is added in auth.ts, which runs in the
 * Node.js runtime.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        // Already signed in? Bounce to the dashboard.
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      // Every other matched route requires a session.
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
