// Hidden admin entrance.
// When ADMIN_SECRET_PATH is set, the organiser surfaces are not reachable at their normal URLs:
//   /<secret>            -> Flexon Console   (sets the access cookie)
//   /<secret>/matchday   -> matchday app: organiser login, courts, scoring, referee login
// /console, /admin and /organiser/* return 404 unless the cookie is present, so the public site never
// reveals them. This only hides the doors; every action is still protected by Supabase Auth and roles.
// With ADMIN_SECRET_PATH unset the routes stay open (local development).
import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "flx_ops";
const GATED = ["/console", "/admin", "/organiser"];
const hex = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("flexon-ops:" + s)))].map((b) => b.toString(16).padStart(2, "0")).join("");

const hide = (res: NextResponse) => {
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
};

export async function middleware(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET_PATH?.replace(/^\/+|\/+$/g, "");
  if (!secret) return NextResponse.next();
  const { pathname } = req.nextUrl;
  const token = await hex(secret);
  const notFound = () => hide(NextResponse.rewrite(new URL("/__not-found", req.url), { status: 404 }));
  const grant = (res: NextResponse) => {
    res.cookies.set(COOKIE, token, { httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: 12 * 3600 });
    return hide(res);
  };

  if (pathname === `/${secret}`) return grant(NextResponse.rewrite(new URL("/console", req.url)));
  if (pathname === `/${secret}/matchday`) return grant(NextResponse.rewrite(new URL("/organiser/index.html", req.url)));
  if (pathname.startsWith(`/${secret}/`)) return notFound();

  if (GATED.some((g) => pathname === g || pathname.startsWith(g + "/"))) {
    return req.cookies.get(COOKIE)?.value === token ? hide(NextResponse.next()) : notFound();
  }
  return NextResponse.next();
}

// Everything except Next internals and the public static assets.
export const config = { matcher: ["/((?!_next/|hub/|shared/|favicon.ico|sw.js|manifest.webmanifest|icon.svg).*)"] };
