// Organiser entry management (walkthrough page 17)
//   GET   entries by category with status, money summary
//   POST  desk entry: { category, name, phone, partnerName?, partnerPhone?, paidAtDesk }
import { z } from "zod";
import { body, HttpError, normPhone, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";

const tourn = async (code: string) => {
  const { data } = await db().from("tournaments").select("id, fee_paise").eq("code", code).maybeSingle();
  if (!data) throw new HttpError(404, "Tournament not found");
  return data;
};

export const GET = route(async (_req: Request, ctx: { params: Promise<{ code: string }> }) => {
  await requireStaff();
  const t = await tourn((await ctx.params).code);
  const { data: entries } = await db().from("entries")
    .select("id, entry_no, display_name, status, amount_paise, seed, looking_for_partner, desk_entry, created_at, categories(name), payments(status, amount_paise)")
    .eq("tournament_id", t.id).order("created_at");
  const { data: refunds } = await db().from("refunds").select("amount_paise, status, entries!inner(tournament_id)").eq("entries.tournament_id", t.id);
  const paid = (entries ?? []).flatMap((e) => e.payments ?? []).filter((p) => p.status === "paid" || p.status === "refunded");
  const collected = paid.reduce((a, p) => a + p.amount_paise, 0);
  const refunded = (refunds ?? []).filter((r) => r.status === "done" || r.status === "processing").reduce((a, r) => a + r.amount_paise, 0);
  return ok({
    entries: entries ?? [],
    money: { collected, refunded, razorpayFees: Math.round(collected * 0.02 * 1.18), net: collected - refunded - Math.round(collected * 0.02 * 1.18) },
  });
});

const Desk = z.object({
  category: z.string(), name: z.string().min(2).max(120), phone: z.string(),
  partnerName: z.string().optional(), partnerPhone: z.string().optional(), paidAtDesk: z.boolean().default(true), seed: z.number().int().optional(),
});

const player = async (name: string, phone: string) => {
  const p = normPhone(phone);
  const { data: ex } = await db().from("players").select("id, full_name").eq("phone", p).maybeSingle();
  return ex ?? (await db().from("players").insert({ code: "p" + crypto.randomUUID().replace(/-/g, "").slice(0, 10), full_name: name, phone: p }).select("id, full_name").single()).data!;
};

export const POST = route(async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const staff = await requireStaff();
  const t = await tourn((await ctx.params).code);
  const i = await body(req, Desk);
  const { data: cat } = await db().from("categories").select("id").eq("tournament_id", t.id).eq("name", i.category).maybeSingle();
  if (!cat) throw new HttpError(404, "Category not found");
  const p1 = await player(i.name, i.phone);
  const p2 = i.partnerName && i.partnerPhone ? await player(i.partnerName, i.partnerPhone) : null;
  const { data: e, error } = await db().from("entries").insert({
    tournament_id: t.id, category_id: cat.id, player1_id: p1.id, player2_id: p2?.id ?? null,
    display_name: p2 ? `${p1.full_name} and ${p2.full_name}` : p1.full_name, status: "confirmed", amount_paise: t.fee_paise,
    rules_accepted: true, desk_entry: true, contact_phone: normPhone(i.phone), seed: i.seed ?? null, note: i.paidAtDesk ? "Paid at the desk" : "Unpaid",
  }).select("id, entry_no").single();
  if (error) throw error;
  if (i.paidAtDesk) await db().from("payments").insert({ entry_id: e.id, amount_paise: t.fee_paise, status: "paid", raw: { method: "desk" } });
  await audit(staff.profileId, "entry.desk", "entry", e.id, i);
  return ok({ entry: e.id, entryNo: `FX-${e.entry_no}` }, { status: 201 });
});
