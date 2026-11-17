// PATCH /api/entries/:id — organiser manages an entry (walkthrough pages 17, 20)
//   approve | reject (refund) | waitlist | confirm (from waitlist) | withdraw (refund) | partner (change partner)
import { z } from "zod";
import { body, HttpError, normPhone, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";
import { sendAlert } from "@/lib/notify";

const In = z.object({
  action: z.enum(["approve", "reject", "waitlist", "confirm", "withdraw", "partner"]),
  reason: z.string().max(200).optional(),
  partnerName: z.string().optional(),
  partnerPhone: z.string().optional(),
});

const MSG: Record<string, string> = {
  approve: "Your entry is confirmed", confirm: "A place opened up: your entry is confirmed",
  reject: "Your entry was not accepted; any payment is being refunded", waitlist: "Your entry is on the waitlist",
  withdraw: "Your entry has been withdrawn; any payment is being refunded", partner: "Your partner was updated",
};

export const PATCH = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff();
  const id = (await ctx.params).id;
  const i = await body(req, In);
  const { data: e } = await db().from("entries").select("id, status, submitted_by, player1_id, display_name, tournaments(name)").eq("id", id).maybeSingle();
  if (!e) throw new HttpError(404, "Entry not found");

  const patch: Record<string, unknown> = { reviewed_by: staff.profileId, reviewed_at: new Date().toISOString() };
  if (i.action === "approve" || i.action === "confirm") patch.status = "confirmed";
  if (i.action === "waitlist") patch.status = "waitlist";
  if (i.action === "reject") patch.status = "rejected";
  if (i.action === "withdraw") patch.status = "withdrawn";
  if (i.action === "partner") {
    if (!i.partnerName || !i.partnerPhone) throw new HttpError(400, "Partner name and mobile are required");
    const phone = normPhone(i.partnerPhone);
    const { data: ex } = await db().from("players").select("id, full_name").eq("phone", phone).maybeSingle();
    const partner = ex ?? (await db().from("players").insert({ code: "p" + crypto.randomUUID().replace(/-/g, "").slice(0, 10), full_name: i.partnerName, phone }).select("id, full_name").single()).data!;
    const { data: p1 } = await db().from("players").select("full_name").eq("id", e.player1_id).single();
    Object.assign(patch, { player2_id: partner.id, display_name: `${p1?.full_name} and ${partner.full_name}`, looking_for_partner: false });
  }
  if (i.reason) patch.note = i.reason;
  await db().from("entries").update(patch).eq("id", id);

  if (i.action === "reject" || i.action === "withdraw") {
    const { data: pay } = await db().from("payments").select("id, amount_paise").eq("entry_id", id).eq("status", "paid").maybeSingle();
    if (pay) await db().from("refunds").insert({ payment_id: pay.id, entry_id: id, amount_paise: pay.amount_paise, reason: i.reason ?? i.action, status: "requested" });
  }
  await audit(staff.profileId, "entry." + i.action, "entry", id, { from: e.status, reason: i.reason });
  const t = Array.isArray(e.tournaments) ? e.tournaments[0] : e.tournaments;
  if (e.submitted_by) await sendAlert([e.submitted_by], { kind: "entry_update", title: MSG[i.action], body: t?.name, href: "/#/me" });
  return ok({ status: patch.status ?? e.status });
});
