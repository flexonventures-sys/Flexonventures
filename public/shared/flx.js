/* Flexon API bridge.
 * The approved prototype UI (hub = public view, organiser = admin + referee view) keeps its own
 * rendering. This file wraps its actions so each one also goes to the Next.js API, subscribes to
 * Supabase Realtime for live scores, and queues referee taps offline (proposal sections 9, 10, 13).
 */
(function () {
  "use strict";
  const X = window.FLXApp, F = window.__FLX || {};
  if (!X) return;
  const { Acts, M, render, toast, parse } = X;
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const isAdmin = location.pathname.startsWith("/admin") || location.pathname.startsWith("/organiser");
  const live = !!F.live; // false when the DB is not configured: prototype runs on demo data

  async function api(path, body, method) {
    const r = await fetch("/api/" + path, {
      method: method || (body ? "POST" : "GET"),
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Something went wrong (" + r.status + ")");
    return j;
  }
  const otp = () => $$("[data-otp]").map((i) => i.value).join("");
  const pressed = (act) => { const b = $$(`[data-act=${act}]`).find((x) => x.getAttribute("aria-pressed") === "true"); return b ? b.textContent.trim().toLowerCase() : ""; };
  // wrap(name, before): run `before`; if it returns false (or throws) the prototype action is skipped
  function wrap(name, before) {
    const orig = Acts[name];
    Acts[name] = async (a, e) => {
      if (!live) return orig && orig(a, e);
      try { if ((await before(a, e)) === false) return; } catch (err) { toast(err.message); return; }
      orig && orig(a, e);
    };
  }
  window.FLX = { api };

  /* ------------------------------------------------------------- public view */
  if (!isAdmin) {
    const reg = { phone: "", email: "" };
    wrap("send", async () => {
      const phone = ($("#l-p") || {}).value, email = ($("#l-e") || {}).value;
      await api("auth/otp", { phone, email, channel: pressed("ch") === "sms" ? "sms" : "whatsapp", role: "player" });
      reg.phone = phone; reg.email = email;
    });
    wrap("pwlogin", async () => { await api("auth/password", { email: ($("#l-e") || {}).value, password: ($("#l-pw") || {}).value, role: "player" }); });
    wrap("login", async () => { await api("auth/verify", { phone: reg.phone, email: reg.email, code: otp() }); });
    wrap("next", async () => {
      const step = $(".step-l") ? +($(".step-l").textContent.match(/Step (\d)/) || [])[1] : 0;
      if (step === 2) { reg.phone = $("#f-p").value; reg.name = $("#f-n").value; reg.email = $("#f-e").value;
        reg.dob = ($("#f-b") || {}).value; reg.tshirt = ($("#f-t") || {}).value;
        await api("auth/otp", { phone: reg.phone, channel: "whatsapp", role: "player" }); }
      if (step === 3) await api("auth/verify", { phone: reg.phone, code: otp(), name: reg.name, email: reg.email });
      if (step === 1) { const c = $("input[name=cat]:checked"); reg.cat = c && c.value; }
      if (step === 4) { reg.partnerName = ($("#f-pn") || {}).value; reg.partnerPhone = ($("#f-pp") || {}).value;
        reg.teamName = ($("#f-tn") || {}).value; const fp = $$(".opt input[type=checkbox]").find(Boolean); reg.findPartner = !!(fp && fp.checked); }
    });
    // Real Razorpay checkout replaces the prototype's mock payment sheet
    wrap("pay", async () => {
      if (!$("#f-ok").checked) return true; // let the prototype show its "tick the box" toast
      const t = parse().arg;
      const res = await api("entries", { tournament: t, category: reg.cat, partnerName: reg.partnerName, partnerPhone: reg.partnerPhone,
        teamName: reg.teamName, findPartner: reg.findPartner, rulesAccepted: true, answers: { email: reg.email, dob: reg.dob, tshirt: reg.tshirt } });
      if (!res.order) { Acts.paid(); return false; }       // free / auto-confirmed entry
      await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      await new Promise((resolve, reject) => {
        const rz = new window.Razorpay({
          key: res.keyId, order_id: res.order.id, amount: res.order.amount, currency: "INR",
          name: "Flexon Ventures", description: res.description, prefill: { contact: reg.phone, email: reg.email, name: reg.name },
          handler: (p) => api("payments/verify", p).then(resolve, reject),
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        });
        rz.on("payment.failed", (r) => reject(new Error(r.error.description)));
        rz.open();
      });
      Acts.paid(); return false;
    });
    wrap("follow", (a) => api("follows", { match: a.dataset.id, toggle: true }));
    wrap("followt2", (a) => api("follows", { tournament: a.dataset.id, categories: $$("input[name=fc]:checked").map((i) => i.value) }));
    wrap("unfollowt", (a) => api("follows", { tournament: a.dataset.id, remove: true }));
    wrap("logout", () => api("auth/logout", {}));
    if ("Notification" in window && F.vapidKey) setTimeout(subscribePush, 4000);
  }

  /* ------------------------------------------------------------- organiser + referee */
  if (isAdmin) {
    let email = "";
    const tournamentOf = (m) => (m && m.t) || (X.T.find((t) => t.status === "live") || X.T[0]).id;
    wrap("gsend", async () => { email = ($("#g-e") || $("input[type=email]") || {}).value; await api("auth/otp", { email, role: "organiser" }); });
    wrap("gin", async () => { await api("auth/verify", { email, code: otp(), role: "organiser" }); });
    wrap("gpw", async () => { await api("auth/password", { email: ($("#g-e") || {}).value, password: ($("#g-pw") || {}).value, role: "organiser" }); });
    wrap("rin", async () => {
      const court = +(($$("[data-act=rcourt]").find((b) => b.getAttribute("aria-pressed") === "true") || {}).dataset || {}).v || 1;
      await api("referee/login", { tournament: tournamentOf(), court, pin: otp() });
    });
    wrap("logout", () => api("auth/logout", {}));

    // Offline-first rally queue: taps are stored locally with a client id and replayed in order.
    const QK = "flx-rally-queue";
    const load = () => { try { return JSON.parse(localStorage.getItem(QK) || "[]"); } catch { return []; } };
    const save = (q) => { try { localStorage.setItem(QK, JSON.stringify(q)); } catch {} };
    async function flush() {
      let q = load();
      while (q.length && navigator.onLine) {
        try { await api(`matches/${q[0].match}/events`, q[0]); q.shift(); save(q); } catch (e) { break; }
      }
    }
    window.addEventListener("online", flush); setInterval(flush, 5000);
    const push = (ev) => { const q = load(); q.push({ ...ev, clientId: crypto.randomUUID() }); save(q); flush(); };
    wrap("rally", (a) => { push({ match: parse().arg, kind: "rally", winner: +a.dataset.w }); });
    wrap("undo", () => { push({ match: parse().arg, kind: "undo" }); });
    wrap("timeout", (a) => { push({ match: parse().arg, kind: "timeout", side: +(a.dataset.w || 0) }); });
    wrap("lock", async (a) => { await flush(); const m = X.mById(a.dataset.id); await api(`matches/${a.dataset.id}/action`, { action: "lock", games: X.st(m).games }); });
    wrap("start", (a) => api(`matches/${a.dataset.id}/action`, { action: "start" }));
    wrap("moved", (a) => api(`matches/${a.dataset.id}/action`, { action: "move", time: $("#mv-t").value, court: +$("#mv-c").value.replace(/\D/g, "") }));
    wrap("wo", (a) => api(`matches/${a.dataset.id}/action`, { action: "walkover", winner: +a.dataset.w }));
    wrap("approve", (a) => api(`entries/${a.dataset.id}`, { action: "approve" }, "PATCH"));
    wrap("reject", (a) => api(`entries/${a.dataset.id}`, { action: "reject" }, "PATCH"));
    wrap("refund", (a) => api(`refunds/${a.dataset.id}`, { action: "process" }));
  }

  /* ------------------------------------------------------------- realtime scores */
  if (live && F.supabaseUrl && F.supabaseAnonKey) {
    loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js").then(() => {
      const sb = window.supabase.createClient(F.supabaseUrl, F.supabaseAnonKey);
      const byUuid = (id) => M.find((m) => m.uuid === id);
      const scoringHere = () => /^score$/.test(parse().name);
      sb.channel("live-scores")
        .on("postgres_changes", { event: "*", schema: "public", table: "rally_events" }, (p) => {
          const m = byUuid((p.new || p.old).match_id); if (!m || scoringHere()) return;
          api(`matches/${m.id}`).then((d) => { m.log = d.log; m.status = d.status; m.games = d.games; render(); });
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, (p) => {
          const m = byUuid(p.new.id); if (!m) return;
          Object.assign(m, { status: p.new.status, games: p.new.games, court: p.new.court_no });
          if (p.new.scheduled_at) m.time = new Date(p.new.scheduled_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
          if (!scoringHere()) render();
        })
        .subscribe();
    });
  }

  function loadScript(src) {
    return new Promise((ok, no) => { if ([...document.scripts].some((s) => s.src === src)) return ok();
      const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error("Could not load " + src)); document.head.appendChild(s); });
  }
  async function subscribePush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (Notification.permission === "default") return; // asked only after the user follows something
      if (Notification.permission !== "granted") return;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: F.vapidKey });
      await api("push", sub.toJSON());
    } catch {}
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
})();
