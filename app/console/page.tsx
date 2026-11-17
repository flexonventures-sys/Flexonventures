"use client";
// Flexon Console — enterprise admin for organisers and admins.
// Tournaments (any format), format library, live control (draws, rounds, scores), entries, teams and owners,
// players, and every login on the platform. All auth is Supabase (email + password or email code).
import { useCallback, useEffect, useMemo, useState } from "react";
import { MatchCard, StageView, useLive, type Detail, type M, type StageT } from "@/components/tournament";

type Param = { key: string; label: string; type: "number" | "select" | "boolean"; default: any; min?: number; max?: number; options?: [string, string][]; help?: string };
type Fmt = { id: string; name: string; family: string; participant: "player" | "pair" | "team"; allows?: string[]; scale: string; players: string; summary: string; how: string[]; params: Param[]; stagePreview: string[]; needsOwners?: boolean };
type Catalog = { formats: Fmt[]; scoring: Record<string, { label: string }> };
type User = { id: string; email: string | null; phone: string | null; name: string; role: string; created: string; lastSignIn: string | null; disabled: boolean; player: { id: string; full_name: string } | null; teams: { id: string; name: string }[] };
type Player = { id: string; code: string; full_name: string; gender: string; rating: number; locality: string | null; phone: string | null; profile_id: string | null; played: number; won: number };

async function api<T = any>(path: string, body?: unknown, method?: string): Promise<T> {
  const r = await fetch("/api/" + path, { method: method ?? (body ? "POST" : "GET"), headers: { "content-type": "application/json" }, credentials: "same-origin", body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error ?? `Request failed (${r.status})`), { status: r.status });
  return j as T;
}

const TABS = [["tournaments", "Tournaments"], ["new", "New tournament"], ["formats", "Format library"], ["users", "Users & logins"], ["players", "Players"]] as const;
type Tab = (typeof TABS)[number][0];

