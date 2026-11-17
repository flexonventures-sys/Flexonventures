// GET /api/stages/:id — standings for one stage (public)
import { ok, route } from "@/lib/http";
import { standings } from "@/lib/formats/engine";

export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => ok(await standings((await ctx.params).id)));
