// Console: player directory. GET ?q=   POST { name, gender, rating?, locality?, phone?, userId? }   PATCH { id, ... }
import { z } from "zod";
import { body, HttpError, normPhone, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";

export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  await requireStaff();
  const q = new URL(req.url).searchParams.get("q")?.trim();
  let query = db().from("players").select("id, code, full_name, gender, rating, locality, phone, profile_id, played, won, titles").order("full_name").limit(500);
  if (q) query = query.ilike("full_name", `%${q}%`);
  const { data } = await query;
  return ok({ players: data ?? [] });
});

const Fields = {
  name: z.string().min(2).max(120), gender: z.enum(["M", "F", "X"]), rating: z.number().min(1).max(8).optional(),
  locality: z.string().max(80).optional(), phone: z.string().optional(), userId: z.string().uuid().nullable().optional(),
};

export const POST = route(async (req: Request) => {
  const staff = await requireStaff();
  const i = await body(req, z.object(Fields));
  const { data, error } = await db().from("players").insert({
    code: "p" + crypto.randomUUID().replace(/-/g, "").slice(0, 10), full_name: i.name, gender: i.gender, rating: i.rating ?? 3,
    locality: i.locality ?? null, phone: i.phone ? normPhone(i.phone) : null, profile_id: i.userId ?? null,
  }).select("id, code").single();
  if (error?.code === "23505") throw new HttpError(409, "That account already has a player profile");
  if (error) throw error;
  await audit(staff.profileId, "player.create", "player", data.id, i);
  return ok(data, { status: 201 });
});

export const PATCH = route(async (req: Request) => {
  const staff = await requireStaff();
  const i = await body(req, z.object(Fields).partial().extend({ id: z.string().uuid() }));
  const patch: Record<string, unknown> = {};
  if (i.name) patch.full_name = i.name;
  if (i.gender) patch.gender = i.gender;
  if (i.rating !== undefined) patch.rating = i.rating;
  if (i.locality !== undefined) patch.locality = i.locality;
  if (i.phone !== undefined) patch.phone = i.phone ? normPhone(i.phone as string) : null;
  if (i.userId !== undefined) patch.profile_id = i.userId;
  await db().from("players").update(patch).eq("id", i.id);
  await audit(staff.profileId, "player.edit", "player", i.id, i);
  return ok();
});
