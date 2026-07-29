import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/supabase/proxy";

const protectedPrefixes = [
  "/dashboard",
  "/boardroom",
  "/meeting",
  "/reports",
  "/executives",
  "/history",
  "/settings",
  "/kanban",
  "/financials",
  "/market-research",
  "/startup-health",
  "/prd-generator",
  "/pitch-deck",
];

export async function proxy(request: NextRequest) {
  const isProtected = protectedPrefixes.some(
    (prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`),
  );

  const { response, user } = await getSessionUser(request);
  if (!isProtected) return response;
  if (user) return response;

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
