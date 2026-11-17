// GET /api/tournaments/:code/live — public, format-aware view of a tournament:
// categories with their format, stages, every match with names, standings per stage, ties and courts.
import { ok, route } from "@/lib/http";
import { tournamentDetail } from "@/lib/console";

export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ code: string }> }) =>
  ok(await tournamentDetail((await ctx.params).code, { staff: false }), { headers: { "cache-control": "public, s-maxage=3, stale-while-revalidate=10" } }));
