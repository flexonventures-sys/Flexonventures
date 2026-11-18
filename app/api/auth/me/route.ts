// GET /api/auth/me — who am I, and is my mobile verified? Drives the account-setup verification prompt.
import { ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { caller } from "@/lib/session";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const me = await caller();
  if (!me) return ok({ loggedIn: false });
  const { data } = await db().from("profiles").select("phone, phone_verified_at").eq("id", me.profileId).maybeSingle();
  return ok({ loggedIn: true, role: me.role, name: me.name, email: me.email, phone: data?.phone ?? null, phoneVerified: !!data?.phone_verified_at });
});
