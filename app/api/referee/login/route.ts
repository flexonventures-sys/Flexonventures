// POST /api/referee/login  { tournament: "kol26", court: 1, pin: "1234" }
// Referees need no account: court + 4-digit PIN unlocks that court only (proposal section 9).
import { cookies } from "next/headers";
import { z } from "zod";
import { body, clientIp, HttpError, ok, rateLimit, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { REF_COOKIE, refToken } from "@/lib/session";

const In = z.object({
  tournament: z.string().min(1),
  court: z.number().int().min(1).max(32),
  pin: z.string().regex(/^\d{4}$/, "Enter the 4-digit court PIN"),
});

export const POST = route(async (req: Request) => {
  const i = await body(req, In);
  rateLimit(`pin:${clientIp(req)}:${i.tournament}:${i.court}`, 5, 10 * 60_000);
  const { data: t } = await db().from("tournaments").select("id").eq("code", i.tournament).maybeSingle();
  if (!t) throw new HttpError(404, "Tournament not found");
  const { data: good } = await db().rpc("check_court_pin", { p_tournament: t.id, p_court: i.court, p_pin: i.pin });
  if (!good) throw new HttpError(401, "Wrong PIN for this court");
  const hours = 14;
  (await cookies()).set(REF_COOKIE, refToken({ tournamentId: t.id, court: i.court, exp: Date.now() + hours * 3600_000 }), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: hours * 3600,
  });
  return ok({ court: i.court });
});
