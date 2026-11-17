import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyAuthHook } from "./whatsapp.ts";

const key = Buffer.from("flexon-test-secret-flexon-test-secret");
const secret = "v1,whsec_" + key.toString("base64");
const sign = (id: string, ts: string, body: string) => "v1," + createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");

test("accepts a correctly signed Supabase hook", () => {
  const ts = String(Math.floor(Date.now() / 1000)), body = '{"sms":{"otp":"123456"}}';
  const h = new Headers({ "webhook-id": "msg_1", "webhook-timestamp": ts, "webhook-signature": sign("msg_1", ts, body) });
  assert.ok(verifyAuthHook(body, h, secret));
});

test("rejects tampered body, stale timestamp and missing secret", () => {
  const ts = String(Math.floor(Date.now() / 1000)), body = '{"sms":{"otp":"123456"}}';
  const h = new Headers({ "webhook-id": "msg_1", "webhook-timestamp": ts, "webhook-signature": sign("msg_1", ts, body) });
  assert.ok(!verifyAuthHook(body.replace("1", "9"), h, secret));
  assert.ok(!verifyAuthHook(body, h, ""));
  const old = String(Math.floor(Date.now() / 1000) - 600);
  assert.ok(!verifyAuthHook(body, new Headers({ "webhook-id": "m", "webhook-timestamp": old, "webhook-signature": sign("m", old, body) }), secret));
});
