// POST /api/refunds/:id { action: "process" | "reject" } — one-tap Razorpay refund (walkthrough page 20)
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";
import { razorpay } from "@/lib/razorpay";

const In = z.object({ action: z.enum(["process", "reject"]) });

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff();
  const id = (await ctx.params).id;
  const i = await body(req, In);
  const { data: r } = await db().from("refunds").select("id, status, amount_paise, entry_id, payments(razorpay_payment_id)").eq("id", id).maybeSingle();
  if (!r) throw new HttpError(404, "Refund not found");
  if (r.status === "done" || r.status === "processing") return ok({ status: r.status });

  if (i.action === "reject") {
    await db().from("refunds").update({ status: "rejected", processed_by: staff.profileId, processed_at: new Date().toISOString() }).eq("id", id);
    await audit(staff.profileId, "refund.reject", "refund", id);
    return ok({ status: "rejected" });
  }
  const pay = Array.isArray(r.payments) ? r.payments[0] : r.payments;
  let refundId: string | null = null;
  if (pay?.razorpay_payment_id) {
    const rf = await razorpay().payments.refund(pay.razorpay_payment_id, { amount: r.amount_paise, notes: { refund_id: id } });
    refundId = rf.id;
  }
  await db().from("refunds").update({
    status: refundId ? "processing" : "done", razorpay_refund_id: refundId, processed_by: staff.profileId, processed_at: new Date().toISOString(),
  }).eq("id", id);
  await db().from("payments").update({ status: "refunded" }).eq("entry_id", r.entry_id).eq("status", "paid");
  await audit(staff.profileId, "refund.process", "refund", id, { amount: r.amount_paise, razorpay: refundId });
  return ok({ status: refundId ? "processing" : "done" });
});
