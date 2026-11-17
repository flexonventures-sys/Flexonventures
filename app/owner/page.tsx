"use client";
// Team owner view (proposal section 7, walkthrough pages 24-25).
// Mobile + WhatsApp code login; then Next tie (countdown ring), Lineup, Squad, Fixtures.
// Owners see only their own team and cannot change times, courts or other lineups.
import { useCallback, useEffect, useMemo, useState } from "react";

type Player = { id: string; code: string; full_name: string; gender: "M" | "F" | "X"; category?: string | null; photo?: string | null };
type Fixture = {
  id: string; round: string | null; court: number | null; at: string | null; opponent: string; home: boolean;
  myLineup: { event: string; players: string[] }[] | null;
  window: { opens: string; closes: string; open: boolean } | null; result: "W" | "L" | null;
};
type Data = {
  team: { id: string; name: string; colour: string | null };
  tournament: { code: string; name: string; squadMin: number | null; squadMax: number | null; tieEvents: string[] };
  squad: Player[]; next: Fixture | null; fixtures: Fixture[];
  table: { team: string; played: number; won: number; lost: number; points: number; me: boolean }[];
};

async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const r = await fetch("/api/" + path, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: { "content-type": "application/json" }, credentials: "same-origin",
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error ?? "Something went wrong"), { status: r.status });
  return j as T;
}

const TABS = [["tie", "Next tie"], ["lineup", "Lineup"], ["squad", "Squad"], ["fixtures", "Fixtures"]] as const;
type Tab = (typeof TABS)[number][0];
const time = (s: string | Date) => new Date(s).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const day = (s: string) => new Date(s).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function OwnerPage() {
  const [data, setData] = useState<Data | null>(null);
  const [need, setNeed] = useState<"loading" | "login" | "ready" | "blocked">("loading");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<Tab>("tie");
  const [toast, setToast] = useState("");
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };

  const load = useCallback(async () => {
    try { setData(await api<Data>("owner")); setNeed("ready"); }
    catch (e) {
      const s = (e as { status?: number }).status;
      if (s === 401) setNeed("login");
      else { setMsg((e as Error).message); setNeed(s === 403 ? "blocked" : "login"); }
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (need !== "ready") return; const id = setInterval(load, 30_000); return () => clearInterval(id); }, [need, load]);

  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-ink px-4 py-3 text-white">
        <span className="inline-block h-4 w-4 rounded-full bg-ball" aria-hidden />
        <b className="font-display tracking-wide">FLEXON</b><small className="opacity-70">Team owner</small>
        <span className="flex-1" />
        {need === "ready" && <button className="text-sm underline" onClick={async () => { await api("auth/logout", { body: {} }); setData(null); setNeed("login"); }}>Log out</button>}
      </header>

      {need === "loading" && <p className="muted p-4">Loading…</p>}
      {need === "blocked" && <div className="p-4"><h1 className="text-2xl font-bold">Access paused</h1><p className="muted mt-2">{msg}</p></div>}
      {need === "login" && <Login onIn={load} note={msg} />}

      {need === "ready" && data && (
        <>
          <div className="px-4 pt-4">
            <p className="muted text-sm">{data.tournament.name}</p>
            <h1 className="text-3xl font-bold leading-tight">{data.team.name}</h1>
          </div>
          <main className="p-4">
            {tab === "tie" && <NextTie d={data} go={() => setTab("lineup")} />}
            {tab === "lineup" && <Lineup d={data} done={(m) => { say(m); load(); }} />}
            {tab === "squad" && <Squad d={data} done={(m) => { say(m); load(); }} />}
            {tab === "fixtures" && <Fixtures d={data} />}
          </main>
          <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-white dark:border-line-dark dark:bg-[#0c0e0f]" aria-label="Sections">
            <div className="mx-auto grid max-w-xl grid-cols-4">
              {TABS.map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? "page" : undefined}
                  className={`min-h-14 text-sm font-semibold ${tab === k ? "text-court dark:text-ball" : "muted"}`}>{l}</button>
              ))}
            </div>
          </nav>
        </>
      )}
      <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-20 flex justify-center">
        {toast && <div className="bg-ink px-4 py-2 text-sm text-white">{toast}</div>}
      </div>
    </div>
  );
}

