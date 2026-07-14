import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Returns true if the current request has a valid admin session
 * (Auth.js JWT session cookie, checked via next/headers under the hood).
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return !!session?.user;
}

/**
 * Helper to return 401 if there's no valid admin session, used in protected API routes.
 */
export async function requireAuth(): Promise<{ userId: string } | NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { userId: session.user.name ?? "admin" };
}
