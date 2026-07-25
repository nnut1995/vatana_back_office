import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next.js 16 "proxy" convention (formerly middleware). Uses the edge-safe auth
// config (no DB) to gate page routes; the `authorized` callback in authConfig
// decides access and redirects unauthenticated users to /login.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Protect all pages. API routes are excluded here and guarded individually
  // with auth() where needed (see src/app/api/orders/*). Static assets and the
  // auth endpoints are always allowed.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
