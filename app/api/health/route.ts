import { ok } from "@/lib/http";
import { db, dbConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!dbConfigured()) return ok({ ok: false, db: "not configured" }, { status: 503 });
  const { error } = await db().from("sports").select("code").limit(1);
  return ok({ ok: !error, db: error ? error.message : "up" }, { status: error ? 503 : 200 });
}
