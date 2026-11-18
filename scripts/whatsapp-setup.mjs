// WhatsApp Cloud API helper for the OTP template (same actions as the WhatsApp Business Tools MCP).
//   node scripts/whatsapp-setup.mjs create-template   create the Authentication template (copy-code button)
//   node scripts/whatsapp-setup.mjs status            template approval status + phone number status
//   node scripts/whatsapp-setup.mjs send-test +91XXXXXXXXXX   send a real test code to a number
// Needs WHATSAPP_TOKEN (system user token), WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID in .env.local.
import { readFileSync, existsSync } from "node:fs";

const env = { ...process.env };
const file = new URL("../.env.local", import.meta.url);
if (existsSync(file)) for (const l of readFileSync(file, "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !env[m[1]]) env[m[1]] = m[2]; }
const need = (k) => { if (!env[k]) { console.error(`Set ${k} in .env.local`); process.exit(1); } return env[k]; };
const G = env.WHATSAPP_API_BASE || "https://graph.facebook.com/v21.0";
const NAME = env.WHATSAPP_OTP_TEMPLATE || "flexon_login_code", LANG = env.WHATSAPP_OTP_LANG || "en";
const call = async (path, init) => {
  const r = await fetch(`${G}/${path}`, { ...init, headers: { authorization: `Bearer ${need("WHATSAPP_TOKEN")}`, "content-type": "application/json" } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error("WhatsApp API error:", j?.error?.message ?? r.status, j?.error?.error_user_msg ?? ""); process.exit(1); }
  return j;
};
const [cmd, arg] = process.argv.slice(2);

if (cmd === "create-template") {
  const j = await call(`${need("WHATSAPP_BUSINESS_ACCOUNT_ID")}/message_templates`, {
    method: "POST",
    body: JSON.stringify({
      name: NAME, language: LANG, category: "AUTHENTICATION",
      components: [
        { type: "BODY", add_security_recommendation: true },
        { type: "FOOTER", code_expiration_minutes: 10 },
        { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: "Copy code" }] },
      ],
    }),
  });
  console.log(`Template "${NAME}" (${LANG}) submitted: id ${j.id}, status ${j.status}. Authentication templates are usually approved within minutes.`);
} else if (cmd === "status") {
  const t = await call(`${need("WHATSAPP_BUSINESS_ACCOUNT_ID")}/message_templates?name=${NAME}&fields=name,language,status,category,rejected_reason`);
  console.log("Templates:", t.data?.length ? t.data : `none named ${NAME}`);
  const p = await call(`${need("WHATSAPP_PHONE_NUMBER_ID")}?fields=display_phone_number,verified_name,quality_rating,code_verification_status,status`);
  console.log("Phone number:", p);
} else if (cmd === "send-test") {
  const to = (arg || "").replace(/\D/g, "");
  if (to.length < 10) { console.error("Usage: send-test +91XXXXXXXXXX"); process.exit(1); }
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const j = await call(`${need("WHATSAPP_PHONE_NUMBER_ID")}/messages`, {
    method: "POST",
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: { name: NAME, language: { code: LANG }, components: [
      { type: "body", parameters: [{ type: "text", text: otp }] },
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: otp }] } ] } }),
  });
  console.log(`Sent test code ${otp} to +${to}. Message id: ${j.messages?.[0]?.id}`);
} else console.log("Commands: create-template | status | send-test +91XXXXXXXXXX");
