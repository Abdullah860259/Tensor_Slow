// Next.js 16 proxy convention (replacing middleware.ts)
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  // NOTE: Optimistic cookie checking only confirms that an auth token cookie EXISTS.
  // This is NOT authorization. It does NOT cryptographically validate the session or perform server-side authorization.
  // Real authorization MUST be re-checked via auth.api.getSession() on the server in Server Components, Server Actions, or Route Handlers.
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/items");

  const sessionCookie =
    getSessionCookie(request) ||
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/items/:path*"],
};
