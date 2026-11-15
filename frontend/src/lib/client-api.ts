export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Browser-side call to the backend. Requests go to this app's own /api/* (proxied to the backend by
 * next.config.mjs), so the httpOnly session cookie is sent automatically.
 * Always resolves (never throws) with { ok, data } or { ok, error } so forms can show the message.
 */
export async function apiRequest<T = unknown>(method: string, path: string, body?: unknown): Promise<Result<T>> {
  try {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: body !== undefined && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as { data?: T; error?: string } | null;
    if (!res.ok) {
      // Session expired mid-use: send them to sign in again (but not when the failed call *was* the sign-in).
      if (res.status === 401 && !path.startsWith("/auth/login")) window.location.assign("/login");
      return { ok: false, error: json?.error ?? "Something went wrong. Please try again." };
    }
    return { ok: true, data: json?.data as T };
  } catch {
    return { ok: false, error: "Can't reach the server. Check your connection and try again." };
  }
}
