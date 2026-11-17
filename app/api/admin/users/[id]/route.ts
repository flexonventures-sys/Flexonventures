// Admin: edit a login. PATCH { name?, email?, phone?, password?, role?, disabled?, playerId? }   DELETE
import { z } from "zod";
import { body, HttpError, normPhone, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };
const In = z.object({
  name: z.string().min(2).max(120).optional(), email: z.string().email().optional(), phone: z.string().nullable().optional(),
  password: z.string().min(10, "Password must be at least 10 characters").max(72).optional(),
  role: z.enum(["player", "team_owner", "referee", "organiser", "admin"]).optional(), disabled: z.boolean().optional(),
  playerId: z.string().uuid().nullable().optional(),
});

async function guard(staff: { role: string; profileId: string }, id: string, newRole?: string) {
  const { data: p } = await db().from("profiles").select("role").eq("id", id).maybeSingle();
  const privileged = (r?: string) => r === "organiser" || r === "admin";
  if (staff.role !== "admin" && (privileged(p?.role) || privileged(newRole))) throw new HttpError(403, "Only admins can change organiser or admin logins");
  if (id === staff.profileId && newRole && newRole !== staff.role) throw new HttpError(409, "You cannot change your own role");
  return p;
}

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const staff = await requireStaff();
  const id = (await ctx.params).id;
  const i = await body(req, In);
  await guard(staff, id, i.role);
  if (i.disabled && id === staff.profileId) throw new HttpError(409, "You cannot disable your own login");
  const phone = i.phone === null ? "" : i.phone ? normPhone(i.phone) : undefined;
  const { error } = await db().auth.admin.updateUserById(id, {
    ...(i.email && { email: i.email.toLowerCase(), email_confirm: true }), ...(phone !== undefined && { phone, phone_confirm: !!phone }),
    ...(i.password && { password: i.password }), ...(i.disabled !== undefined && { ban_duration: i.disabled ? "876000h" : "none" }),
    ...(i.name && { user_metadata: { full_name: i.name } }),
  });
  if (error) throw new HttpError(400, error.message);
  await db().from("profiles").update({
    ...(i.name && { full_name: i.name }), ...(i.email && { email: i.email.toLowerCase() }), ...(phone !== undefined && { phone: phone || null }),
    ...(i.role && { role: i.role, org_id: i.role === "organiser" || i.role === "admin" ? "00000000-0000-0000-0000-000000000001" : null }),
  }).eq("id", id);
  if (i.playerId !== undefined) {
    await db().from("players").update({ profile_id: null }).eq("profile_id", id);
    if (i.playerId) await db().from("players").update({ profile_id: id }).eq("id", i.playerId);
  }
  await audit(staff.profileId, "user.edit", "profile", id, { ...i, password: i.password ? "reset" : undefined });
  return ok();
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const staff = await requireStaff();
  const id = (await ctx.params).id;
  if (id === staff.profileId) throw new HttpError(409, "You cannot delete your own login");
  await guard(staff, id);
  await db().from("players").update({ profile_id: null }).eq("profile_id", id);
  await db().from("teams").update({ owner_profile: null, owner_verified: false }).eq("owner_profile", id);
  const { error } = await db().auth.admin.deleteUser(id);
  if (error) throw new HttpError(400, error.message);
  await audit(staff.profileId, "user.delete", "profile", id);
  return ok();
});
