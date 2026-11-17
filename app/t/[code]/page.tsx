"use client";
// Public tournament centre: every category with its format, live matches, brackets, pools and standings.
import { use, useState } from "react";
import { StageView, useLive, MatchCard, type Detail } from "@/components/tournament";

export default function TournamentPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { data: d, error } = useLive<Detail>(`/api/tournaments/${code}/live`, 5000);
  const [cat, setCat] = useState<string | null>(null);
  if (error && !d) return <main className="p-6"><h1 className="text-2xl font-bold">Tournament not found</h1><p className="muted">{error}</p><a className="underline" href="/">Back to Flexon Sports Hub</a></main>;
  if (!d) return <main className="muted p-6">Loading…</main>;
  const current = d.categories.find((c) => c.id === cat) ?? d.categories[0];
  const stages = d.stages.filter((s) => s.category_id === current?.id).sort((a, b) => a.seq - b.seq);
  const live = d.matches.filter((m) => m.status === "live");
  return (
    <div className="min-h-dvh">
      <header className="bg-ink px-4 py-5 text-white">
        <div className="mx-auto max-w-6xl">
          <a href="/" className="text-sm opacity-70">← Flexon Sports Hub</a>
          <h1 className="mt-1 text-3xl font-bold">{d.tournament.name}</h1>
          <p className="opacity-70">{d.tournament.venue} · {d.tournament.start_date}{d.tournament.end_date !== d.tournament.start_date ? ` to ${d.tournament.end_date}` : ""}</p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 p-4">
        {live.length > 0 && (
          <section>
            <h2 className="mb-2 flex items-center gap-2 font-bold"><span className="h-2 w-2 animate-pulse rounded-full bg-live" />On court now</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{live.map((m) => <a key={m.id} href={`/scoreboard/${m.code}`}><MatchCard m={m} /></a>)}</div>
          </section>
        )}
        <nav className="flex gap-2 overflow-x-auto" aria-label="Categories">
          {d.categories.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} aria-pressed={c.id === current?.id}
              className={`shrink-0 border px-3 py-2 text-left text-sm ${c.id === current?.id ? "border-ink bg-ink text-white dark:border-ball dark:bg-ball dark:text-ink" : "border-line dark:border-line-dark"}`}>
              <b className="block">{c.name}</b><span className="text-xs opacity-75">{c.format?.name}</span>
            </button>
          ))}
        </nav>
        {stages.map((s) => (
          <section key={s.id} className="space-y-3">
            <div className="flex items-baseline gap-3"><h2 className="text-xl font-bold">{s.name}</h2><span className={`tag ${s.status === "done" ? "bg-pitch text-white" : s.status === "active" ? "bg-ball text-ink" : "bg-surface dark:bg-surface-dark"}`}>{s.status === "done" ? "Complete" : s.status === "active" ? "In progress" : "Not started"}</span></div>
            <StageView d={d} stage={s} onPick={(m) => { location.href = `/scoreboard/${m.code}`; }} />
          </section>
        ))}
        {!stages.length && <p className="muted">No format set for this category yet.</p>}
      </main>
    </div>
  );
}
