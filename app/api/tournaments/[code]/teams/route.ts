// League teams and owners (walkthrough page 18)
//   GET   list teams with owner + access
//   POST  { name, ownerName, ownerPhone }        add team and assign owner (owner logs in with this mobile)
//   PATCH { team, ownerName?, ownerPhone?, access? }  edit owner, pause/restore access
//   POST  { action: "tie", teamA, teamB, at, court, round }   create a tie (organiser sets times)
import { z } from "zod";
import { body, HttpError, normPhone, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";

const tourn = async (code: string) => {
  const { data } = await db().from("tournaments").select("id, type, tie_events, team_count").eq("code", code).maybeSingle();
  if (!data) throw new HttpError(404, "Tournament not found");
  return data;
};

export const GET = route(async (_req: Request, ctx: { params: Promise<{ code: string }> }) => {
  await requireStaff();
  const t = await tourn((await ctx.params).code);
  const { data } = await db().from("teams").select("id, name, owner_name, owner_phone, owner_verified, owner_access, team_players(count)").eq("tournament_id", t.id).order("name");
  return ok({ teams: data ?? [] });
});

const Add = z.object({ name: z.string().min(2).max(80), ownerName: z.string().max(80).optional(), ownerPhone: z.string().optional() });
const Tie = z.object({ action: z.literal("tie"), teamA: z.string().uuid(), teamB: z.string().uuid(), at: z.string().datetime({ offset: true }), court: z.number().int().min(1), round: z.string().optional() });

export const POST = route(async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const staff = await requireStaff();
  const t = await tourn((await ctx.params).code);
  if (t.type !== "league") throw new HttpError(400, "Teams are for leagues only");
  const raw = await req.json();
  if (raw?.action === "tie") {
    const i = Tie.parse(raw);
    if (i.teamA === i.teamB) throw new HttpError(400, "Pick two different teams");
    const { data: tie, error } = await db().from("ties").insert({ tournament_id: t.id, team_a: i.teamA, team_b: i.teamB, scheduled_at: i.at, court_no: i.court, round: i.round }).select("id").single();
    if (error) throw error;
    // One match per tie event (e.g. men's, women's, mixed doubles); players come from lineups.
    const { data: cat } = await db().from("categories").select("id, scoring, points_to, best_of").eq("tournament_id", t.id).limit(1).single();
    await db().from("matches").insert((t.tie_events?.length ? t.tie_events : ["Doubles"]).map((ev: string, k: number) => ({
      code: `tie-${tie.id.slice(0, 8)}-${k + 1}`, tournament_id: t.id, category_id: cat?.id, tie_id: tie.id, stage: `${i.round ?? "Tie"}: ${ev}`,
      court_no: i.court, scheduled_at: i.at, scoring: cat?.scoring ?? "sideout", points_to: cat?.points_to ?? 11, best_of: cat?.best_of ?? 3, doubles: true,
    })));
    await audit(staff.profileId, "tie.create", "tie", tie.id, i);
    return ok({ tie: tie.id }, { status: 201 });
  }
  const i = Add.parse(raw);
  const { data: team, error } = await db().from("teams").insert({
    tournament_id: t.id, name: i.name, owner_name: i.ownerName ?? null, owner_phone: i.ownerPhone ? normPhone(i.ownerPhone) : null,
  }).select("id").single();
  if (error?.code === "23505") throw new HttpError(409, "That team name is taken");
  if (error) throw error;
  await audit(staff.profileId, "team.create", "team", team.id, i);
  // The owner's WhatsApp invite is the login code they request at /owner with this mobile.
  return ok({ team: team.id, invite: i.ownerPhone ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/owner` : null }, { status: 201 });
});

const Patch = z.object({ team: z.string().uuid(), name: z.string().optional(), ownerName: z.string().optional(), ownerPhone: z.string().optional(), access: z.boolean().optional() });

export const PATCH = route(async (req: Request) => {
  const staff = await requireStaff();
  const i = await body(req, Patch);
  const patch: Record<string, unknown> = {};
  if (i.name) patch.name = i.name;
  if (i.ownerName !== undefined) patch.owner_name = i.ownerName;
  if (i.ownerPhone !== undefined) Object.assign(patch, { owner_phone: i.ownerPhone ? normPhone(i.ownerPhone) : null, owner_profile: null, owner_verified: false });
  if (i.access !== undefined) patch.owner_access = i.access;
  await db().from("teams").update(patch).eq("id", i.team);
  await audit(staff.profileId, "team.update", "team", i.team, i);
  return ok();
});
