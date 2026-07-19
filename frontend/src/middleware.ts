import { NextResponse, type NextRequest } from "next/server";
import { AUTH_TOKEN_COOKIE } from "@/config/constants";

const AUTH_ROUTES = ["/login", "/signup"];
const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/settings"];

/**
 * Cheap edge-level gate only: it checks for a session-presence cookie, not
 * token validity (a JWT can't be verified without a round trip, and
 * middleware shouldn't add that latency to every request). Real 401
 * handling happens client-side via useAuthGuard, which redirects to
 * /login if a request comes back unauthorized mid-session.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(AUTH_TOKEN_COOKIE);

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isProtectedRoute = PROTECTED_PREFIXES.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/settings/:path*", "/login", "/signup"],
};
