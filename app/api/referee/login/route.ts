// POST /api/referee/login  { tournament: "kol26", court: 1, pin: "1234" }
// Referees have no personal account (proposal section 9). After the court PIN is checked, the
// referee is signed in through Supabase Auth as that court's service user, whose app_metadata
// limits it to one court of one tournament. All sessions in the app are Supabase sessions.
import { z } from "zod";
import { body, clientIp, HttpError, ok, rateLimit, route } from "@/lib/http";
import { db, userClient } from "@/lib/supabase";

const In = z.object({
  tournament: z.string().min(1),
  court: z.number().int().min(1).max(32),
  pin: z.string().regex(/^\d{4}$/, "Enter the 4-digit court PIN"),
});

export const POST = route(async (req: Request) => {
  const i = await body(req, In);
  rateLimit(`pin:${clientIp(req)}:${i.tournament}:${i.court}`, 5, 10 * 60_000);
  const { data: t } = await db().from("tournaments").select("id").eq("code", i.tournament).maybeSingle();
  if (!t) throw new HttpError(404, "Tournament not found");
  const { data: good } = await db().rpc("check_court_pin", { p_tournament: t.id, p_court: i.court, p_pin: i.pin });
  if (!good) throw new HttpError(401, "Wrong PIN for this court");

  // One Supabase user per court: court-<n>.<tournament>@referee.flexon.invalid (never receives mail)
  const email = `court-${i.court}.${i.tournament}@referee.flexon.invalid`;
  const meta = { role: "referee", tournament_id: t.id, court: i.court };
  const admin = db().auth.admin;
  const { data: link, error } = await admin.generateLink({ type: "magiclink", email });
  let tokenHash = link?.properties?.hashed_token;
  if (error || !tokenHash) {
    const { data: created, error: ce } = await admin.createUser({ email, email_confirm: true, app_metadata: meta });
    if (ce) throw ce;
    await db().from("profiles").upsert({ id: created.user.id, full_name: `Court ${i.court} referee`, email, role: "referee" });
    const again = await admin.generateLink({ type: "magiclink", email });
    if (again.error) throw again.error;
    tokenHash = again.data.properties.hashed_token;
  } else {
    await admin.updateUserById(link.user.id, { app_metadata: meta });
    await db().from("profiles").upsert({ id: link.user.id, full_name: `Court ${i.court} referee`, email, role: "referee" });
  }
  // Exchange the one-time token for a session; @supabase/ssr writes the auth cookies.
  const sb = await userClient();
  const { error: ve } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (ve) { console.error("referee session", ve.message); throw new HttpError(401, "Could not start the court session"); }
  return ok({ court: i.court });
});