function Login({ onIn, note }: { onIn: () => void; note: string }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [mode, setMode] = useState<"code" | "pw">("code");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(note);
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<unknown>) => { setBusy(true); setErr(""); try { await f(); } catch (e) { setErr((e as Error).message); } setBusy(false); };
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Team owner log in</h1>
      <p className="muted mt-1">Use the mobile the organiser registered. We send a 6-digit code on WhatsApp.</p>
      <div className="mt-4 flex gap-2" role="group" aria-label="Login method">
        {([["code", "Mobile code"], ["pw", "Email and password"]] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)} className={`min-h-11 flex-1 border px-3 text-sm font-semibold ${mode === k ? "border-ink bg-ink text-white dark:border-ball dark:bg-ball dark:text-ink" : "border-line dark:border-line-dark"}`}>{l}</button>
        ))}
      </div>
      {mode === "pw" ? (
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await api("auth/password", { body: { email, password: pw, role: "team_owner" } }); onIn(); }); }}>
          <label className="block text-sm font-semibold" htmlFor="em">Email</label>
          <input id="em" type="email" className="inp" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          <label className="block text-sm font-semibold" htmlFor="pw">Password</label>
          <input id="pw" type="password" className="inp" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
          <button className="btn w-full" disabled={busy || !email || !pw}>Log in</button>
        </form>
      ) : !sent ? (
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await api("auth/otp", { body: { phone, role: "team_owner", channel: "whatsapp" } }); setSent(true); }); }}>
          <label className="block text-sm font-semibold" htmlFor="ph">Mobile number</label>
          <div className="flex"><span className="inp w-auto border-r-0">+91</span><input id="ph" className="inp" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="98300 00000" autoComplete="tel-national" /></div>
          <button className="btn w-full" disabled={busy || phone.length !== 10}>Send code on WhatsApp</button>
        </form>
      ) : (
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await api("auth/verify", { body: { phone, code, role: "team_owner" } }); onIn(); }); }}>
          <label className="block text-sm font-semibold" htmlFor="code">Code sent to +91 {phone}</label>
          <input id="code" className="inp text-center text-2xl tracking-[.5em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" />
          <button className="btn w-full" disabled={busy || code.length !== 6}>Log in</button>
          <button type="button" className="text-sm underline" onClick={() => setSent(false)}>Change number</button>
        </form>
      )}
      {err && <p className="mt-3 text-sm text-live">{err}</p>}
      <p className="muted mt-8 text-sm">Not an owner? <a className="underline" href="/#/me">Other logins</a></p>
    </div>
  );
}

function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setN(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return n;
}

function Crest({ name, colour }: { name: string; colour?: string | null }) {
  return <span className="grid h-14 w-14 place-items-center rounded-full text-lg font-bold text-white" style={{ background: colour ?? "#1F4FD1" }}>{initials(name)}</span>;
}

function NextTie({ d, go }: { d: Data; go: () => void }) {
  const now = useNow();
  const t = d.next;
  if (!t || !t.at) return <div className="card"><b>No upcoming tie</b><p className="muted">The organiser has not scheduled your next tie yet.</p></div>;
  const opens = new Date(t.window!.opens).getTime(), closes = new Date(t.window!.closes).getTime();
  const open = now >= opens && now < closes;
  const left = open ? closes - now : Math.max(opens - now, 0);
  const frac = open ? left / (30 * 60_000) : 1;
  const mm = Math.floor(left / 60_000), hh = Math.floor(mm / 60), ss = Math.floor((left % 60_000) / 1000);
  const R = 54, C = 2 * Math.PI * R;
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-1"><Crest name={d.team.name} colour={d.team.colour} /><b className="text-sm">{d.team.name}</b></div>
          <span className="muted font-bold">v</span>
          <div className="flex flex-col items-center gap-1"><Crest name={t.opponent} colour="#111" /><b className="text-sm">{t.opponent}</b></div>
        </div>
        <p className="mt-3 text-center">{day(t.at)}, {time(t.at)}{t.court ? `, Court ${t.court}` : ""}</p>
      </div>
      <div className="card flex items-center gap-4">
        <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0" role="img" aria-label={open ? `Lineup window closes in ${mm} minutes` : "Lineup window not open yet"}>
          <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="10" />
          <circle cx="60" cy="60" r={R} fill="none" stroke={open ? "#DDF33B" : "#1F4FD1"} strokeWidth="10" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 60 60)" strokeLinecap="round" />
          <text x="60" y="58" textAnchor="middle" className="fill-current text-[18px] font-bold">{hh > 0 ? `${hh}h ${mm % 60}m` : `${mm}:${String(ss).padStart(2, "0")}`}</text>
          <text x="60" y="78" textAnchor="middle" className="fill-current text-[10px] opacity-70">{open ? "to submit" : now >= closes ? "closed" : "until open"}</text>
        </svg>
        <div>
          <b>{open ? "Lineup window open" : now >= closes ? "Tie started" : "Lineup window"}</b>
          <p className="muted text-sm">{time(t.window!.opens)} to {time(t.window!.closes)}. Opens 30 minutes before the tie and closes at the start. If the tie moves, the window moves with it.</p>
          <p className="mt-2 text-sm">{t.myLineup ? "Lineup submitted. Hidden from the other team until the start." : "No lineup submitted yet."}</p>
          {open && <button className="btn mt-3" onClick={go}>{t.myLineup ? "Change lineup" : "Pick lineup"}</button>}
        </div>
      </div>
    </div>
  );
}

