import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { AuthUser } from "./types";

// Server-side (Server Components) access to the backend API.
// Runs on the Next.js server, forwards the visitor's session cookie, and talks to the backend directly.
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request(path: string): Promise<Response> {
  // Read cookies outside the try: during prerender Next throws here to mark the page dynamic,
  // and that signal must not be swallowed.
  const cookie = cookies().toString();
  try {
    return await fetch(`${BACKEND_URL}/api${path}`, {
      headers: { cookie },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(503, "Can't reach the server. Please try again in a moment.");
  }
}

/** GET `path` and return the `data` payload. 401 -> login, 403 -> home (which routes by role), 404 -> not-found page. */
export async function serverGet<T>(path: string): Promise<T> {
  const res = await request(path);
  if (res.status === 401) redirect("/login");
  if (res.status === 403) redirect("/");
  if (res.status === 404) notFound();
  if (!res.ok) throw new ApiError(res.status, `Request failed (${res.status})`);
  return ((await res.json()) as { data: T }).data;
}

/** The signed-in user, or null (no redirect). */
export async function getMe(): Promise<AuthUser | null> {
  let res: Response;
  try {
    res = await request("/auth/me");
  } catch {
    return null; // backend unreachable: treat as signed out so /login still renders
  }
  if (!res.ok) return null;
  return ((await res.json()) as { data: AuthUser }).data;
}

export async function requireStaff(): Promise<AuthUser> {
  const u = await getMe();
  if (!u) redirect("/login");
  if (u.role === "tenant") redirect("/tenant");
  return u;
}

export async function requireLandlord(): Promise<AuthUser> {
  const u = await requireStaff();
  if (u.role !== "landlord") redirect("/admin");
  return u;
}

export async function requireTenant(): Promise<AuthUser> {
  const u = await getMe();
  if (!u) redirect("/login");
  if (u.role !== "tenant") redirect("/admin");
  return u;
}
