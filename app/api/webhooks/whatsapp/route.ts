// WhatsApp Cloud API webhook (Meta App Dashboard -> WhatsApp -> Configuration -> Webhooks).
//   Callback URL : https://<domain>/api/webhooks/whatsapp
//   Verify token : the value of WHATSAPP_VERIFY_TOKEN (any random string you choose; NOT an access token)
// GET  answers Meta's one-time verification handshake.
// POST receives delivery status updates (sent / delivered / read / failed) for our OTP messages and records them
//      in audit_log so a "code never arrived" report can be traced. Requests are verified with the app secret.
// Sending OTPs does not depend on this webhook; it only adds delivery visibility.
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && q.get("hub.mode") === "subscribe" && same(q.get("hub.verify_token") ?? "", token))
    return new Response(q.get("hub.challenge") ?? "", { status: 200, headers: { "content-type": "text/plain" } });
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.WHATSAPP_APP_SECRET;
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  if (!secret || !same(sig, "sha256=" + createHmac("sha256", secret).update(raw).digest("hex"))) return new Response("Invalid signature", { status: 401 });

  type Status = { id?: string; status?: string; recipient_id?: string; timestamp?: string; errors?: { code?: number; title?: string }[] };
  const ev = JSON.parse(raw) as { entry?: { changes?: { value?: { statuses?: Status[] } }[] }[] };
  const rows = (ev.entry ?? []).flatMap((e) => (e.changes ?? []).flatMap((c) => c.value?.statuses ?? [])).map((s) => ({
    action: "whatsapp." + (s.status ?? "status"), entity: "whatsapp_message", entity_id: s.id ?? null,
    data: { to: s.recipient_id ? s.recipient_id.slice(0, -4) + "****" : null, at: s.timestamp, errors: s.errors?.map((x) => `${x.code}: ${x.title}`) },
  }));
  if (rows.length) await db().from("audit_log").insert(rows);
  return new Response("ok", { status: 200 }); // always 200 quickly so Meta does not retry
}