function Lineup({ d, done }: { d: Data; done: (m: string) => void }) {
  const t = d.next;
  const events = d.tournament.tieEvents?.length ? d.tournament.tieEvents : ["Doubles"];
  const [sel, setSel] = useState<Record<string, string[]>>(() => Object.fromEntries((t?.myLineup ?? []).map((l) => [l.event, l.players])));
  const [err, setErr] = useState("");
  const eligible = (ev: string) => d.squad.filter((p) => (/^men/i.test(ev) ? p.gender === "M" : /^women/i.test(ev) ? p.gender === "F" : true));
  if (!t) return <p className="muted">No upcoming tie.</p>;
  const open = t.window?.open;
  const toggle = (ev: string, id: string) => setSel((s) => {
    const cur = s[ev] ?? [];
    return { ...s, [ev]: cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 2 ? [...cur, id] : [cur[1], id] };
  });
  return (
    <div className="space-y-4">
      {!open && <div className="card text-sm">The lineup can be submitted from {time(t.window!.opens)} until the tie starts at {time(t.window!.closes)}.</div>}
      {events.map((ev) => (
        <fieldset key={ev} className="card" disabled={!open}>
          <legend className="font-bold">{ev} <span className="muted text-sm font-normal">pick two</span></legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {eligible(ev).map((p) => {
              const on = (sel[ev] ?? []).includes(p.id);
              return <button type="button" key={p.id} onClick={() => toggle(ev, p.id)} aria-pressed={on}
                className={`min-h-11 border px-3 text-left text-sm ${on ? "border-court bg-court text-white" : "border-line dark:border-line-dark"}`}>{p.full_name}</button>;
            })}
          </div>
        </fieldset>
      ))}
      {err && <p className="text-sm text-live">{err}</p>}
      <button className="btn w-full" disabled={!open} onClick={async () => {
        setErr("");
        try { await api("owner/lineup", { body: { tie: t.id, lineup: events.map((ev) => ({ event: ev, players: sel[ev] ?? [] })) } }); done("Lineup submitted. The other team can't see it until the start."); }
        catch (e) { setErr((e as Error).message); }
      }}>Submit lineup</button>
    </div>
  );
}

