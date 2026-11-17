import { db } from "./supabase";

export const STEPS = ["Published", "Entries open", "Close entries", "Make the draw", "Publish the schedule", "Results published"];

type Row = { group_id: string; entry_id: string; display_name: string; played: number; won: number; lost: number; game_diff: number; point_diff: number; points: number };

/** Points, then head to head, then game difference, then point difference (proposal section 11). */
export async function standings(groupId: string) {
  const { data } = await db().from("group_standings").select("*").eq("group_id", groupId);
  const rows = (data ?? []) as Row[];
  const h2h = new Map<string, number>();
  const { data: ms } = await db().from("matches").select("entry_a, entry_b, winner").eq("group_id", groupId).in("status", ["done", "walkover"]);
  for (const m of ms ?? []) if (m.winner !== null) h2h.set(`${m.winner === 0 ? m.entry_a : m.entry_b}>${m.winner === 0 ? m.entry_b : m.entry_a}`, 1);
  return rows.sort((a, b) =>
    b.points - a.points ||
    (h2h.has(`${a.entry_id}>${b.entry_id}`) ? -1 : h2h.has(`${b.entry_id}>${a.entry_id}`) ? 1 : 0) ||
    b.game_diff - a.game_diff || b.point_diff - a.point_diff);
}

