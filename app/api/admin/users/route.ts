// Admin: every login on the platform (Supabase Auth users + profile role).
// GET ?q=&role=   list     POST { email?, phone?, password?, name, role, playerId?, createPlayer?, gender? }  create a login
// Organisers manage players and team owners; only admins create or change organisers/admins.
import { z } from "zod";
import { body, HttpError, normPhone, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";

export const dynamic = "force-dynamic";
const ROLES = ["player", "team_owner", "referee", "organiser", "admin"] as const;

export const GET = route(async (req: Request) => {
  await requireStaff();
  const u = new URL(req.url).searchParams;
  const users: { id: string; email?: string; phone?: string; created_at: string; last_sign_in_at?: string; banned_until?: string }[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db().auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...(data.users as typeof users));
    if (data.users.length < 200) break;
  }
  const { data: profiles } = await db().from("profiles").select("id, full_name, role, phone, phone_verified_at");
  const { data: players } = await db().from("players").select("id, code, full_name, profile_id").not("profile_id", "is", null);
  const { data: teams } = await db().from("teams").select("id, name, owner_profile, tournaments(code, name)").not("owner_profile", "is", null);
  const prof = new Map((profiles ?? []).map((p) => [p.id, p]));
  const pl = new Map((players ?? []).map((p) => [p.profile_id, p]));
  let rows = users.map((x) => {
    const p = prof.get(x.id);
    return {
      id: x.id, email: x.email ?? null, phone: x.phone || p?.phone || null, name: p?.full_name ?? "", role: p?.role ?? "player",
      created: x.created_at, lastSignIn: x.last_sign_in_at ?? null, disabled: !!x.banned_until && new Date(x.banned_until) > new Date(),
      phoneVerified: !!p?.phone_verified_at, player: pl.get(x.id) ?? null,
      teams: (teams ?? []).filter((t) => t.owner_profile === x.id).map((t) => ({ id: t.id, name: t.name })),
    };
  });
  const q = u.get("q")?.toLowerCase(), role = u.get("role");
  if (q) rows = rows.filter((r) => [r.email, r.phone, r.name].some((v) => v?.toLowerCase().includes(q)));
  if (role) rows = rows.filter((r) => r.role === role);
  rows.sort((a, b) => ROLES.indexOf(b.role as (typeof ROLES)[number]) - ROLES.indexOf(a.role as (typeof ROLES)[number]) || a.name.localeCompare(b.name));
  return ok({ users: rows });
});

const In = z.object({
  email: z.string().email().optional(), phone: z.string().optional(),
  password: z.string().min(10, "Password must be at least 10 characters").max(72).optional(),
  name: z.string().min(2).max(120), role: z.enum(ROLES).default("player"),
  playerId: z.string().uuid().optional(), createPlayer: z.boolean().default(false), gender: z.enum(["M", "F", "X"]).default("X"),
}).refine((x) => x.email || x.phone, { message: "Email or mobile is required" });

export const POST = route(async (req: Request) => {
  const staff = await requireStaff();
  const i = await body(req, In);
  if ((i.role === "organiser" || i.role === "admin") && staff.role !== "admin") throw new HttpError(403, "Only admins can create organiser or admin logins");
  const phone = i.phone ? normPhone(i.phone) : undefined;
  const { data, error } = await db().auth.admin.createUser({
    email: i.email?.toLowerCase(), phone, password: i.password, email_confirm: !!i.email, phone_confirm: !!phone, user_metadata: { full_name: i.name },
  });
  if (error) throw new HttpError(error.status === 422 ? 409 : 400, error.message);
  const id = data.user.id;
  await db().from("profiles").upsert({ id, email: i.email?.toLowerCase() ?? null, phone: phone ?? null, full_name: i.name, role: i.role,
    phone_verified_at: phone ? new Date().toISOString() : null, org_id: i.role === "organiser" || i.role === "admin" ? "00000000-0000-0000-0000-000000000001" : null });
  if (i.playerId) await db().from("players").update({ profile_id: id }).eq("id", i.playerId);
  else if (i.createPlayer || i.role === "player" || i.role === "team_owner")
    await db().from("players").insert({ code: "p" + id.replace(/-/g, "").slice(0, 10), profile_id: id, full_name: i.name, gender: i.gender, phone: phone ?? null });
  await audit(staff.profileId, "user.create", "profile", id, { role: i.role, email: i.email, phone });
  return ok({ id }, { status: 201 });
});
