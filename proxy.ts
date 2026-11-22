import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate for /admin (Next 16 `proxy`, formerly middleware). It only checks that a
 * session cookie exists so signed-out visitors bounce to the login page quickly. It is NOT
 * the security boundary: every admin page and Server Action re-checks the session and the
 * ADMIN_EMAILS allow-list on the server (lib/admin-auth.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
