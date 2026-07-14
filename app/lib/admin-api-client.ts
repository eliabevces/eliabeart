"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side fetch wrapper for admin API calls. Auth.js sends the session
 * cookie automatically on same-origin requests, so no token handling is
 * needed here — this just redirects to the login page if a call comes back
 * unauthorized (expired/invalid session), matching requireAuth() server-side.
 */
export function useAdminApi() {
  const router = useRouter();

  const adminFetch = useCallback(
    async (input: string, init: RequestInit = {}): Promise<Response> => {
      const response = await fetch(input, init);

      if (response.status === 401) {
        router.push("/admin/login");
      }

      return response;
    },
    [router]
  );

  return { adminFetch };
}
