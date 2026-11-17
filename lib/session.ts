import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db, userClient, HttpError } from "./supabase";

export type Role = "player" | "team_owner" | "referee" | "organiser" | "admin";
export type Caller = { profileId: string; role: Role; name: string; phone: string | null; email: string | null };

/** The signed-in Supabase user with their profile, or null. */
export async function caller(): Promise<Caller | null> {
  const sb = await userClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await db().from("profiles").select("id, role, full_name, phone, email").eq("id", data.user.id).maybeSingle();
  if (!p) return null;
  return { profileId: p.id, role: p.role, name: p.full_name, phone: p.phone, email: p.email };
}

export async function requireUser(): Promise<Caller> {
  const c = await caller();
  if (!c) throw new HttpError(401, "Log in first");
  return c;
}

export const isStaff = (c: Caller | null) => !!c && (c.role === "organiser" || c.role === "admin");

export async function requireStaff(): Promise<Caller> {
  const c = await requireUser();
  if (!isStaff(c)) throw new HttpError(403, "Organisers only");
  return c;
}

// ---- Referee court sessions: no accounts; a court PIN unlocks one court of one tournament.
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new HttpError(503, "SESSION_SECRET is not configured");
  return s;
};
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");
export const REF_COOKIE = "flx_ref";

export type RefSession = { tournamentId: string; court: number; exp: number };

export function refToken(s: RefSession) {
  const v = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${v}.${sign(v)}`;
}

export async function refereeSession(): Promise<RefSession | null> {
  const raw = (await cookies()).get(REF_COOKIE)?.value;
  if (!raw) return null;
  const [v, sig] = raw.split(".");
  if (!v || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(sign(v));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const s = JSON.parse(Buffer.from(v, "base64url").toString()) as RefSession;
  return s.exp > Date.now() ? s : null;
}

/**
 * Who may score this match: organisers always; a referee only the live match on their court
 * (proposal section 12). Returns a label for the audit trail.
 */
export async function requireScorer(match: { tournament_id: string; court_no: number | null; status: string }): Promise<{ label: string; actor: string | null }> {
  const c = await caller();
  if (isStaff(c)) return { label: c!.name || "Organiser", actor: c!.profileId };
  const r = await refereeSession();
  if (!r || r.tournamentId !== match.tournament_id || r.court !== match.court_no)
    throw new HttpError(403, "This court PIN does not cover this match");
  if (match.status !== "live") throw new HttpError(409, "Only live matches can be scored");
  return { label: `Court ${r.court} referee`, actor: null };
}

export async function audit(actor: string | null, action: string, entity: string, entityId: string, data?: unknown) {
  await db().from("audit_log").insert({ actor, action, entity, entity_id: entityId, data: data ?? null });
}
