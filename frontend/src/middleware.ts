import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard and all subroutes
  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect /dev/admin subroutes (allow /dev/admin itself for the login view)
  if (pathname.startsWith("/dev/admin/") && pathname !== "/dev/admin") {
    const token = request.cookies.get("admin-token")?.value;
    if (!token) {
      const adminLoginUrl = new URL("/dev/admin", request.url);
      return NextResponse.redirect(adminLoginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dev/admin/:path*",
  ],
};
