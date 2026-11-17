// GET /api/bootstrap
// Loaded as a <script> before the prototype's app.js: sets window.__FLX with live data.
// If the database is not configured or unreachable, sets nothing and the prototype runs on demo data.
import { bootstrap } from "@/lib/data";
import { dbConfigured } from "@/lib/supabase";
import { caller, isStaff } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  let js = "/* Flexon: database not configured, showing demo data */";
  if (dbConfigured()) {
    try {
      const staff = isStaff(await caller().catch(() => null));
      const data = await bootstrap({ staff });
      js = `window.__FLX=${JSON.stringify(data).replace(/</g, "\\u003c")};`;
    } catch (e) {
      console.error("bootstrap failed", e);
      js = "/* Flexon: live data unavailable, showing demo data */";
    }
  }
  return new Response(js, {
    headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "private, no-store" },
  });
}
