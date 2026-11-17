import { db } from "./supabase";
import { sendAlert } from "./notify";
import { audit } from "./session";

/**
 * Marks a Razorpay payment paid and moves the entry on. Idempotent: the checkout callback and
 * the webhook may both arrive. Returns the entry number for the confirmation ticket.
 */
export async function markPaid(orderId: string, paymentId: string, signature: string | null, raw?: unknown) {
  const { data: pay } = await db().from("payments").select("id, status, entry_id, amount_paise").eq("razorpay_order_id", orderId).maybeSingle();
  if (!pay) return null;
  const { data: entry } = await db().from("entries").select("id, entry_no, status, submitted_by, display_name, tournaments(name, approval)").eq("id", pay.entry_id).single();
  if (pay.status === "paid") return entry;

  const year = new Date().getFullYear();
  await db().from("payments").update({
    status: "paid", razorpay_payment_id: paymentId, razorpay_signature: signature, raw: raw ?? null,
    invoice_no: `FLX/${year}/${String(entry!.entry_no).padStart(6, "0")}`,
  }).eq("id", pay.id);

  const t = Array.isArray(entry!.tournaments) ? entry!.tournaments[0] : entry!.tournaments;
  const next = t?.approval === "auto" ? "confirmed" : "review";
  if (entry!.status === "pending_payment") await db().from("entries").update({ status: next }).eq("id", entry!.id);
  await audit(entry!.submitted_by, "payment.paid", "payment", pay.id, { orderId, paymentId, amount: pay.amount_paise });
  if (entry!.submitted_by)
    await sendAlert([entry!.submitted_by], {
      kind: "payment", title: next === "confirmed" ? `You're in: ${t?.name}` : `Payment received: ${t?.name}`,
      body: `Entry #FX-${entry!.entry_no}. ${next === "confirmed" ? "Receipt and GST invoice are on their way." : "The organiser will confirm your entry shortly."}`,
      href: "/#/me",
    });
  return entry;
}
