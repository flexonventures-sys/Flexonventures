// Console: list all tournaments (incl. drafts) and create one with any formats per category.
// POST { name, start, end, venue?, courts, status?, fee?, categories: [{ name, format, config, scoring, playoffScoring, capacity? }] }
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";
import { applyFormat } from "@/lib/formats/engine";
import { formatById, SCORING_PRESETS } from "@/lib/formats/catalog";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireStaff();
  const { data } = await db().from("tournaments").select("code, name, type, status, progress_step, start_date, end_date, courts, categories(id, name, format_id)").order("start_date", { ascending: false });
  return ok({ tournaments: data ?? [] });
});

const Cat = z.object({
  name: z.string().min(1).max(60),
  format: z.string().refine((f) => !!formatById(f), "Unknown format"),
  config: z.record(z.any()).default({}),
  scoring: z.string().refine((s) => s in SCORING_PRESETS, "Unknown scoring").default("so11bo1"),
  playoffScoring: z.string().refine((s) => s in SCORING_PRESETS, "Unknown scoring").default("so11bo3"),
  capacity: z.number().int().positive().optional(),
  entry: z.enum(["player", "pair"]).optional(),
});
const In = z.object({
  name: z.string().min(3).max(80),
  start: z.string().date(), end: z.string().date(),
  venue: z.string().max(120).default("Flexon Arena, Salt Lake"),
  courts: z.number().int().min(1).max(64),
  status: z.enum(["draft", "upcoming", "live"]).default("upcoming"),
  fee: z.number().min(0).default(0),
  approval: z.enum(["auto", "manual"]).default("auto"),
  categories: z.array(Cat).min(1, "Add at least one category"),
}).refine((x) => x.end >= x.start, { message: "End date must be on or after the start date" });

export const POST = route(async (req: Request) => {
  const staff = await requireStaff();
  const i = await body(req, In);
  const { data: org } = await db().from("organisations").select("id").limit(1).single();
  const { data: sport } = await db().from("sports").select("id").eq("code", "pickleball").single();
  if (!org || !sport) throw new HttpError(500, "Organisation or sport missing; run the seed");
  const [vName, ...vAddr] = i.venue.split(",");
  let { data: venue } = await db().from("venues").select("id").eq("name", vName.trim()).maybeSingle();
  if (!venue) venue = (await db().from("venues").insert({ org_id: org.id, name: vName.trim(), address: vAddr.join(",").trim() || null }).select("id").single()).data;

  const base = (i.name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "t") + i.start.slice(2, 4);
  const { data: clash } = await db().from("tournaments").select("code").like("code", base + "%");
  const code = clash?.length ? `${base}${clash.length + 1}` : base;
  const types = i.categories.map((c) => (c.entry && formatById(c.format)!.allows?.includes(c.entry) ? c.entry : formatById(c.format)!.participant));
  const { data: t, error } = await db().from("tournaments").insert({
    code, org_id: org.id, sport_id: sport.id, venue_id: venue?.id, name: i.name,
    type: types.includes("team") ? "league" : types.every((p) => p === "player") ? "singles" : "doubles",
    status: i.status, progress_step: i.status === "draft" ? 0 : 2, start_date: i.start, end_date: i.end, courts: i.courts,
    fee_paise: Math.round(i.fee * 100), approval: i.approval, online_payment: i.fee > 0, created_by: staff.profileId,
    fee_unit: types.includes("team") ? "per team" : types.every((p) => p === "player") ? "per player" : "per pair",
  }).select("id, code").single();
  if (error) throw error;
  await db().from("courts").insert(Array.from({ length: i.courts }, (_, n) => ({ tournament_id: t.id, number: n + 1 })));
  for (const [n, c] of i.categories.entries()) {
    const { data: cat, error: ce } = await db().from("categories").insert({ tournament_id: t.id, name: c.name, sort: n, capacity: c.capacity ?? null }).select("id").single();
    if (ce) throw ce;
    const { label: _l, ...main } = SCORING_PRESETS[c.scoring];
    const { label: _p, ...po } = SCORING_PRESETS[c.playoffScoring];
    await applyFormat(cat.id, c.format, c.config, main, po, c.entry);
  }
  await audit(staff.profileId, "tournament.create", "tournament", t.code, { formats: i.categories.map((c) => c.format) });
  return ok({ code: t.code }, { status: 201 });
});
