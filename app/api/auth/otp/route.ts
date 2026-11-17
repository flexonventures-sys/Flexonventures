// POST /api/auth/otp  { phone? | email?, channel?: "whatsapp"|"sms", role?: "player"|"team_owner"|"organiser" }
// Sends a 6-digit login code through Supabase Auth: email, or mobile delivered on WhatsApp.
//   Players: mobile (WhatsApp/SMS) or email. Team owners: registered mobile, WhatsApp.
//   Organisers: work email, and only if already registered as organiser.
import { z } from "zod";
import { body, clientIp, HttpError, normPhone, ok, rateLimit, route } from "@/lib/http";
import { db, userClient } from "@/lib/supabase";

const In = z.object({
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  channel: z.enum(["whatsapp", "sms"]).default("whatsapp"),
  role: z.enum(["player", "team_owner", "organiser"]).default("player"),
});

export const POST = route(async (req: Request) => {
  const i = await body(req, In);
  const phone = i.phone ? normPhone(i.phone) : "";
  const email = i.email?.toLowerCase().trim() ?? "";
  if (!phone && !email) throw new HttpError(400, "Enter your mobile number or email");
  rateLimit("otp:ip:" + clientIp(req), 10, 15 * 60_000);
  rateLimit("otp:to:" + (phone || email), 3, 10 * 60_000);

  if (i.role === "organiser") {
    if (!email) throw new HttpError(400, "Organisers log in with their work email");
    const { data } = await db().from("profiles").select("id").eq("email", email).in("role", ["organiser", "admin"]).maybeSingle();
    // Same response either way so the endpoint does not reveal who is an organiser.
    if (!data) return ok({ sent: true });
  }
  if (i.role === "team_owner") {
    if (!phone) throw new HttpError(400, "Team owners log in with their registered mobile");
    const { data } = await db().from("teams").select("id").eq("owner_phone", phone).eq("owner_access", true).limit(1);
    if (!data?.length) return ok({ sent: true });
  }

  const sb = await userClient();
  const { error } = phone
    // Supabase issues the code; its Send SMS hook (/api/hooks/send-sms) delivers it on WhatsApp.
    ? await sb.auth.signInWithOtp({ phone, options: { channel: "sms", shouldCreateUser: true } })
    : await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: i.role !== "organiser" } });
  if (error) throw new HttpError(error.status === 429 ? 429 : 400, error.message);
  return ok({ sent: true });
});
