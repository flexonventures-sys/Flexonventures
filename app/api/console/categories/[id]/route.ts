// Console: change a category's format (only before play) or rename / delete it.
// PUT { format, config, scoring, playoffScoring }   PATCH { name?, capacity? }   DELETE
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";
import { applyFormat } from "@/lib/formats/engine";
import { formatById, SCORING_PRESETS } from "@/lib/formats/catalog";

type Ctx = { params: Promise<{ id: string }> };
const Fmt = z.object({
  format: z.string().refine((f) => !!formatById(f), "Unknown format"),
  config: z.record(z.any()).default({}),
  scoring: z.string().refine((s) => s in SCORING_PRESETS).default("so11bo1"),
  playoffScoring: z.string().refine((s) => s in SCORING_PRESETS).default("so11bo3"),
  entry: z.enum(["player", "pair"]).optional(),
});

export const PUT = route(async (req: Request, ctx: Ctx) => {
  const staff = await requireStaff();
  const id = (await ctx.params).id;
  const i = await body(req, Fmt);
  const { label: _a, ...main } = SCORING_PRESETS[i.scoring];
  const { label: _b, ...po } = SCORING_PRESETS[i.playoffScoring];
  const ex = await applyFormat(id, i.format, i.config, main, po, i.entry);
  await audit(staff.profileId, "category.format", "category", id, i);
  return ok({ stages: ex.stages.map((s) => s.name) });
});

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const staff = await requireStaff();
  const id = (await ctx.params).id;
  const i = await body(req, z.object({ name: z.string().min(1).max(60).optional(), capacity: z.number().int().positive().nullable().optional() }));
  await db().from("categories").update(i).eq("id", id);
  await audit(staff.profileId, "category.edit", "category", id, i);
  return ok();
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const staff = await requireStaff();
  const id = (await ctx.params).id;
  const { data: started } = await db().from("matches").select("id").eq("category_id", id).neq("status", "upcoming").limit(1);
  if (started?.length) throw new HttpError(409, "Matches have been played in this category");
  await db().from("categories").delete().eq("id", id);
  await audit(staff.profileId, "category.delete", "category", id);
  return ok();
});

