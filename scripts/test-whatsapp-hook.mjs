// Exercises /api/hooks/send-sms against a local mock of the WhatsApp Cloud API.
// Start the app with:  WHATSAPP_API_BASE=http://localhost:4555 WHATSAPP_TOKEN=t WHATSAPP_PHONE_NUMBER_ID=123
//   SEND_SMS_HOOK_SECRET=v1,whsec_<base64> npx next start -p 3123    then run:  node scripts/test-whatsapp-hook.mjs
import http from "node:http";
import { createHmac } from "node:crypto";

const BASE = process.env.BASE ?? "http://localhost:3123", SECRET = process.env.SEND_SMS_HOOK_SECRET;
const key = Buffer.from(SECRET.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
let calls = [], mode = "ok";
const mock = http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
    calls.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(b || "{}") });
    res.setHeader("content-type", "application/json");
    if (mode === "fail") { res.statusCode = 400; return res.end(JSON.stringify({ error: { message: "Template not approved" } })); }
    res.end(JSON.stringify({ messages: [{ id: "wamid.TEST" }] }));
  });
}).listen(4555);

const post = async (payload, { sign = true, ts = Math.floor(Date.now() / 1000), raw } = {}) => {
  const body = raw ?? JSON.stringify(payload), id = "msg_" + Math.random().toString(36).slice(2);
  const sig = sign ? "v1," + createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64") : "v1,bad";
  const r = await fetch(BASE + "/api/hooks/send-sms", { method: "POST", headers: { "webhook-id": id, "webhook-timestamp": String(ts), "webhook-signature": sig, "content-type": "application/json" }, body });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
const ev = (extra = {}) => ({ user: { id: "00000000-0000-0000-0000-0000000000aa", phone: "919830012345", ...extra }, sms: { otp: "482913" } });
let pass = 0, fail = 0;
const t = (name, ok, info = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + info}`); };

let r = await post(ev());
t("valid signed request delivers (200)", r.status === 200, JSON.stringify(r));
const c = calls[0];
t("calls /<phone_number_id>/messages with bearer token", c?.url === "/123/messages" && c.auth === "Bearer t", JSON.stringify(c));
t("sends to digits-only number", c?.body.to === "919830012345", c?.body.to);
t("uses authentication template with otp in body and copy-code button", c?.body.template?.name === "flexon_login_code" &&
  c.body.template.components[0].parameters[0].text === "482913" && c.body.template.components[1].parameters[0].text === "482913" && c.body.template.components[1].sub_type === "url", JSON.stringify(c?.body.template));

calls = []; r = await post(ev({ phone: "", phone_change: "919811100000" }));
t("phone_change number is used for account verification", calls[0]?.body.to === "919811100000", calls[0]?.body.to);

calls = []; r = await post(ev(), { sign: false });
t("bad signature rejected (401), nothing sent", r.status === 401 && !calls.length, JSON.stringify(r));
r = await post(ev(), { ts: Math.floor(Date.now() / 1000) - 3600 });
t("stale timestamp rejected (401)", r.status === 401, JSON.stringify(r));
r = await post({ user: { id: "x" }, sms: {} });
t("missing phone/code rejected (400)", r.status === 400, JSON.stringify(r));

mode = "fail"; r = await post(ev());
t("WhatsApp API failure surfaces as 502 to Supabase", r.status === 502 && /Could not send/.test(r.json?.error?.message ?? ""), JSON.stringify(r));
console.log(`\n${pass} passed, ${fail} failed`); mock.close(); process.exit(fail ? 1 : 0);
