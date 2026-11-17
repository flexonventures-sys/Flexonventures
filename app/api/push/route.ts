// POST /api/push — save this browser's notification subscription (free browser alerts)
import { z } from "zod";
import { body, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { requireUser } from "@/lib/session";

const In = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) }).passthrough();

export const POST = route(async (req: Request) => {
  const me = await requireUser();
  const sub = await body(req, In);
  await db().from("profiles").update({ push_subscription: sub }).eq("id", me.profileId);
  return ok();
});
