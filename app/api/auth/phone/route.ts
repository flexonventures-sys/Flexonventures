// Account setup verification: attach and verify a mobile number on the signed-in Supabase user.
//   POST  { phone }        Supabase issues a phone_change code; the Send SMS hook delivers it on WhatsApp
//   PUT   { phone, code }  Supabase verifies it; we mark the profile and player record verified
// Used when someone signed up by email and must verify their mobile before entering or owning a team.
import { z } from "zod";
import { body, clientIp, HttpError, normPhone, ok, rateLimit, route } from "@/lib/http";
import { db, userClient } from "@/lib/supabase";
import { audit, requireUser } from "@/lib/session";

export const POST = route(async (req: Request) => {
  const me = await requireUser();
  const { phone } = await body(req, z.object({ phone: z.string() }));
  const p = normPhone(phone);
  rateLimit("phone:" + me.profileId + clientIp(req), 3, 10 * 60_000);
  const { error } = await (await userClient()).auth.updateUser({ phone: p });
  if (error) throw new HttpError(error.status === 429 ? 429 : 400, error.message);
  return ok({ sent: true, channel: "whatsapp" });
});

export const PUT = route(async (req: Request) => {
  const me = await requireUser();
  const i = await body(req, z.object({ phone: z.string(), code: z.string().regex(/^\d{6}$/, "Enter all 6 digits") }));
  const p = normPhone(i.phone);
  const { data, error } = await (await userClient()).auth.verifyOtp({ phone: p, token: i.code, type: "phone_change" });
  if (error || !data.user) throw new HttpError(401, "That code is wrong or has expired");
  await db().from("profiles").update({ phone: p, phone_verified_at: new Date().toISOString() }).eq("id", me.profileId);
  await db().from("players").update({ phone: p }).eq("profile_id", me.profileId);
  // Teams the organiser registered to this mobile now belong to this account
  await db().from("teams").update({ owner_profile: me.profileId, owner_verified: true }).eq("owner_phone", p).is("owner_profile", null);
  await audit(me.profileId, "auth.phone_verified", "profile", me.profileId);
  return ok({ verified: true });
});
