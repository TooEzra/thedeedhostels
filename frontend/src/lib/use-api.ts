"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, type Result } from "./client-api";

/**
 * Returns `call(method, path, body)`. After any successful non-GET call it refreshes the current route,
 * so Server Components re-fetch and the page shows the new data (this replaces revalidatePath).
 */
export function useApi() {
  const router = useRouter();
  return useCallback(
    async function call<T = unknown>(method: string, path: string, body?: unknown): Promise<Result<T>> {
      const res = await apiRequest<T>(method, path, body);
      if (res.ok && method !== "GET") router.refresh();
      return res;
    },
    [router],
  );
}

export function useLogout() {
  const router = useRouter();
  return useCallback(async () => {
    await apiRequest("POST", "/auth/logout");
    router.replace("/login");
    router.refresh();
  }, [router]);
}
