import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const LEGACY_HOSTS = new Set([
  "gasoradar-teal.vercel.app",
  "gasoradar-jonri.vercel.app",
  "gasoradar-git-main-jonri.vercel.app",
]);

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase();
  if (!hostname || !LEGACY_HOSTS.has(hostname)) return NextResponse.next();

  const destination = request.nextUrl.clone();
  destination.protocol = "https:";
  destination.host = "www.gasolinago.com";
  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
