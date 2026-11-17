// Console: edit a match before or during play: sides (team events, mixers), court, time, referee.
// PATCH { sideA?: [playerIds], sideB?, court?, at? (ISO), referee? }
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";

const In = z.object({
  sideA: z.array(z.string().uuid()).max(2).optional(), sideB: z.array(z.string().uuid()).max(2).optional(),
  court: z.number().int().min(1).max(64).nullable().optional(), at: z.string().datetime({ offset: true }).nullable().optional(), referee: z.string().max(80).optional(),
});

export const PATCH = route(async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const staff = await requireStaff();
  const code = (await ctx.params).code;
  const i = await body(req, In);
  const { data: m } = await db().from("matches").select("id, status").eq("code", code).maybeSingle();
  if (!m) throw new HttpError(404, "Match not found");
  if ((i.sideA || i.sideB) && m.status !== "upcoming") throw new HttpError(409, "Players can only change before the match starts");
  await db().from("matches").update({
    ...(i.sideA && { side_a: i.sideA }), ...(i.sideB && { side_b: i.sideB }),
    ...(i.court !== undefined && { court_no: i.court }), ...(i.at !== undefined && { scheduled_at: i.at }), ...(i.referee !== undefined && { referee_name: i.referee }),
  }).eq("id", m.id);
  await audit(staff.profileId, "match.edit", "match", code, i);
  return ok();
});
