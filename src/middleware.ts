import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "next-auth.session-token",
  });

  console.log("[MIDDLEWARE] Path:", request.nextUrl.pathname);
  console.log("[MIDDLEWARE] Token exists:", !!token);

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");

  // If on auth page and logged in, redirect to dashboard
  if (isAuthPage) {
    if (token) {
      console.log("[MIDDLEWARE] Logged in user on auth page, redirecting to dashboard");
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // If on dashboard and not logged in, redirect to login
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!token) {
      console.log("[MIDDLEWARE] No token, redirecting to login");
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