function Squad({ d, done }: { d: Data; done: (m: string) => void }) {
  const inLineup = useMemo(() => new Set((d.next?.myLineup ?? []).flatMap((l) => l.players)), [d.next]);
  const [edit, setEdit] = useState<Player | "new" | null>(null);
  const max = d.tournament.squadMax, min = d.tournament.squadMin;
  return (
    <div>
      <p className="muted mb-3 text-sm">{d.squad.length} players{max ? `, ${min ?? 0} to ${max} allowed` : ""}.</p>
      <div className="grid grid-cols-2 gap-3">
        {d.squad.map((p) => (
          <button key={p.id} className="card text-left" onClick={() => setEdit(p)}>
            {p.photo ? <img src={p.photo} alt="" className="mb-2 h-12 w-12 rounded-full object-cover" /> : <span className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-court font-bold text-white">{initials(p.full_name)}</span>}
            <b className="block">{p.full_name}</b>
            <span className="muted text-xs">{p.category ?? (p.gender === "F" ? "Women" : p.gender === "M" ? "Men" : "Open")}</span>
            {inLineup.has(p.id) && <span className="tag mt-1 bg-ball text-ink">In lineup</span>}
          </button>
        ))}
        {(!max || d.squad.length < max) && <button className="card grid place-items-center font-semibold" onClick={() => setEdit("new")}>+ Add player</button>}
      </div>
      {edit && <PlayerSheet p={edit === "new" ? null : edit} close={() => setEdit(null)} done={(m) => { setEdit(null); done(m); }} />}
    </div>
  );
}

function PlayerSheet({ p, close, done }: { p: Player | null; close: () => void; done: (m: string) => void }) {
  const [f, setF] = useState({ name: p?.full_name ?? "", phone: "", gender: p?.gender ?? "M", category: p?.category ?? "", photo: p?.photo ?? "" });
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setErr("");
    try {
      if (p) await api("owner/squad", { method: "PATCH", body: { player: p.id, name: f.name, category: f.category || undefined, photo: f.photo || undefined } });
      else await api("owner/squad", { body: { name: f.name, phone: f.phone, gender: f.gender, category: f.category || undefined, photo: f.photo || undefined } });
      done(p ? "Player updated" : "Player added and invited on WhatsApp");
    } catch (e) { setErr((e as Error).message); }
  };
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/50" onClick={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" className="mx-auto w-full max-w-xl space-y-3 bg-white p-4 dark:bg-[#17191a]">
        <h3 className="text-lg font-bold">{p ? "Edit player" : "Add player"}</h3>
        <input className="inp" placeholder="Full name" value={f.name} onChange={set("name")} />
        {!p && <input className="inp" placeholder="Mobile (10 digits)" inputMode="numeric" maxLength={10} value={f.phone} onChange={set("phone")} />}
        {!p && <select className="inp" value={f.gender} onChange={set("gender")}><option value="M">Man</option><option value="F">Woman</option><option value="X">Other</option></select>}
        <input className="inp" placeholder="Category (optional)" value={f.category} onChange={set("category")} />
        <input className="inp" placeholder="Photo URL (optional)" value={f.photo} onChange={set("photo")} />
        {err && <p className="text-sm text-live">{err}</p>}
        <div className="flex gap-2">
          {p && <button className="btn-sec" onClick={async () => { try { await api("owner/squad", { method: "DELETE", body: { player: p.id } }); done("Player removed"); } catch (e) { setErr((e as Error).message); } }}>Remove</button>}
          <span className="flex-1" />
          <button className="btn-sec" onClick={close}>Cancel</button>
          <button className="btn" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

function Fixtures({ d }: { d: Data }) {
  return (
    <div className="space-y-6">
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {d.fixtures.map((f) => (
          <div key={f.id} className="card w-56 shrink-0 snap-start">
            <span className="muted text-xs uppercase">{f.round ?? "Tie"}</span>
            <b className="block">v {f.opponent}</b>
            <span className="muted text-sm">{f.at ? `${day(f.at)}, ${time(f.at)}` : "Time TBC"}{f.court ? `, Court ${f.court}` : ""}</span>
            {f.result && <span className={`tag mt-2 ${f.result === "W" ? "bg-pitch text-white" : "bg-live text-white"}`}>{f.result === "W" ? "Won" : "Lost"}</span>}
          </div>
        ))}
        {!d.fixtures.length && <p className="muted">No fixtures yet.</p>}
      </div>
      <div>
        <h2 className="mb-2 font-bold">League table</h2>
        <table className="w-full text-sm">
          <thead><tr className="muted text-left"><th className="py-1">Team</th><th>P</th><th>W</th><th>L</th><th>Pts</th></tr></thead>
          <tbody>{d.table.map((r) => (
            <tr key={r.team} className={`border-t border-line dark:border-line-dark ${r.me ? "font-bold" : ""}`}><td className="py-2">{r.team}</td><td>{r.played}</td><td>{r.won}</td><td>{r.lost}</td><td>{r.points}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
