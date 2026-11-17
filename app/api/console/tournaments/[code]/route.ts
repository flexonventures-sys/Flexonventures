// Console: full tournament detail (staff view), edit details, delete.
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";
import { tournamentDetail } from "@/lib/console";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ code: string }> };

export const GET = route(async (_req: Request, ctx: Ctx) => {
  await requireStaff();
  return ok(await tournamentDetail((await ctx.params).code, { staff: true }));
});

const Patch = z.object({
  name: z.string().min(3).max(80).optional(), status: z.enum(["draft", "upcoming", "live", "done", "cancelled"]).optional(),
  start_date: z.string().date().optional(), end_date: z.string().date().optional(), courts: z.number().int().min(1).max(64).optional(),
  rules: z.string().max(5000).optional(), approval: z.enum(["auto", "manual"]).optional(), fee: z.number().min(0).optional(),
  progress_step: z.number().int().min(0).max(6).optional(),
});

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const staff = await requireStaff();
  const code = (await ctx.params).code;
  const { fee, ...i } = await body(req, Patch);
  const { data: t } = await db().from("tournaments").select("id, courts").eq("code", code).maybeSingle();
  if (!t) throw new HttpError(404, "Tournament not found");
  await db().from("tournaments").update({ ...i, ...(fee !== undefined && { fee_paise: Math.round(fee * 100), online_payment: fee > 0 }) }).eq("id", t.id);
  if (i.courts && i.courts > t.courts)
    await db().from("courts").upsert(Array.from({ length: i.courts }, (_, n) => ({ tournament_id: t.id, number: n + 1 })), { onConflict: "tournament_id,number", ignoreDuplicates: true });
  await audit(staff.profileId, "tournament.edit", "tournament", code, i);
  return ok();
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const staff = await requireStaff();
  if (staff.role !== "admin") throw new HttpError(403, "Only admins can delete tournaments");
  const code = (await ctx.params).code;
  const { data: paid } = await db().from("payments").select("id, entries!inner(tournaments!inner(code))").eq("entries.tournaments.code", code).eq("status", "paid").limit(1);
  if (paid?.length) throw new HttpError(409, "This tournament has paid entries. Refund them or cancel the tournament instead.");
  await db().from("tournaments").delete().eq("code", code);
  await audit(staff.profileId, "tournament.delete", "tournament", code);
  return ok();
});
