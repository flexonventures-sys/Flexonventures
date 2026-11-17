import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type infer as Infer } from "zod";
import { HttpError } from "./supabase";

export { HttpError };

export const ok = (data: unknown = { ok: true }, init?: ResponseInit) => NextResponse.json(data, init);

/** Wraps a route handler: maps HttpError/ZodError to JSON errors, hides internals. */
export function route<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A): Promise<Response> => {
    try {
      return await fn(...a);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid input" }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export async function body<S extends ZodTypeAny>(req: Request, schema: S): Promise<Infer<S>> {
  const raw = await req.json().catch(() => { throw new HttpError(400, "Expected a JSON body"); });
  return schema.parse(raw);
}

// Fixed-window limiter, per serverless instance. Supabase Auth's own OTP limits are the hard
// backstop (proposal section 14: rate-limited codes).
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now(), h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + windowMs }); return; }
  if (++h.n > max) throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";

export const normPhone = (p?: string | null) => {
  if (!p) return "";
  const d = p.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  if (!/^[6-9]\d{9}$/.test(d)) throw new HttpError(400, "Enter a valid 10-digit Indian mobile number");
  return "+91" + d;
};
