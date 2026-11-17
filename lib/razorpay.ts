import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./supabase";

let rz: Razorpay | null = null;
export function razorpay(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID, key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new HttpError(503, "Online payments are not set up yet");
  rz ??= new Razorpay({ key_id, key_secret });
  return rz;
}

const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Checkout handler signature: HMAC_SHA256(order_id|payment_id, key_secret). */
export function verifyCheckout(orderId: string, paymentId: string, signature: string) {
  const exp = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET ?? "").update(`${orderId}|${paymentId}`).digest("hex");
  return safeEq(exp, signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhook(raw: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  return safeEq(createHmac("sha256", secret).update(raw).digest("hex"), signature);
}
