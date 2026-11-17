// POST /api/payments/verify — Razorpay checkout handler response. Signature verified server side.
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { verifyCheckout } from "@/lib/razorpay";
import { markPaid } from "@/lib/payments";
import { requireUser } from "@/lib/session";

const In = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export const POST = route(async (req: Request) => {
  await requireUser();
  const i = await body(req, In);
  if (!verifyCheckout(i.razorpay_order_id, i.razorpay_payment_id, i.razorpay_signature))
    throw new HttpError(400, "Payment could not be verified");
  const entry = await markPaid(i.razorpay_order_id, i.razorpay_payment_id, i.razorpay_signature);
  if (!entry) throw new HttpError(404, "Order not found");
  return ok({ entryNo: `FX-${entry.entry_no}` });
});
