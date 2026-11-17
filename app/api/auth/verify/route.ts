// POST /api/auth/verify  { phone? | email?, code, name?, role? }
// Verifies the code, sets the Supabase session cookies, and creates the profile + player record
// at first login so later entries are pre-filled (proposal section 4, "one-step re-entry").
import { z } from "zod";
import { body, clientIp, HttpError, normPhone, ok, rateLimit, route } from "@/lib/http";
import { db, userClient } from "@/lib/supabase";
import { audit } from "@/lib/session";

const In = z.object({
  phone: z.string().optional(),
  email: z.string().optional(),
  code: z.string().regex(/^\d{6}$/, "Enter all 6 digits"),
  name: z.string().max(120).optional(),
  role: z.enum(["player", "team_owner", "organiser"]).default("player"),
});

export const POST = route(async (req: Request) => {
  const i = await body(req, In);
  const phone = i.phone ? normPhone(i.phone) : "";
  const email = i.email?.toLowerCase().trim() ?? "";
  rateLimit("verify:" + (phone || email || clientIp(req)), 6, 10 * 60_000);

  const sb = await userClient();
  const { data, error } = phone
    ? await sb.auth.verifyOtp({ phone, token: i.code, type: "sms" })
    : await sb.auth.verifyOtp({ email, token: i.code, type: "email" });
  if (error || !data.user) throw new HttpError(401, "That code is wrong or has expired");
  const uid = data.user.id;

  const { data: existing } = await db().from("profiles").select("id, role, full_name").eq("id", uid).maybeSingle();
  let role = existing?.role ?? "player";
  if (!existing) {
    // Owners are matched to teams the organiser registered with this mobile.
    const { data: teams } = phone ? await db().from("teams").select("id").eq("owner_phone", phone) : { data: [] };
    role = teams?.length ? "team_owner" : "player";
    await db().from("profiles").insert({ id: uid, full_name: i.name ?? "", phone: phone || null, email: email || null, role, phone_verified_at: phone ? new Date().toISOString() : null });
    if (teams?.length) await db().from("teams").update({ owner_profile: uid, owner_verified: true }).in("id", teams.map((t) => t.id));
  } else if (phone) {
    await db().from("profiles").update({ phone, phone_verified_at: new Date().toISOString() }).eq("id", uid);
  }
  if (existing && i.name && !existing.full_name) {
    await db().from("profiles").update({ full_name: i.name }).eq("id", uid);
  }
  if (i.role === "organiser" && role !== "organiser" && role !== "admin") {
    await sb.auth.signOut();
    throw new HttpError(403, "This email is not registered as an organiser");
  }

  // Link or create the public player profile (verified mobile)
  const { data: pl } = await db().from("players").select("id, code").eq("profile_id", uid).maybeSingle();
  let player = pl;
  if (!player && role !== "organiser" && role !== "admin") {
    const { data: byPhone } = phone ? await db().from("players").select("id, code").eq("phone", phone).is("profile_id", null).maybeSingle() : { data: null };
    if (byPhone) {
      await db().from("players").update({ profile_id: uid }).eq("id", byPhone.id);
      player = byPhone;
    } else {
      const { data: created } = await db().from("players").insert({
        code: "p" + uid.replace(/-/g, "").slice(0, 10), profile_id: uid, full_name: i.name || existing?.full_name || "New player", phone: phone || null,
      }).select("id, code").single();
      player = created;
    }
  }
  await audit(uid, "auth.login", "profile", uid, { via: phone ? "phone" : "email" });
  return ok({ role, player: player?.code ?? null });
});
