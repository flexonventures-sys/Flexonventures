// POST /api/hooks/send-sms — Supabase Auth "Send SMS" hook.
// Supabase calls this for every phone code it issues (phone login, phone signup, phone change for
// account verification). Supabase owns the code and its verification; we deliver it on WhatsApp.
// Configure: Supabase Dashboard -> Authentication -> Hooks -> Send SMS hook -> HTTPS
//   URL https://<domain>/api/hooks/send-sms, secret -> SEND_SMS_HOOK_SECRET.
import { NextResponse } from "next/server";
import { sendWhatsAppOtp, verifyAuthHook, whatsappConfigured } from "@/lib/whatsapp";
import { db } from "@/lib/supabase";

const fail = (http_code: number, message: string) => NextResponse.json({ error: { http_code, message } }, { status: http_code });

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyAuthHook(raw, req.headers)) return fail(401, "Invalid hook signature");
  if (!whatsappConfigured()) return fail(500, "WhatsApp delivery is not configured");

  const ev = JSON.parse(raw) as { user?: { id?: string; phone?: string; phone_change?: string }; sms?: { otp?: string } };
  // phone_change carries the new number during account verification; otherwise the login number
  const phone = ev.user?.phone_change || ev.user?.phone;
  const otp = ev.sms?.otp;
  if (!phone || !otp) return fail(400, "Missing phone or code");

  try {
    const msgId = await sendWhatsAppOtp(phone.startsWith("+") ? phone : "+" + phone, otp);
    await db().from("audit_log").insert({ actor: ev.user?.id ?? null, action: "otp.whatsapp", entity: "auth", entity_id: msgId ?? null, data: { to: phone.slice(0, -4) + "****" } });
    return NextResponse.json({});
  } catch (e) {
    console.error("whatsapp otp failed", e);
    return fail(502, "Could not send the WhatsApp code. Try again in a minute.");
  }
}
