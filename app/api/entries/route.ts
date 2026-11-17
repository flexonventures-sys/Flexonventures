// POST /api/entries  — a logged-in player enters a tournament (proposal section 4 "Entering").
// Validates the organiser's form, applies capacity/waitlist/approval rules, and creates a Razorpay
// order when online payment is on. Status becomes confirmed/review only after verified payment.
import { z } from "zod";
import { body, HttpError, normPhone, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireUser } from "@/lib/session";
import { razorpay } from "@/lib/razorpay";

const In = z.object({
  tournament: z.string(),
  category: z.string().optional(),
  partnerName: z.string().max(120).optional(),
  partnerPhone: z.string().optional(),
  teamName: z.string().max(80).optional(),
  findPartner: z.boolean().default(false),
  rulesAccepted: z.literal(true, { errorMap: () => ({ message: "Tick the box to accept the rules" }) }),
  answers: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
});

type Field = { key: string; label: string; type: string; mode: "required" | "optional" | "off"; options?: string[] };

export const POST = route(async (req: Request) => {
  const me = await requireUser();
  const i = await body(req, In);
  const { data: t } = await db().from("tournaments").select("*").eq("code", i.tournament).maybeSingle();
  if (!t || t.status === "draft") throw new HttpError(404, "Tournament not found");
  const today = new Date().toISOString().slice(0, 10);
  if (t.status !== "upcoming" || t.progress_step > 2 || (t.reg_open && t.reg_open > today) || (t.reg_close && t.reg_close < today))
    throw new HttpError(409, "Entries are closed for this tournament");

  const { data: cat } = i.category
    ? await db().from("categories").select("*").eq("tournament_id", t.id).eq("name", i.category).maybeSingle()
    : await db().from("categories").select("*").eq("tournament_id", t.id).order("sort").limit(1).maybeSingle();
  if (!cat) throw new HttpError(400, "Pick a category");

  // Organiser's form: required fields must be present; off fields are dropped.
  const fields = (t.form_fields ?? []) as Field[];
  const answers: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.mode === "off") continue;
    const v = i.answers[f.key];
    if (f.mode === "required" && (v === undefined || v === null || v === "")) throw new HttpError(400, `${f.label} is required`);
    if (v !== undefined && f.options && !f.options.includes(String(v))) throw new HttpError(400, `Pick a valid ${f.label}`);
    if (v !== undefined) answers[f.key] = v;
  }

  const { data: player } = await db().from("players").select("id, full_name").eq("profile_id", me.profileId).maybeSingle();
  if (!player) throw new HttpError(400, "Verify your mobile first");

  const league = t.type === "league";
  let partnerId: string | null = null, teamId: string | null = null, display = player.full_name;
  if (league) {
    if (!i.teamName) throw new HttpError(400, "Enter a team name");
    const { data: team, error } = await db().from("teams").insert({
      tournament_id: t.id, name: i.teamName, owner_name: me.name || player.full_name, owner_phone: me.phone, owner_profile: me.profileId, owner_verified: true,
    }).select("id").single();
    if (error?.code === "23505") throw new HttpError(409, "That team name is taken");
    if (error) throw error;
    teamId = team.id; display = i.teamName;
    await db().from("team_players").insert({ team_id: team.id, player_id: player.id });
    if (me.role === "player") await db().from("profiles").update({ role: "team_owner" }).eq("id", me.profileId);
  } else if (cat.kind === "doubles" && !i.findPartner) {
    if (!i.partnerName || !i.partnerPhone) throw new HttpError(400, "Add your partner, or ask to be paired");
    const phone = normPhone(i.partnerPhone);
    const { data: existing } = await db().from("players").select("id, full_name").eq("phone", phone).maybeSingle();
    const partner = existing ?? (await db().from("players").insert({
      code: "p" + crypto.randomUUID().replace(/-/g, "").slice(0, 10), full_name: i.partnerName, phone,
    }).select("id, full_name").single()).data!;
    partnerId = partner.id; display = `${player.full_name} and ${partner.full_name}`;
  }

  // Duplicate protection
  const { data: dup } = await db().from("entries").select("id").eq("category_id", cat.id)
    .or(`player1_id.eq.${player.id},player2_id.eq.${player.id}`).not("status", "in", "(rejected,withdrawn)").limit(1);
  if (dup?.length && !league) throw new HttpError(409, "You are already entered in this category");

  // Capacity -> waitlist or closed
  const cap = league ? t.team_count : cat.capacity ?? t.capacity;
  let full = false;
  if (cap) {
    const { count } = await db().from("entries").select("id", { count: "exact", head: true })
      .eq(league ? "tournament_id" : "category_id", league ? t.id : cat.id).in("status", ["confirmed", "review", "pending_payment"]);
    full = (count ?? 0) >= cap;
    if (full && t.when_full === "close") throw new HttpError(409, "This category is full");
  }

  const amount = full ? 0 : t.online_payment ? t.fee_paise : 0;
  const status = full ? "waitlist" : amount > 0 ? "pending_payment" : t.approval === "auto" ? "confirmed" : "review";
  const { data: entry, error } = await db().from("entries").insert({
    tournament_id: t.id, category_id: cat.id, team_id: teamId, player1_id: player.id, player2_id: partnerId,
    display_name: display, status, amount_paise: t.fee_paise, form_answers: answers, looking_for_partner: i.findPartner,
    rules_accepted: true, submitted_by: me.profileId, contact_phone: me.phone,
  }).select("id, entry_no").single();
  if (error) throw error;
  await audit(me.profileId, "entry.create", "entry", entry.id, { tournament: t.code, category: cat.name, status });

  if (status !== "pending_payment") return ok({ entry: entry.id, entryNo: `FX-${entry.entry_no}`, status });

  const order = await razorpay().orders.create({
    amount, currency: "INR", receipt: `FX-${entry.entry_no}`,
    notes: { entry_id: entry.id, tournament: t.code, category: cat.name },
  });
  await db().from("payments").insert({ entry_id: entry.id, amount_paise: amount, razorpay_order_id: order.id, status: "created" });
  return ok({
    entry: entry.id, entryNo: `FX-${entry.entry_no}`, status,
    order: { id: order.id, amount: order.amount }, keyId: process.env.RAZORPAY_KEY_ID,
    description: `${t.name}, ${cat.name}`,
  });
});
