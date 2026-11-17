// GET   /api/alerts         the bell: my alerts and broadcasts, newest first
// PATCH /api/alerts { ids? } mark read (all if no ids)
import { z } from "zod";
import { body, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { caller, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const me = await caller();
  const q = db().from("alerts").select("id, kind, title, body, href, read_at, created_at").order("created_at", { ascending: false }).limit(50);
  const { data } = me ? await q.or(`profile_id.eq.${me.profileId},profile_id.is.null`) : await q.is("profile_id", null);
  return ok({ alerts: data ?? [], unread: (data ?? []).filter((a) => !a.read_at).length });
});

export const PATCH = route(async (req: Request) => {
  const me = await requireUser();
  const i = await body(req, z.object({ ids: z.array(z.string().uuid()).optional() }));
  let q = db().from("alerts").update({ read_at: new Date().toISOString() }).eq("profile_id", me.profileId).is("read_at", null);
  if (i.ids?.length) q = q.in("id", i.ids);
  await q;
  return ok();
});
