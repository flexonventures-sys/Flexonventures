// POST /api/payments/webhook — Razorpay webhook (payment.captured, payment.failed, refund.processed).
// Configure in Razorpay Dashboard -> Webhooks with RAZORPAY_WEBHOOK_SECRET.
import { ok } from "@/lib/http";
import { verifyWebhook } from "@/lib/razorpay";
import { markPaid } from "@/lib/payments";
import { db } from "@/lib/supabase";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("x-razorpay-signature") ?? "")) return ok({ error: "bad signature" }, { status: 400 });
  const ev = JSON.parse(raw);
  const p = ev.payload?.payment?.entity;
  switch (ev.event) {
    case "payment.captured":
    case "order.paid":
      if (p?.order_id) await markPaid(p.order_id, p.id, null, ev);
      break;
    case "payment.failed":
      if (p?.order_id) await db().from("payments").update({ status: "failed", raw: ev }).eq("razorpay_order_id", p.order_id).neq("status", "paid");
      break;
    case "refund.processed": {
      const r = ev.payload?.refund?.entity;
      if (r?.id) await db().from("refunds").update({ status: "done", processed_at: new Date().toISOString() }).eq("razorpay_refund_id", r.id);
      break;
    }
  }
  return ok({ received: true });
}
