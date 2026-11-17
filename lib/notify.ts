import webpush from "web-push";
import { db } from "./supabase";

type Alert = { kind: string; title: string; body?: string; href?: string; tournamentId?: string | null };

/**
 * In-app alert (the bell) plus a free browser notification (proposal sections 2, 4, 11).
 * Recipients: everyone following the tournament, category or match.
 */
export async function alertFollowers(target: { tournamentId?: string; categoryId?: string | null; matchId?: string }, a: Alert) {
  const or = [
    target.tournamentId && `tournament_id.eq.${target.tournamentId}`,
    target.categoryId && `category_id.eq.${target.categoryId}`,
    target.matchId && `match_id.eq.${target.matchId}`,
  ].filter(Boolean).join(",");
  if (!or) return;
  const { data } = await db().from("follows").select("profile_id").or(or);
  const ids = [...new Set((data ?? []).map((x) => x.profile_id as string))];
  await sendAlert(ids, { ...a, tournamentId: a.tournamentId ?? target.tournamentId ?? null });
}

export async function sendAlert(profileIds: string[], a: Alert) {
  if (!profileIds.length) return;
  await db().from("alerts").insert(profileIds.map((id) => ({
    profile_id: id, tournament_id: a.tournamentId ?? null, kind: a.kind, title: a.title, body: a.body ?? null, href: a.href ?? null,
  })));
  await push(profileIds, a);
}

async function push(profileIds: string[], a: Alert) {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:ops@flexonventures.in", pub, priv);
  const { data } = await db().from("profiles").select("id, push_subscription").in("id", profileIds).not("push_subscription", "is", null);
  await Promise.allSettled((data ?? []).map((p) =>
    webpush.sendNotification(p.push_subscription, JSON.stringify({ title: a.title, body: a.body, url: a.href ?? "/" }))
      .catch(async (e: { statusCode?: number }) => {
        if (e.statusCode === 404 || e.statusCode === 410) await db().from("profiles").update({ push_subscription: null }).eq("id", p.id);
      })));
}
