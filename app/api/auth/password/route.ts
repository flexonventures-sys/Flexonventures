// POST /api/auth/password { email, password, role? }
// Email + password login, handled entirely by Supabase Auth (signInWithPassword).
// Organisers and admins must have an organiser/admin profile; team owners must own a team.
import { z } from "zod";
import { body, clientIp, HttpError, ok, rateLimit, route } from "@/lib/http";
import { db, userClient } from "@/lib/supabase";
import { audit } from "@/lib/session";

const In = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password").max(200),
  role: z.enum(["player", "team_owner", "organiser"]).default("player"),
});

export const POST = route(async (req: Request) => {
  const i = await body(req, In);
  const email = i.email.toLowerCase().trim();
  rateLimit("pw:ip:" + clientIp(req), 20, 15 * 60_000);
  rateLimit("pw:to:" + email, 6, 15 * 60_000);

  const sb = await userClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password: i.password });
  if (error || !data.user) throw new HttpError(401, "Wrong email or password");

  const { data: p } = await db().from("profiles").select("role, full_name").eq("id", data.user.id).maybeSingle();
  const role = p?.role ?? "player";
  const staff = role === "organiser" || role === "admin";
  if ((i.role === "organiser" && !staff) || role === "referee") {
    await sb.auth.signOut();
    throw new HttpError(403, "This account cannot use this login");
  }
  if (i.role === "team_owner") {
    const { data: t } = await db().from("teams").select("id").eq("owner_profile", data.user.id).eq("owner_access", true).limit(1);
    if (!t?.length) { await sb.auth.signOut(); throw new HttpError(403, "No team is registered to this account"); }
  }
  await audit(data.user.id, "auth.login", "profile", data.user.id, { via: "password" });
  return ok({ role, name: p?.full_name ?? "" });
});
