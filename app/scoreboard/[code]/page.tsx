"use client";
// Full-screen live scoreboard for a match (court TV, stream overlay, phones). Polls every 2 seconds.
import { use } from "react";
import { useLive } from "@/components/tournament";

type Live = {
  id: string; status: string; court: number | null; games: [number, number][]; call: string; stream: string | null;
  state: { sc: [number, number]; srv: 0 | 1; num: 1 | 2; gw: [number, number]; done: boolean; winner: 0 | 1 | null; games: [number, number][] };
  names?: [string, string]; title?: string;
};

export default function Scoreboard({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { data: m, error } = useLive<Live>(`/api/matches/${code}`, 2000);
  if (!m) return <main className="grid min-h-dvh place-items-center bg-ink text-white">{error || "Loading…"}</main>;
  const games = m.status === "live" ? m.state.games : m.games;
  const gw = [0, 0]; games.forEach((g) => gw[g[0] > g[1] ? 0 : 1]++);
  const side = (i: 0 | 1) => (
    <div className={`flex items-center gap-4 px-6 py-6 ${m.status !== "live" && m.state.winner === i ? "bg-ball text-ink" : ""}`}>
      <span className={`h-5 w-5 rounded-full ${m.status === "live" && m.state.srv === i ? "bg-ball" : "bg-transparent"}`} aria-label={m.state.srv === i ? "Serving" : undefined} />
      <span className="flex-1 truncate text-3xl font-bold sm:text-5xl">{m.names?.[i] ?? (i ? "Side B" : "Side A")}</span>
      <span className="flex gap-2 text-2xl tabular-nums opacity-70 sm:text-4xl">{games.map((g, k) => <span key={k} className="w-12 text-center">{g[i]}</span>)}</span>
      <span className="w-24 text-center text-6xl font-black tabular-nums sm:w-32 sm:text-8xl">{m.status === "live" ? m.state.sc[i] : gw[i]}</span>
    </div>
  );
  return (
    <main className="flex min-h-dvh flex-col bg-ink text-white">
      <header className="flex items-center justify-between px-6 py-4 text-lg">
        <span><b className="text-ball">FLEXON</b> {m.title ?? ""}</span>
        <span>{m.court ? `Court ${m.court}` : ""} {m.status === "live" ? <b className="ml-3 rounded bg-live px-2 py-0.5">LIVE</b> : <span className="ml-3 opacity-70">{m.status === "upcoming" ? "Up next" : "Final"}</span>}</span>
      </header>
      <section className="flex flex-1 flex-col justify-center divide-y divide-white/15">{side(0)}{side(1)}</section>
      {m.status === "live" && <footer className="px-6 py-5 text-center text-4xl font-bold tracking-widest tabular-nums sm:text-6xl">{m.call}</footer>}
    </main>
  );
}
