import { NextResponse, type NextRequest } from "next/server";

// Project ref extracted from the Supabase URL (no @supabase/ssr — avoids the
// cookie-chunk join bug on Vercel where anon key fragments form an invalid Bearer token)
const PROJECT_REF = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .replace("https://", "")
  .split(".")[0];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isPublicPath = pathname === "/" || isAuthPage || pathname.startsWith("/auth/callback");

  const tokenCookie = `sb-${PROJECT_REF}-auth-token`;
  const hasSession =
    request.cookies.has(tokenCookie) || request.cookies.has(`${tokenCookie}.0`);

  if (!hasSession && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasSession && isAuthPage) {
    return NextResponse.redirect(new URL("/redirect", request.url));
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
