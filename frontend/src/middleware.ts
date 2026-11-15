import { NextResponse, type NextRequest } from "next/server";

// First line of defence: cheap redirect for visitors with no session cookie.
// This is NOT the security boundary. The backend verifies the session and the user's role on every
// API call, and the layouts check the role (see src/lib/server-api.ts) before rendering anything.
export function middleware(req: NextRequest) {
  if (!req.cookies.get("deed_session")?.value) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/tenant/:path*"],
};
