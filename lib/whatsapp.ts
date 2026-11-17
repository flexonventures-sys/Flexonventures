// WhatsApp Cloud API (Meta) delivery for login / verification codes.
// Supabase Auth generates, stores, rate-limits and verifies every code; this module only delivers
// the code Supabase hands to the Send SMS hook (app/api/hooks/send-sms).
import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH = "https://graph.facebook.com/v21.0";

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Sends an "authentication" category template with a copy-code button.
 * Create the template in WhatsApp Manager (category Authentication, "Copy code" button) and set
 * WHATSAPP_OTP_TEMPLATE to its name. Meta requires the code in both the body and the button.
 */
export async function sendWhatsAppOtp(phoneE164: string, otp: string) {
  const to = phoneE164.replace(/\D/g, "");
  const r = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: process.env.WHATSAPP_OTP_TEMPLATE || "flexon_login_code",
        language: { code: process.env.WHATSAPP_OTP_LANG || "en" },
        components: [
          { type: "body", parameters: [{ type: "text", text: otp }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: otp }] },
        ],
      },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message ?? `WhatsApp send failed (${r.status})`);
  return j?.messages?.[0]?.id as string | undefined;
}

/**
 * Verifies a Supabase Auth hook request (Standard Webhooks: "v1,whsec_<base64>" secret,
 * HMAC-SHA256 over "<id>.<timestamp>.<body>", 5-minute tolerance).
 */
export function verifyAuthHook(raw: string, headers: Headers, secret = process.env.SEND_SMS_HOOK_SECRET ?? "") {
  const id = headers.get("webhook-id"), ts = headers.get("webhook-timestamp"), sigs = headers.get("webhook-signature");
  if (!secret || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest();
  return sigs.split(" ").some((s) => {
    const [, b64] = s.split(",");
    if (!b64) return false;
    const got = Buffer.from(b64, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
