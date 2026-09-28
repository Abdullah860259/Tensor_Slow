// STUB for Agent B (manifest item 22)
// NOTE: Next.js 16 renamed middleware.ts to proxy.ts exporting proxy()
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  // NOTE: Optimistic cookie checking only confirms that an auth token cookie exists.
  // It does NOT cryptographically validate the session or perform server-side authorization.
  // Real authorization MUST be performed on the server via auth.api.getSession().
  const authCookie = request.cookies.get("better-auth.session_token") || request.cookies.get("__Secure-better-auth.session_token");

  if (!authCookie && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/items/:path*"],
};
