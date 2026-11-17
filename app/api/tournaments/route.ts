// GET  /api/tournaments?status=&type=   listings by format and status
// POST /api/tournaments                  six-step wizard: type, details, categories, format, form, review
// Proposal section 6; walkthrough pages 14-16.
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";

export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  const u = new URL(req.url).searchParams;
  let q = db().from("tournaments").select("code, name, type, status, start_date, end_date, capacity, fee_paise, fee_unit, reg_close, progress_step").neq("status", "draft").order("start_date", { ascending: false });
  if (u.get("status")) q = q.eq("status", u.get("status")!);
  if (u.get("type")) q = q.eq("type", u.get("type")!);
  const { data } = await q;
  return ok({ tournaments: data ?? [] });
});

const Field = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string().min(1).max(80),
  type: z.enum(["text", "email", "tel", "date", "select", "file"]),
  mode: z.enum(["required", "optional", "off"]),
  options: z.array(z.string()).optional(),
});
const Category = z.object({ name: z.string().min(1).max(60), capacity: z.number().int().positive().optional(), fee: z.number().min(0).optional() });

const In = z.object({
  type: z.enum(["singles", "doubles", "league"]),
  name: z.string().min(3).max(80),
  start: z.string().date(), end: z.string().date(),
  venue: z.string().max(120).default("Flexon Arena, Salt Lake"),
  courts: z.number().int().min(1).max(32),
  cats: z.array(Category).default([]),
  stage: z.enum(["rr", "ko", "groups"]).default("groups"),
  groups: z.number().int().min(1).max(16).default(2),
  adv: z.number().int().min(1).max(8).default(2),
  scoring: z.enum(["sideout", "rally"]).default("sideout"),
  to: z.union([z.literal(11), z.literal(15), z.literal(21)]).default(11),
  bo: z.union([z.literal(1), z.literal(3)]).default(3),
  len: z.number().int().min(10).max(120).default(30),
  ppw: z.number().int().min(1).max(5).default(2),
  form: z.array(Field).default([]),
  custom: z.array(z.object({ label: z.string().min(1), type: z.enum(["text", "select"]), options: z.array(z.string()).optional(), required: z.boolean().default(false) })).default([]),
  open: z.string().date().optional(), close: z.string().date().optional(),
  approval: z.enum(["auto", "manual"]).default("manual"),
  full: z.enum(["waitlist", "close"]).default("waitlist"),
  pay: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(true),
  refunds: z.enum(["until", "org", "none"]).default("until"),
  findp: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(true),
  fee: z.number().min(0).default(0),
  teams: z.number().int().min(2).max(32).optional(), pmin: z.number().int().optional(), pmax: z.number().int().optional(),
  tie: z.array(z.string()).optional(),
  rules: z.string().max(5000).optional(),
  publish: z.boolean().default(true),
}).refine((x) => x.end >= x.start, { message: "End date must be on or after the start date" })
  .refine((x) => x.type === "league" || x.cats.length > 0, { message: "Add at least one category" });

const slug = (s: string, yr: string) => (s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 10) + yr.slice(2)) || "t" + Date.now();

export const POST = route(async (req: Request) => {
  const staff = await requireStaff();
  const i = await body(req, In);
  const { data: me } = await db().from("profiles").select("org_id").eq("id", staff.profileId).single();
  const { data: org } = me?.org_id ? { data: { id: me.org_id } } : await db().from("organisations").select("id").limit(1).single();
  if (!org) throw new HttpError(400, "Create the organisation first");
  const { data: sport } = await db().from("sports").select("id").eq("code", "pickleball").single();
  const [vName, ...vAddr] = i.venue.split(",");
  const { data: venue } = await db().from("venues").select("id").eq("name", vName.trim()).maybeSingle()
    .then(async (r) => r.data ? r : db().from("venues").insert({ org_id: org.id, name: vName.trim(), address: vAddr.join(",").trim() || null }).select("id").single());

  // Name, verified mobile, partner/team and rules are always required (not configurable).
  const form = [...i.form, ...i.custom.map((c, n) => ({ key: `q${n + 1}`, label: c.label, type: c.type, mode: c.required ? "required" : "optional", options: c.options }))];
  let code = slug(i.name, i.start);
  const { data: clash } = await db().from("tournaments").select("code").like("code", code + "%");
  if (clash?.length) code += clash.length + 1;

  const { data: t, error } = await db().from("tournaments").insert({
    code, org_id: org.id, sport_id: sport!.id, venue_id: venue?.id, name: i.name, type: i.type,
    status: i.publish ? "upcoming" : "draft", progress_step: i.publish ? 1 : 0,
    start_date: i.start, end_date: i.end, courts: i.courts,
    capacity: i.type === "league" ? i.teams : i.cats.reduce((a, c) => a + (c.capacity ?? 0), 0) || null,
    reg_open: i.open ?? null, reg_close: i.close ?? null, approval: i.approval, when_full: i.full,
    online_payment: !!i.pay, fee_paise: Math.round((i.cats[0]?.fee ?? i.fee) * 100),
    fee_unit: i.type === "league" ? "per team" : i.type === "doubles" ? "per pair" : "per player",
    refund_policy: i.refunds, find_partner: !!i.findp,
    team_count: i.teams ?? null, team_min: i.pmin ?? null, team_max: i.pmax ?? null, tie_events: i.tie ?? [],
    form_fields: form, rules: i.rules ?? null, created_by: staff.profileId,
  }).select("id, code").single();
  if (error) throw error;

  const cats = i.type === "league" ? [{ name: "Teams" }] : i.cats;
  await db().from("categories").insert(cats.map((c, n) => ({
    tournament_id: t.id, name: c.name, kind: i.type === "league" ? "league" : /singles/i.test(c.name) || i.type === "singles" ? "singles" : "doubles",
    stage: i.type === "league" ? "rr" : i.stage, group_count: i.groups, advance: i.adv, scoring: i.scoring, points_to: i.to, best_of: i.bo,
    match_minutes: i.len, points_per_win: i.ppw, capacity: "capacity" in c ? c.capacity ?? null : null, sort: n,
  })));
  await db().from("courts").insert(Array.from({ length: i.courts }, (_, n) => ({ tournament_id: t.id, number: n + 1 })));
  await audit(staff.profileId, "tournament.create", "tournament", t.code, { publish: i.publish });
  return ok({ code: t.code }, { status: 201 });
});
