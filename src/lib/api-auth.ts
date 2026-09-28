import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Guard for API route handlers. Returns a 401 Response when there is no
 * session, or null when the request is authenticated (proceed).
 *
 *   const denied = await requireAuth();
 *   if (denied) return denied;
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }
  return null;
}