export default function Console() {
  const [me, setMe] = useState<{ ok: boolean; checked: boolean }>({ ok: false, checked: false });
  const [tab, setTab] = useState<Tab>("tournaments");
  const [open, setOpen] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const say = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); }, []);
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    api("console/tournaments").then(() => setMe({ ok: true, checked: true })).catch(() => setMe({ ok: false, checked: true }));
    api<Catalog>("formats").then(setCatalog);
    const h = () => { const [t, c] = location.hash.replace("#", "").split("/"); if (t) setTab(t as Tab); setOpen(c ?? null); };
    h(); addEventListener("hashchange", h); return () => removeEventListener("hashchange", h);
  }, []);
  const go = (t: Tab, code?: string) => { location.hash = code ? `${t}/${code}` : t; };

  if (!me.checked) return <p className="muted p-6">Loading…</p>;
  if (!me.ok) return <Login onIn={() => setMe({ ok: true, checked: true })} />;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 bg-ink text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <span className="inline-block h-4 w-4 rounded-full bg-ball" /><b className="tracking-wide">FLEXON</b><span className="opacity-70">Console</span>
          <span className="flex-1" />
          <a href="/admin" className="text-sm opacity-80 hover:opacity-100">Matchday app</a>
          <a href="/" className="text-sm opacity-80 hover:opacity-100">Public site</a>
          <button className="text-sm underline" onClick={async () => { await api("auth/logout", {}); location.reload(); }}>Log out</button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4" aria-label="Console sections">
          {TABS.map(([k, l]) => <button key={k} onClick={() => go(k)} aria-current={tab === k ? "page" : undefined} className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold ${tab === k ? "border-ball" : "border-transparent opacity-70"}`}>{l}</button>)}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl p-4">
        {tab === "tournaments" && (open ? <Manage code={open} say={say} catalog={catalog} /> : <TournamentList go={go} />)}
        {tab === "new" && catalog && <Builder catalog={catalog} say={say} done={(c) => go("tournaments", c)} />}
        {tab === "formats" && catalog && <Library catalog={catalog} />}
        {tab === "users" && <Users say={say} />}
        {tab === "players" && <Players say={say} />}
      </main>
      <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">{toast && <div className="max-w-xl bg-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}</div>
    </div>
  );
}

function Login({ onIn }: { onIn: () => void }) {
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mt-10 text-3xl font-bold">Flexon Console</h1>
      <p className="muted mb-6">Organisers and admins. Supabase login.</p>
      <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr("");
        try { await api("auth/password", { email, password: pw, role: "organiser" }); onIn(); } catch (x) { setErr((x as Error).message); }
        setBusy(false);
      }}>
        <label className="block text-sm font-semibold" htmlFor="e">Email</label><input id="e" className="inp" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="block text-sm font-semibold" htmlFor="p">Password</label><input id="p" className="inp" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="btn w-full" disabled={busy}>Log in</button>
        {err && <p className="text-sm text-live">{err}</p>}
      </form>
      <p className="muted mt-6 text-sm">Prefer a code? Use <a className="underline" href="/admin">the matchday app</a>.</p>
    </main>
  );
}

// ------------------------------------------------------------------ tournaments list
function TournamentList({ go }: { go: (t: Tab, c?: string) => void }) {
  const { data } = useLive<{ tournaments: any[] }>("/api/console/tournaments", 15000);
  if (!data) return <p className="muted">Loading…</p>;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between"><h1 className="text-2xl font-bold">Tournaments</h1><button className="btn" onClick={() => go("new")}>+ New tournament</button></div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data.tournaments.map((t) => (
          <button key={t.code} className="card text-left hover:border-court" onClick={() => go("tournaments", t.code)}>
            <div className="flex justify-between"><span className="muted text-xs">{t.start_date}</span><span className={`tag ${t.status === "live" ? "bg-live text-white" : t.status === "done" ? "bg-surface dark:bg-surface-dark" : "bg-ball text-ink"}`}>{t.status}</span></div>
            <b className="mt-1 block text-lg">{t.name}</b>
            <span className="muted text-sm">{t.categories.length} categor{t.categories.length === 1 ? "y" : "ies"}: {t.categories.map((c: any) => c.name).join(", ")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ format library
function Library({ catalog }: { catalog: Catalog }) {
  const families = [...new Set(catalog.formats.map((f) => f.family))];
  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold">Format library</h1><p className="muted">{catalog.formats.length} pickleball formats. Every one can run live on the platform, with its own scoring, brackets and standings.</p></div>
      {families.map((fam) => (
        <section key={fam}>
          <h2 className="mb-3 text-lg font-bold">{fam}</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {catalog.formats.filter((f) => f.family === fam).map((f) => (
              <article key={f.id} className="card space-y-2">
                <div className="flex items-start justify-between gap-2"><b>{f.name}</b><span className="tag bg-surface dark:bg-surface-dark">{f.participant === "team" ? "Teams" : f.participant === "player" && !f.allows ? "Individuals" : f.allows ? "Singles or doubles" : "Pairs"}</span></div>
                <p className="text-sm">{f.summary}</p>
                <ul className="muted list-disc pl-5 text-sm">{f.how.map((h) => <li key={h}>{h}</li>)}</ul>
                <p className="text-xs"><b>Scale:</b> {f.scale} · <b>Field:</b> {f.players}</p>
                <p className="text-xs"><b>Stages:</b> {f.stagePreview.join(" → ")}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ builder
type CatDraft = { name: string; format: string; config: Record<string, any>; scoring: string; playoffScoring: string; entry?: "player" | "pair"; capacity?: number };
function FormatPicker({ catalog, value, onChange }: { catalog: Catalog; value: CatDraft; onChange: (c: CatDraft) => void }) {
  const f = catalog.formats.find((x) => x.id === value.format)!;
  const families = [...new Set(catalog.formats.map((x) => x.family))];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm"><span className="font-semibold">Category name</span><input className="inp mt-1" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} /></label>
        <label className="block text-sm"><span className="font-semibold">Format</span>
          <select className="inp mt-1" value={value.format} onChange={(e) => onChange({ ...value, format: e.target.value, config: {}, entry: undefined })}>
            {families.map((fam) => <optgroup key={fam} label={fam}>{catalog.formats.filter((x) => x.family === fam).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>)}
          </select></label>
      </div>
      <p className="muted text-sm">{f.summary} <i>Stages: {f.stagePreview.join(" → ")}.</i></p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {f.allows && (
          <label className="block text-sm"><span className="font-semibold">Entries are</span>
            <select className="inp mt-1" value={value.entry ?? f.participant} onChange={(e) => onChange({ ...value, entry: e.target.value as "player" | "pair" })}>
              {f.allows.map((a) => <option key={a} value={a}>{a === "player" ? "Singles (one player)" : "Doubles (pairs)"}</option>)}
            </select></label>
        )}
        {f.params.map((p) => (
          <label key={p.key} className="block text-sm"><span className="font-semibold">{p.label}</span>
            {p.type === "number" && <input className="inp mt-1" type="number" min={p.min} max={p.max} value={value.config[p.key] ?? p.default} onChange={(e) => onChange({ ...value, config: { ...value.config, [p.key]: +e.target.value } })} />}
            {p.type === "select" && <select className="inp mt-1" value={value.config[p.key] ?? p.default} onChange={(e) => onChange({ ...value, config: { ...value.config, [p.key]: e.target.value } })}>{p.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
            {p.type === "boolean" && <span className="mt-2 flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={value.config[p.key] ?? p.default} onChange={(e) => onChange({ ...value, config: { ...value.config, [p.key]: e.target.checked } })} /> Yes</span>}
            {p.help && <small className="muted block">{p.help}</small>}
          </label>
        ))}
        <label className="block text-sm"><span className="font-semibold">Scoring</span>
          <select className="inp mt-1" value={value.scoring} onChange={(e) => onChange({ ...value, scoring: e.target.value })}>{Object.entries(catalog.scoring).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
        {f.stagePreview.length > 1 && (
          <label className="block text-sm"><span className="font-semibold">Playoff scoring</span>
            <select className="inp mt-1" value={value.playoffScoring} onChange={(e) => onChange({ ...value, playoffScoring: e.target.value })}>{Object.entries(catalog.scoring).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
        )}
      </div>
      {f.needsOwners && <p className="text-sm">Team format: add teams and assign owners after creating. Owners log in at <code>/owner</code> to submit lineups.</p>}
    </div>
  );
}

function Builder({ catalog, say, done }: { catalog: Catalog; say: (m: string) => void; done: (code: string) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [t, setT] = useState({ name: "", start: today, end: today, venue: "Flexon Arena, Salt Lake", courts: 4, fee: 0, status: "upcoming", approval: "auto" });
  const blank = (): CatDraft => ({ name: "Men's doubles", format: "pools_single_elim", config: {}, scoring: "so11bo1", playoffScoring: "so11bo3" });
  const [cats, setCats] = useState<CatDraft[]>([blank()]);
  const [busy, setBusy] = useState(false);
  return (
    <form className="space-y-6" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try { const r = await api("console/tournaments", { ...t, categories: cats }); say("Tournament created"); done(r.code); } catch (x) { say((x as Error).message); }
      setBusy(false);
    }}>
      <h1 className="text-2xl font-bold">New tournament</h1>
      <section className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm sm:col-span-2"><span className="font-semibold">Name</span><input required className="inp mt-1" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} /></label>
        <label className="block text-sm"><span className="font-semibold">Start</span><input type="date" className="inp mt-1" value={t.start} onChange={(e) => setT({ ...t, start: e.target.value })} /></label>
        <label className="block text-sm"><span className="font-semibold">End</span><input type="date" className="inp mt-1" value={t.end} onChange={(e) => setT({ ...t, end: e.target.value })} /></label>
        <label className="block text-sm sm:col-span-2"><span className="font-semibold">Venue</span><input className="inp mt-1" value={t.venue} onChange={(e) => setT({ ...t, venue: e.target.value })} /></label>
        <label className="block text-sm"><span className="font-semibold">Courts</span><input type="number" min={1} max={64} className="inp mt-1" value={t.courts} onChange={(e) => setT({ ...t, courts: +e.target.value })} /></label>
        <label className="block text-sm"><span className="font-semibold">Entry fee (₹)</span><input type="number" min={0} className="inp mt-1" value={t.fee} onChange={(e) => setT({ ...t, fee: +e.target.value })} /></label>
        <label className="block text-sm"><span className="font-semibold">Publish as</span><select className="inp mt-1" value={t.status} onChange={(e) => setT({ ...t, status: e.target.value })}><option value="draft">Draft (hidden)</option><option value="upcoming">Upcoming (entries open)</option><option value="live">Live</option></select></label>
        <label className="block text-sm"><span className="font-semibold">Entry approval</span><select className="inp mt-1" value={t.approval} onChange={(e) => setT({ ...t, approval: e.target.value })}><option value="auto">Automatic</option><option value="manual">Manual review</option></select></label>
      </section>
      {cats.map((c, i) => (
        <section key={i} className="card space-y-2">
          <div className="flex justify-between"><b>Category {i + 1}</b>{cats.length > 1 && <button type="button" className="text-sm underline" onClick={() => setCats(cats.filter((_, k) => k !== i))}>Remove</button>}</div>
          <FormatPicker catalog={catalog} value={c} onChange={(v) => setCats(cats.map((x, k) => (k === i ? v : x)))} />
        </section>
      ))}
      <div className="flex gap-2"><button type="button" className="btn-sec" onClick={() => setCats([...cats, { ...blank(), name: `Category ${cats.length + 1}` }])}>+ Add category</button><span className="flex-1" /><button className="btn" disabled={busy || !t.name}>Create tournament</button></div>
    </form>
  );
}

// ------------------------------------------------------------------ manage one tournament
function Manage({ code, say, catalog }: { code: string; say: (m: string) => void; catalog: Catalog | null }) {
  const { data: d, setData } = useLive<Detail & { entries: any[]; teams: any[]; players: Player[] }>(`/api/console/tournaments/${code}`, 6000);
  const [cat, setCat] = useState<string | null>(null);
  const [view, setView] = useState<"draw" | "entries" | "teams" | "settings">("draw");
  const [pick, setPick] = useState<M | null>(null);
  const reload = async () => setData(await api(`console/tournaments/${code}`));
  const run = async (f: () => Promise<unknown>, msg: string) => { try { await f(); say(msg); await reload(); } catch (e) { say((e as Error).message); } };
  if (!d) return <p className="muted">Loading…</p>;
  const c = d.categories.find((x) => x.id === cat) ?? d.categories[0];
  const stages = d.stages.filter((s) => s.category_id === c?.id).sort((a, b) => a.seq - b.seq);
  return (
    <div className="space-y-4">
      <a href="#tournaments" className="text-sm underline">← All tournaments</a>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{d.tournament.name}</h1><p className="muted text-sm">{d.tournament.venue} · {d.tournament.start_date} · {d.tournament.courts} courts · status {d.tournament.status}</p></div>
        <div className="flex gap-2"><a className="btn-sec" href={`/t/${code}`} target="_blank">Public page ↗</a>
          {(["draft", "upcoming", "live", "done"] as const).filter((s) => s !== d.tournament.status).slice(0, 2).map((s) => <button key={s} className="btn-sec" onClick={() => run(() => api(`console/tournaments/${code}`, { status: s }, "PATCH"), `Status: ${s}`)}>Mark {s}</button>)}</div>
      </div>
      <nav className="flex gap-2 overflow-x-auto">
        {d.categories.map((x) => <button key={x.id} onClick={() => setCat(x.id)} aria-pressed={x.id === c?.id} className={`shrink-0 border px-3 py-2 text-left text-sm ${x.id === c?.id ? "border-ink bg-ink text-white dark:border-ball dark:bg-ball dark:text-ink" : "border-line dark:border-line-dark"}`}><b className="block">{x.name}</b><span className="text-xs opacity-75">{x.format?.name}</span></button>)}
      </nav>
      <div className="flex gap-4 border-b border-line text-sm font-semibold dark:border-line-dark">
        {(["draw", "entries", "teams", "settings"] as const).filter((v) => v !== "teams" || c?.participant === "team").map((v) => <button key={v} onClick={() => setView(v)} className={`border-b-2 py-2 capitalize ${view === v ? "border-court" : "border-transparent muted"}`}>{v === "draw" ? "Draw & matches" : v === "settings" ? "Format" : v}</button>)}
      </div>
      {c && view === "draw" && stages.map((s) => <StagePanel key={s.id} d={d} s={s} run={run} onPick={setPick} />)}
      {c && view === "entries" && <Entries d={d} cat={c} run={run} />}
      {c && view === "teams" && <Teams d={d} code={code} cat={c} run={run} />}
      {c && view === "settings" && catalog && <FormatSettings c={c} catalog={catalog} run={run} />}
      {pick && <ScoreSheet m={pick} d={d} close={() => setPick(null)} run={run} />}
    </div>
  );
}

const ROUND_KINDS = ["swiss", "king_court", "shootout", "rotating", "americano", "mexicano"];
function StagePanel({ d, s, run, onPick }: { d: Detail & { entries: any[] }; s: StageT; run: (f: () => Promise<unknown>, m: string) => void; onPick: (m: M) => void }) {
  const ms = d.matches.filter((m) => m.stage_id === s.id);
  const playable = ms.filter((m) => m.status !== "done" && m.status !== "walkover").length;
  const [ch, setCh] = useState({ c: "", d: "" });
  const ladder: string[] = s.state?.ladder ?? [];
  const ename = new Map(d.entries.map((e: any) => [e.id, e.display_name]));
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">{s.seq}. {s.name}</h2>
        <span className="tag bg-surface dark:bg-surface-dark">{s.kind.replace("_", " ")}</span>
        <span className="muted text-sm">{ms.length} matches · {playable} to play · scoring {s.scoring.type === "rally" ? "rally" : "side-out"} to {s.scoring.to}{s.scoring.bo > 1 ? `, best of ${s.scoring.bo}` : ""}</span>
        <span className="flex-1" />
        <button className="btn-sec" onClick={() => { if (!ms.length || confirm("Regenerate this stage? Unplayed matches are replaced.")) run(() => api(`console/stages/${s.id}`, { action: "generate" }), ms.length ? "Stage regenerated" : "Draw made"); }}>{ms.length ? "Regenerate" : s.seq > 1 ? "Seed from previous stage" : "Make the draw"}</button>
        {(ROUND_KINDS.includes(s.kind) || (s.kind === "team_ties" && s.config.knockout)) && ms.length > 0 && <button className="btn" onClick={() => run(() => api(`console/stages/${s.id}`, { action: "next" }), "Next round created")}>Next round</button>}
      </div>
      {s.kind === "ladder" && ladder.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 text-sm">
          <label>Challenger <select className="inp" value={ch.c} onChange={(e) => setCh({ ...ch, c: e.target.value })}><option value="">Pick</option>{ladder.map((id, i) => <option key={id} value={id}>#{i + 1} {ename.get(id)}</option>)}</select></label>
          <label>Defender <select className="inp" value={ch.d} onChange={(e) => setCh({ ...ch, d: e.target.value })}><option value="">Pick</option>{ladder.map((id, i) => <option key={id} value={id}>#{i + 1} {ename.get(id)}</option>)}</select></label>
          <button className="btn" disabled={!ch.c || !ch.d} onClick={() => run(() => api(`console/stages/${s.id}`, { action: "challenge", challenger: ch.c, defender: ch.d }), "Challenge created")}>Create challenge</button>
        </div>
      )}
      <StageView d={d} stage={s} onPick={onPick} />
    </section>
  );
}

function ScoreSheet({ m, d, close, run }: { m: M; d: Detail & { teams: any[]; players: Player[] }; close: () => void; run: (f: () => Promise<unknown>, msg: string) => void }) {
  const need = Math.ceil(m.best_of / 2);
  const [g, setG] = useState<[string, string][]>(Array.from({ length: m.best_of }, (_, i) => [String(m.games?.[i]?.[0] ?? ""), String(m.games?.[i]?.[1] ?? "")]));
  const tie = m.tie_id ? d.ties.find((t) => t.id === m.tie_id) : null;
  const squad = (teamId?: string) => (d.teams.find((t: any) => t.id === teamId)?.team_players ?? []).map((x: any) => d.players.find((p) => p.id === x.player_id)).filter(Boolean) as Player[];
  const [sa, setSa] = useState<string[]>(m.side_a), [sb, setSb] = useState<string[]>(m.side_b);
  const n = m.event === "DreamBreaker" || /singles/i.test(m.event ?? "") ? 1 : 2;
  const finished = m.status === "done" || m.status === "walkover";
  const games = g.map(([a, b]) => [Number(a), Number(b)] as [number, number]).filter(([a, b]) => a || b);
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center" onClick={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" className="max-h-[90dvh] w-full max-w-lg space-y-3 overflow-y-auto bg-white p-5 dark:bg-[#17191a]">
        <div className="flex justify-between"><b>{m.event ?? m.stage}</b><button onClick={close} aria-label="Close">✕</button></div>
        <MatchCard m={m} compact />
        <p className="muted text-sm">{m.scoring === "rally" ? "Rally" : "Side-out"} scoring to {m.points_to}, best of {m.best_of}. Status: {m.status}.</p>
        {tie && m.status === "upcoming" && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[["A", tie.team_a, sa, setSa], ["B", tie.team_b, sb, setSb]].map(([label, team, val, set]: any) => (
              <label key={label} className="block"><span className="font-semibold">{label === "A" ? tie.nameA : tie.nameB}</span>
                <select multiple size={4} className="inp mt-1 h-auto" value={val} onChange={(e) => set([...e.target.selectedOptions].map((o) => o.value).slice(0, n))}>
                  {squad(team).map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.gender})</option>)}
                </select></label>
            ))}
            <button className="btn-sec col-span-2" onClick={() => run(() => api(`console/matches/${m.code}`, { sideA: sa, sideB: sb }, "PATCH"), "Players set")}>Save players</button>
          </div>
        )}
        {!finished && (
          <>
            <div className="space-y-2">{g.map((x, i) => (
              <div key={i} className="flex items-center gap-2"><span className="w-16 text-sm">Game {i + 1}</span>
                <input aria-label={`Game ${i + 1} side A`} inputMode="numeric" className="inp w-20 text-center" value={x[0]} onChange={(e) => setG(g.map((y, k) => (k === i ? [e.target.value, y[1]] : y)))} />
                <span>–</span>
                <input aria-label={`Game ${i + 1} side B`} inputMode="numeric" className="inp w-20 text-center" value={x[1]} onChange={(e) => setG(g.map((y, k) => (k === i ? [y[0], e.target.value] : y)))} />
              </div>))}</div>
            <div className="flex flex-wrap gap-2">
              <button className="btn" onClick={() => run(async () => { await api(`matches/${m.code}/action`, { action: "lock", games }); close(); }, "Result confirmed")}>Confirm result</button>
              {m.status === "upcoming" && <button className="btn-sec" onClick={() => run(() => api(`matches/${m.code}/action`, { action: "start" }), "Scoring open for the referee")}>Start (referee scores)</button>}
              {[0, 1].map((w) => <button key={w} className="btn-sec" onClick={() => run(async () => { await api(`matches/${m.code}/action`, { action: "walkover", winner: w }); close(); }, "Walkover recorded")}>Walkover to {w ? "B" : "A"}</button>)}
            </div>
            <p className="muted text-xs">Need {need} game{need > 1 ? "s" : ""}. Win by 2 unless the format says otherwise.</p>
          </>
        )}
        {finished && <button className="btn-sec" onClick={() => run(async () => { await api(`matches/${m.code}/action`, { action: "reopen" }); close(); }, "Match reopened (logged)")}>Correct result (reopen)</button>}
        <a className="block text-sm underline" href={`/scoreboard/${m.code}`} target="_blank">Open TV scoreboard ↗</a>
      </div>
    </div>
  );
}

function Entries({ d, cat, run }: { d: Detail & { entries: any[]; teams: any[]; players: Player[] }; cat: Detail["categories"][number]; run: (f: () => Promise<unknown>, m: string) => void }) {
  const entries = d.entries.filter((e: any) => e.category_id === cat.id);
  const n = cat.participant === "player" ? 1 : 2;
  const [sel, setSel] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const used = new Set(entries.flatMap((e: any) => [e.player1_id, e.player2_id]));
  const players = d.players.filter((p) => !used.has(p.id) && p.full_name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card">
        <h3 className="mb-2 font-bold">Entries ({entries.length})</h3>
        <table className="w-full text-sm"><thead><tr className="muted text-left text-xs"><th>Seed</th><th>Entry</th><th>Status</th><th /></tr></thead>
          <tbody>{entries.map((e: any) => (
            <tr key={e.id} className="border-t border-line dark:border-line-dark">
              <td className="py-1"><input aria-label="Seed" className="inp w-16" type="number" min={1} defaultValue={e.seed ?? ""} onBlur={(x) => x.target.value !== String(e.seed ?? "") && run(() => api("console/entries", { id: e.id, seed: x.target.value ? +x.target.value : null }, "PATCH"), "Seed saved")} /></td>
              <td>{e.display_name}</td>
              <td><select className="inp" value={e.status} onChange={(x) => run(() => api("console/entries", { id: e.id, status: x.target.value }, "PATCH"), "Status saved")}>{["confirmed", "review", "waitlist", "withdrawn", "rejected"].map((s) => <option key={s}>{s}</option>)}</select></td>
              <td><button className="text-xs underline" onClick={() => confirm(`Remove ${e.display_name}?`) && run(() => api("console/entries", { id: e.id }, "DELETE"), "Entry removed")}>Remove</button></td>
            </tr>))}</tbody></table>
        {!entries.length && <p className="muted text-sm">No entries yet.</p>}
      </section>
      <section className="card space-y-2">
        <h3 className="font-bold">Add {cat.participant === "team" ? "a team" : n === 1 ? "a player" : "a pair"}</h3>
        {cat.participant === "team" ? (
          <div className="space-y-2">{d.teams.filter((t: any) => !entries.some((e: any) => e.team_id === t.id)).map((t: any) => (
            <div key={t.id} className="flex items-center justify-between border border-line px-3 py-2 dark:border-line-dark"><span>{t.name} <span className="muted text-xs">({t.team_players.length} players)</span></span>
              <button className="btn-sec" onClick={() => run(() => api("console/entries", { category: cat.id, team: t.id }), "Team entered")}>Enter</button></div>))}
            <p className="muted text-sm">Create teams in the Teams tab first.</p></div>
        ) : (
          <>
            <input className="inp" placeholder="Search players" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="max-h-72 space-y-1 overflow-y-auto">{players.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sel.includes(p.id)} onChange={(e) => setSel(e.target.checked ? [...sel, p.id].slice(-n) : sel.filter((x) => x !== p.id))} />{p.full_name} <span className="muted">({p.gender}, {Number(p.rating).toFixed(2)})</span></label>))}</div>
            <button className="btn w-full" disabled={sel.length !== n} onClick={() => run(async () => { await api("console/entries", { category: cat.id, players: sel }); setSel([]); }, "Entry added")}>Add entry</button>
          </>
        )}
      </section>
    </div>
  );
}

function Teams({ d, code, cat, run }: { d: Detail & { teams: any[]; players: Player[] }; code: string; cat: Detail["categories"][number]; run: (f: () => Promise<unknown>, m: string) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => { api<{ users: User[] }>("admin/users").then((r) => setUsers(r.users)).catch(() => {}); }, []);
  const [name, setName] = useState("");
  const pname = new Map(d.players.map((p) => [p.id, p.full_name]));
  return (
    <div className="space-y-4">
      <form className="card flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); run(async () => { await api("console/teams", { tournament: code, name }); setName(""); }, "Team created"); }}>
        <label className="block flex-1 text-sm"><span className="font-semibold">New team</span><input className="inp mt-1" value={name} onChange={(e) => setName(e.target.value)} /></label><button className="btn" disabled={name.length < 2}>Create team</button>
      </form>
      <div className="grid gap-3 lg:grid-cols-2">{d.teams.map((t: any) => {
        const members: string[] = t.team_players.map((x: any) => x.player_id);
        return (
          <section key={t.id} className="card space-y-2">
            <div className="flex items-center justify-between"><b>{t.name}</b><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={t.owner_access} onChange={(e) => run(() => api("console/teams", { id: t.id, access: e.target.checked }, "PATCH"), "Owner access updated")} />Owner access</label></div>
            <label className="block text-sm">Owner login
              <select className="inp mt-1" value={t.owner_profile ?? ""} onChange={(e) => run(() => api("console/teams", { id: t.id, ownerUserId: e.target.value || null }, "PATCH"), "Owner assigned")}>
                <option value="">No owner</option>{users.filter((u) => ["team_owner", "player"].includes(u.role)).map((u) => <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>)}
              </select></label>
            <p className="text-sm"><b>Squad ({members.length}):</b> {members.map((id) => pname.get(id)).join(", ") || "none"}</p>
            <details><summary className="cursor-pointer text-sm underline">Edit squad</summary>
              <div className="mt-2 grid max-h-60 grid-cols-2 gap-1 overflow-y-auto text-sm">{d.players.map((p) => (
                <label key={p.id} className="flex items-center gap-1"><input type="checkbox" checked={members.includes(p.id)} onChange={(e) => run(() => api("console/teams", { id: t.id, players: e.target.checked ? [...members, p.id] : members.filter((x) => x !== p.id) }, "PATCH"), "Squad saved")} />{p.full_name} ({p.gender})</label>))}</div></details>
            <button className="text-xs underline" onClick={() => confirm(`Delete ${t.name}?`) && run(() => api("console/teams", { id: t.id }, "DELETE"), "Team deleted")}>Delete team</button>
          </section>
        );
      })}</div>
      <p className="muted text-sm">After building squads, enter the teams in this category from the Entries tab.</p>
    </div>
  );
}

function FormatSettings({ c, catalog, run }: { c: Detail["categories"][number] & { format_config?: any }; catalog: Catalog; run: (f: () => Promise<unknown>, m: string) => void }) {
  const [v, setV] = useState<CatDraft>({ name: c.name, format: c.format_id, config: (c as any).format_config ?? {}, scoring: "so11bo1", playoffScoring: "so11bo3", entry: c.participant === "team" ? undefined : (c.participant as "player" | "pair") });
  return (
    <div className="card space-y-3">
      <p className="text-sm">Change this category's format. Allowed until the first match is played; unplayed matches are cleared.</p>
      <FormatPicker catalog={catalog} value={v} onChange={setV} />
      <div className="flex gap-2">
        <button className="btn" onClick={() => run(async () => { await api(`console/categories/${c.id}`, { name: v.name }, "PATCH"); await api(`console/categories/${c.id}`, { format: v.format, config: v.config, scoring: v.scoring, playoffScoring: v.playoffScoring, entry: v.entry }, "PUT"); }, "Format applied")}>Apply format</button>
        <button className="btn-sec" onClick={() => confirm("Delete this category?") && run(() => api(`console/categories/${c.id}`, undefined, "DELETE"), "Category deleted")}>Delete category</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ users & logins
const ROLES = ["player", "team_owner", "referee", "organiser", "admin"];
function Users({ say }: { say: (m: string) => void }) {
  const [list, setList] = useState<User[] | null>(null);
  const [q, setQ] = useState(""), [role, setRole] = useState("");
  const [edit, setEdit] = useState<User | "new" | null>(null);
  const load = useCallback(() => api<{ users: User[] }>("admin/users").then((r) => setList(r.users)).catch((e) => say(e.message)), [say]);
  useEffect(() => { load(); }, [load]);
  const rows = useMemo(() => (list ?? []).filter((u) => (!role || u.role === role) && (!q || [u.name, u.email, u.phone].some((x) => x?.toLowerCase().includes(q.toLowerCase())))), [list, q, role]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2"><h1 className="flex-1 text-2xl font-bold">Users & logins</h1>
        <input className="inp w-56" placeholder="Search name, email, mobile" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="inp w-40" value={role} onChange={(e) => setRole(e.target.value)}><option value="">All roles</option>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        <button className="btn" onClick={() => setEdit("new")}>+ New login</button></div>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="muted text-left text-xs"><th className="py-1">Name</th><th>Login</th><th>Role</th><th>Linked</th><th>Last sign-in</th><th /></tr></thead>
        <tbody>{rows.map((u) => (
          <tr key={u.id} className={`border-t border-line dark:border-line-dark ${u.disabled ? "opacity-50" : ""}`}>
            <td className="py-2">{u.name || "—"}</td><td>{u.email}{u.phone && <span className="muted block text-xs">{u.phone}</span>}</td>
            <td><span className="tag bg-surface dark:bg-surface-dark">{u.role}</span>{u.disabled && <span className="tag ml-1 bg-live text-white">disabled</span>}</td>
            <td className="text-xs">{u.player && `Player: ${u.player.full_name}`}{u.teams.map((t) => <span key={t.id} className="block">Owner: {t.name}</span>)}</td>
            <td className="text-xs">{u.lastSignIn ? new Date(u.lastSignIn).toLocaleString("en-IN") : "never"}</td>
            <td><button className="text-xs underline" onClick={() => setEdit(u)}>Edit</button></td>
          </tr>))}</tbody></table></div>
      {list === null && <p className="muted">Loading…</p>}
      {edit && <UserSheet u={edit === "new" ? null : edit} close={() => setEdit(null)} done={(m) => { say(m); setEdit(null); load(); }} />}
    </div>
  );
}

function UserSheet({ u, close, done }: { u: User | null; close: () => void; done: (m: string) => void }) {
  const [f, setF] = useState({ name: u?.name ?? "", email: u?.email ?? "", phone: u?.phone ?? "", role: u?.role ?? "player", password: "", gender: "X" });
  const [err, setErr] = useState("");
  const gen = () => { const a = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const b = crypto.getRandomValues(new Uint8Array(14)); setF({ ...f, password: [...b].map((x) => a[x % a.length]).join("") + "#7" }); };
  const submit = async () => {
    setErr("");
    try {
      if (u) await api(`admin/users/${u.id}`, { name: f.name || undefined, email: f.email && f.email !== u.email ? f.email : undefined, phone: f.phone !== (u.phone ?? "") ? f.phone || null : undefined, role: f.role !== u.role ? f.role : undefined, password: f.password || undefined }, "PATCH");
      else await api("admin/users", { name: f.name, email: f.email || undefined, phone: f.phone || undefined, role: f.role, password: f.password || undefined, gender: f.gender });
      done(u ? "Login updated" : `Login created${f.password ? `. Password: ${f.password}` : ""}`);
    } catch (e) { setErr((e as Error).message); }
  };
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center" onClick={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" className="w-full max-w-md space-y-3 bg-white p-5 dark:bg-[#17191a]">
        <h3 className="text-lg font-bold">{u ? "Edit login" : "New login"}</h3>
        <input className="inp" placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="inp" type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className="inp" placeholder="Mobile (10 digits, optional)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <select className="inp" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        {!u && (f.role === "player" || f.role === "team_owner") && <select className="inp" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option value="M">Man</option><option value="F">Woman</option><option value="X">Other</option></select>}
        <div className="flex gap-2"><input className="inp" placeholder={u ? "New password (leave blank to keep)" : "Password (blank = code login only)"} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><button type="button" className="btn-sec" onClick={gen}>Generate</button></div>
        {err && <p className="text-sm text-live">{err}</p>}
        <div className="flex flex-wrap gap-2">
          {u && <button className="btn-sec" onClick={async () => { try { await api(`admin/users/${u.id}`, { disabled: !u.disabled }, "PATCH"); done(u.disabled ? "Login enabled" : "Login disabled"); } catch (e) { setErr((e as Error).message); } }}>{u.disabled ? "Enable" : "Disable"}</button>}
          {u && <button className="btn-sec" onClick={async () => { if (!confirm(`Delete ${u.email ?? u.phone}? This cannot be undone.`)) return; try { await api(`admin/users/${u.id}`, undefined, "DELETE"); done("Login deleted"); } catch (e) { setErr((e as Error).message); } }}>Delete</button>}
          <span className="flex-1" /><button className="btn-sec" onClick={close}>Cancel</button><button className="btn" onClick={submit}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ players
function Players({ say }: { say: (m: string) => void }) {
  const [list, setList] = useState<Player[]>([]);
  const [f, setF] = useState({ name: "", gender: "M", rating: 3.5, locality: "" });
  const load = useCallback(() => api<{ players: Player[] }>("console/players").then((r) => setList(r.players)), []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Players ({list.length})</h1>
      <form className="card grid gap-2 sm:grid-cols-5" onSubmit={async (e) => { e.preventDefault(); try { await api("console/players", f); say("Player added"); setF({ ...f, name: "" }); load(); } catch (x) { say((x as Error).message); } }}>
        <input className="inp sm:col-span-2" placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <select className="inp" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option value="M">Man</option><option value="F">Woman</option><option value="X">Other</option></select>
        <input className="inp" type="number" step="0.05" min={1} max={8} value={f.rating} onChange={(e) => setF({ ...f, rating: +e.target.value })} aria-label="Rating" />
        <button className="btn" disabled={f.name.length < 2}>Add player</button>
      </form>
      <table className="w-full text-sm"><thead><tr className="muted text-left text-xs"><th className="py-1">Name</th><th>Gender</th><th>Rating</th><th>Played</th><th>Won</th><th>Login</th></tr></thead>
        <tbody>{list.map((p) => (
          <tr key={p.id} className="border-t border-line dark:border-line-dark"><td className="py-1.5">{p.full_name}</td><td>{p.gender}</td>
            <td><input aria-label="Rating" className="inp w-20" type="number" step="0.05" defaultValue={Number(p.rating)} onBlur={(e) => Number(e.target.value) !== Number(p.rating) && api("console/players", { id: p.id, rating: +e.target.value }, "PATCH").then(() => say("Rating saved"))} /></td>
            <td>{p.played}</td><td>{p.won}</td><td>{p.profile_id ? "yes" : "—"}</td></tr>))}</tbody></table>
    </div>
  );
}
