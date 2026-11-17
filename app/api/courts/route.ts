// GET   /api/courts?tournament=kol26   courts, referees, streams (no PINs)
// PATCH /api/courts { tournament, court, referee?, pin?, stream? }   Setup: courts, PINs, stream links
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";

export const GET = route(async (req: Request) => {
  const code = new URL(req.url).searchParams.get("tournament");
  const { data: t } = await db().from("tournaments").select("id").eq("code", code ?? "").maybeSingle();
  if (!t) throw new HttpError(404, "Tournament not found");
  const { data } = await db().from("courts").select("number, referee_name, stream_url, pin_set_at").eq("tournament_id", t.id).order("number");
  return ok({ courts: data ?? [] });
});

const In = z.object({
  tournament: z.string(),
  court: z.number().int().min(1),
  referee: z.string().max(80).optional(),
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits").optional(),
  stream: z.string().url("Paste the full YouTube live link").or(z.literal("")).optional(),
});

export const PATCH = route(async (req: Request) => {
  const staff = await requireStaff();
  const i = await body(req, In);
  const { data: t } = await db().from("tournaments").select("id").eq("code", i.tournament).maybeSingle();
  if (!t) throw new HttpError(404, "Tournament not found");
  if (i.stream && !/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(i.stream)) throw new HttpError(400, "Only YouTube live links are supported");
  const { data: court } = await db().from("courts").upsert({
    tournament_id: t.id, number: i.court,
    ...(i.referee !== undefined && { referee_name: i.referee }),
    ...(i.stream !== undefined && { stream_url: i.stream || null }),
  }, { onConflict: "tournament_id,number" }).select("id").single();
  if (i.pin) await db().rpc("set_court_pin", { p_court: court!.id, p_pin: i.pin });
  await audit(staff.profileId, "court.update", "court", court!.id, { court: i.court, referee: i.referee, stream: i.stream, pin: i.pin ? "reset" : undefined });
  return ok();
});
