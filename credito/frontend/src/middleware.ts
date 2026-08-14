import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware corre en Edge Runtime: no puede usar firebase-admin (Node).
 * Solo verifica presencia de cookie; la validación del token debe hacerse
 * en rutas API/server con firebase-admin si se requiere verificación real.
 */
export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/backoffice/:path*"],
};
