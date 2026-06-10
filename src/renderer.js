"use strict";

// ====== Element-Referenzen ================================================
const $ = (id) => document.getElementById(id);
const panelCountSelect = $("panelCount");
const urlInputsContainer = $("urlInputs");
const updateGridBtn = $("updateGridBtn");
const stravaStatsBtn = $("stravaStatsBtn");
const liveModeBtn = $("liveModeBtn");
const themeToggleBtn = $("themeToggleBtn");
const gridEl = $("grid");
const backyardStartInput = $("backyardStart");
const backyardRoundMinInput = $("backyardRoundMin");
const backyardRoundDistInput = $("backyardRoundDist");
const backyardToggleBtn = $("backyardToggleBtn");
const backyardResetBtn = $("backyardResetBtn");
const backyardSaveBtn = $("backyardSaveBtn");
const backyardStripEl = $("backyardStrip");

// ====== Konstanten & Zustand ==============================================
const THEME_KEY = "lunyad-theme-light";
const BACKYARD_KEY = "lunyad-backyard";
const BEACON_POLL_MS = 2000;
const TOLERANCE_KM = 0.01; // Toleranz beim Rundenziel
const CHART_MIN_ROUNDS = 15; // X-Achse des Rundenzeit-Diagramms
let roundDistanceKm = 0.5; // Rundenlänge (oben einstellbar)

let panelCount = 4;
const primaryUrls = Array.from({ length: 8 }, () => "");
let isStravaStatsEnabled = true;
let isLightTheme = false;
const beaconPollers = new Map();

let backyardEnabled = false;
let backyardStartMs = null;
let backyardRoundMs = 60 * 60 * 1000;
let backyardCurrentRound = 0;
let backyardFrozen = false;
let backyardTimer = null;
const participants = new Map(); // panel -> Renndaten

// ====== Kleine Helfer =====================================================
function setText(root, sel, value) {
  const e = root.querySelector(sel);
  if (e) e.textContent = value;
}
function setAvatar(img, src) {
  if (!img) return;
  if (src) {
    img.src = src;
    img.hidden = false;
  } else {
    img.removeAttribute("src");
    img.hidden = true;
  }
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}
function webviewUrl(w) {
  try {
    return typeof w.getURL === "function" ? w.getURL() : w.src || "";
  } catch {
    return w.src || "";
  }
}

// ====== Formatierung / Parsing ============================================
function normalizeUrl(raw) {
  const v = (raw || "").trim();
  if (!v) return "";
  return /^https?:\/\//.test(v) ? v : `https://${v}`;
}
function parseDistanceKm(text) {
  if (typeof text !== "string") return null;
  const m = text.replace(/\s/g, "").match(/([\d.,]+)\s*km/i);
  if (!m) return null;
  const value = Number.parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}
function parseMovingTimeSeconds(text) {
  if (typeof text !== "string") return null;
  const p = text.trim().split(":").map((x) => Number.parseInt(x, 10));
  if (p.length < 2 || p.some((n) => !Number.isFinite(n))) return null;
  return p.length === 2 ? p[0] * 60 + p[1] : p[0] * 3600 + p[1] * 60 + p[2];
}
function formatKmDe(km) {
  return `${km.toFixed(1).replace(".", ",")} km`;
}
function formatDistanceLabel(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : formatKmDe(km);
}
function formatDuration(seconds) {
  const t = Math.max(0, Math.floor(seconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
function formatPaceMinKm(seconds, km) {
  if (km < 0.01 || seconds <= 0) return "—";
  const spk = seconds / km;
  return `${Math.floor(spk / 60)}:${String(Math.round(spk % 60)).padStart(2, "0")} /km`;
}
function formatClock(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function formatCountdown(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
function parseBackyardStart(value) {
  if (!value) return null;
  const p = value.split(":").map((x) => Number.parseInt(x, 10));
  if (p.length < 2 || p.some((n) => !Number.isFinite(n))) return null;
  const d = new Date();
  d.setHours(p[0], p[1], p[2] || 0, 0);
  return d.getTime();
}

// ====== Theme / Live Mode / Stats =========================================
function applyTheme() {
  document.documentElement.classList.toggle("theme-light", isLightTheme);
  themeToggleBtn.textContent = isLightTheme ? "Hellmodus: An" : "Hellmodus: Aus";
  themeToggleBtn.classList.toggle("toggle-active", isLightTheme);
  window.desktopApi?.setChromeBackground?.(isLightTheme ? "#f0f2f7" : "#0f1115");
  try {
    localStorage.setItem(THEME_KEY, isLightTheme ? "1" : "0");
  } catch {}
}
function enterLiveMode() {
  document.body.classList.add("live");
  window.desktopApi?.setFullscreen?.(true);
}
function exitLiveMode() {
  document.body.classList.remove("live");
  window.desktopApi?.setFullscreen?.(false);
}
function syncStravaStats() {
  document.querySelectorAll(".beacon-panel").forEach((p) =>
    p.classList.toggle("beacon-panel--stats-hidden", !isStravaStatsEnabled)
  );
  stravaStatsBtn.textContent = isStravaStatsEnabled ? "Strava Stats: An" : "Strava Stats: Aus";
  stravaStatsBtn.classList.toggle("toggle-active", isStravaStatsEnabled);
}

// ====== Runden-Tracking ohne Backyard (Pause/Neustart) ====================
function getRoundState(panel) {
  if (!panel._roundState) {
    panel._roundState = {
      roundNumber: 1,
      roundStartKm: null,
      roundStartMovingSec: null,
      roundComplete: false,
      prevActivityKind: "unknown",
      activityStarted: false,
      completedRounds: []
    };
  }
  return panel._roundState;
}
function classifyActivityState(state) {
  const t = (state || "").toLowerCase();
  if (/beendet|ended|abgeschlossen|finished|ist beendet/.test(t)) return "ended";
  if (/pause|pausiert|angehalten|gestoppt|stopped|halt|unterbrochen/.test(t)) return "paused";
  if (/aufgezeichnet|recording|läuft|active|gestartet/.test(t)) return "recording";
  return "unknown";
}
function archiveCompletedRound(s, totalKm, totalSec) {
  if (!s.roundComplete || s.completedRounds.some((r) => r.round === s.roundNumber)) return;
  const distanceKm =
    totalKm != null ? Math.max(0, Math.min(roundDistanceKm, totalKm - (s.roundStartKm ?? 0))) : roundDistanceKm;
  const durationSec = totalSec != null ? Math.max(0, totalSec - (s.roundStartMovingSec ?? 0)) : 0;
  if (distanceKm < 0.05 && durationSec < 5) return;
  s.completedRounds.push({
    round: s.roundNumber,
    durationSec,
    distanceKm,
    paceLabel: formatPaceMinKm(durationSec, distanceKm)
  });
}
function renderRoundHistory(panel, rounds) {
  const list = panel.querySelector(".beacon-panel__round-history");
  if (!list) return;
  const visible = rounds.slice(-2);
  list.hidden = visible.length === 0;
  list.innerHTML = visible
    .map(
      (r) =>
        `<li class="beacon-round-history__item"><span class="beacon-round-history__round">Runde ${r.round}</span><span class="beacon-round-history__time">${formatDuration(r.durationSec)}</span><span class="beacon-round-history__pace">${r.paceLabel}</span></li>`
    )
    .join("");
}
function updateRoundTracking(panel, data) {
  if (backyardEnabled) {
    renderBackyardPanel(panel);
    return;
  }
  const bar = panel.querySelector(".beacon-panel__round-bar");
  const block = panel.querySelector(".beacon-panel__round");
  if (!bar || !block) return;

  const s = getRoundState(panel);
  const totalKm = parseDistanceKm(data.distance);
  const totalSec = parseMovingTimeSeconds(data.movingTime);
  const kind = classifyActivityState(data.activityState);

  if (kind === "recording") s.activityStarted = true;
  if (s.activityStarted) {
    if (s.roundStartKm == null && totalKm != null) s.roundStartKm = totalKm;
    if (s.roundStartMovingSec == null && totalSec != null) s.roundStartMovingSec = totalSec;
  }

  const distRound = totalKm != null ? Math.max(0, totalKm - (s.roundStartKm ?? 0)) : 0;
  if (distRound >= roundDistanceKm) s.roundComplete = true;

  if (s.prevActivityKind === "recording" && kind === "paused" && s.roundComplete) {
    archiveCompletedRound(s, totalKm, totalSec);
  }
  if ((s.prevActivityKind === "paused" || s.prevActivityKind === "ended") && kind === "recording" && s.roundComplete) {
    archiveCompletedRound(s, totalKm, totalSec);
    s.roundNumber += 1;
    if (totalKm != null) s.roundStartKm = totalKm;
    if (totalSec != null) s.roundStartMovingSec = totalSec;
    s.roundComplete = false;
  }
  s.prevActivityKind = kind;

  const roundSec = totalSec != null ? Math.max(0, totalSec - (s.roundStartMovingSec ?? 0)) : 0;
  const pct = Math.round(Math.min(distRound / roundDistanceKm, 1) * 100);
  setText(panel, ".beacon-panel__round-number", String(s.roundNumber));
  bar.style.width = `${pct}%`;
  setText(panel, ".beacon-panel__round-pct", `${pct} %`);
  setText(panel, "[data-round-time]", formatDuration(roundSec));
  setText(panel, "[data-round-dist]", formatKmDe(distRound));
  setText(panel, "[data-round-pace]", formatPaceMinKm(roundSec, distRound));
  setText(
    panel,
    "[data-overall-pace]",
    totalKm != null && totalKm > 0.01 && totalSec != null ? formatPaceMinKm(totalSec, totalKm) : "—"
  );
  block.classList.toggle("beacon-panel__round--complete", s.roundComplete);
  setText(
    panel,
    ".beacon-panel__round-remaining",
    s.roundComplete ? "Runde geschafft – Neustart für nächste Runde" : `Noch ${formatKmDe(Math.max(0, roundDistanceKm - distRound))}`
  );
  renderRoundHistory(panel, s.completedRounds);
}

// ====== Backyard: Teilnehmerdaten =========================================
function getParticipant(panel) {
  let e = participants.get(panel);
  if (!e) {
    e = {
      name: "",
      avatarSrc: "",
      totalKm: null,
      movingSec: null,
      baselineKm: null,
      finished: false,
      finishSec: null,
      finishKm: null,
      eliminated: false,
      eliminatedRound: null,
      roundsCompleted: 0,
      reachedKm: 0,
      sessionKm: 0,
      sessionSec: 0,
      enduredSec: 0,
      roundTimes: []
    };
    participants.set(panel, e);
  }
  return e;
}
function backyardOnData(panel, data) {
  if (!backyardEnabled) return;
  const e = getParticipant(panel);
  if (data.name) e.name = data.name;
  if (data.avatarSrc) e.avatarSrc = data.avatarSrc;
  const totalKm = parseDistanceKm(data.distance);
  if (totalKm != null) {
    e.totalKm = totalKm;
    // Baseline beim ersten Sehen, oder wenn die Distanz fällt (neue Aktivität).
    if (e.baselineKm == null || totalKm < e.baselineKm) e.baselineKm = totalKm;
  }
  const movingSec = parseMovingTimeSeconds(data.movingTime);
  if (movingSec != null) e.movingSec = movingSec;
}
function progressKm(e) {
  return e.totalKm == null || e.baselineKm == null ? 0 : Math.max(0, e.totalKm - e.baselineKm);
}
function roundStartMs() {
  return backyardStartMs == null || backyardCurrentRound < 1
    ? null
    : backyardStartMs + (backyardCurrentRound - 1) * backyardRoundMs;
}
function activeCount() {
  let n = 0;
  participants.forEach((e) => !e.eliminated && (n += 1));
  return n;
}

/** Rundenwechsel: nicht fertige Läufer ausscheiden, danach Baselines neu setzen. */
function handleRoundChange(round) {
  if (backyardCurrentRound >= 1) {
    participants.forEach((e) => {
      if (e.eliminated || e.finished) return;
      e.eliminated = true;
      e.eliminatedRound = backyardCurrentRound;
      e.roundsCompleted = backyardCurrentRound - 1;
      e.reachedKm = progressKm(e);
      e.sessionKm = e.totalKm ?? 0;
      e.sessionSec = e.movingSec ?? 0;
      e.enduredSec =
        backyardStartMs != null
          ? Math.max(0, (Date.now() - backyardStartMs) / 1000)
          : backyardCurrentRound * (backyardRoundMs / 1000);
    });
  }
  backyardCurrentRound = round;
  participants.forEach((e) => {
    if (e.eliminated) return;
    e.baselineKm = e.totalKm;
    e.finished = false;
    e.finishSec = null;
    e.finishKm = null;
  });
}

// ====== Backyard: Panel-Anzeige ===========================================
function renderRoundChart(panel, e) {
  const host = panel.querySelector("[data-round-chart]");
  if (!host) return;
  const W = 150, H = 46, pad = 4, innerW = W - 2 * pad, innerH = H - 2 * pad;
  const times = e.roundTimes;
  const xMax = Math.max(CHART_MIN_ROUNDS, backyardCurrentRound || 0, ...times.map((r) => r.round));
  const maxSec = Math.max(1, ...times.map((r) => r.sec));
  const points = times
    .slice()
    .sort((a, b) => a.round - b.round)
    .map((r) => ({
      x: pad + (xMax <= 1 ? 0 : ((r.round - 1) / (xMax - 1)) * innerW),
      y: pad + innerH - (r.sec / maxSec) * innerH
    }));
  const poly =
    points.length >= 2
      ? `<polyline fill="none" stroke="#fc5200" stroke-width="2" stroke-linejoin="round" points="${points
          .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(" ")}"/>`
      : "";
  const dots = points
    .map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.2" fill="#fc5200"/>`)
    .join("");
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="none" role="img" aria-label="Rundenzeiten"><line x1="${pad}" y1="${pad + innerH}" x2="${W - pad}" y2="${pad + innerH}" stroke="currentColor" stroke-width="1" opacity="0.35"/><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${pad + innerH}" stroke="currentColor" stroke-width="1" opacity="0.35"/>${poly}${dots}</svg>`;
}

function renderEliminatedOverlay(panel, e) {
  const o = panel.querySelector(".beacon-panel__eliminated");
  if (!o) return;
  setAvatar(o.querySelector(".beacon-panel__elim-avatar"), e.avatarSrc);
  setText(o, ".beacon-panel__elim-name", e.name || "—");
  setText(o, "[data-elim-completed]", String(e.roundsCompleted ?? 0));
  setText(o, "[data-elim-reached]", formatDistanceLabel(e.reachedKm ?? 0));
  setText(o, "[data-elim-round]", e.eliminatedRound != null ? String(e.eliminatedRound) : "—");
  setText(o, "[data-elim-pace]", formatPaceMinKm(e.sessionSec ?? 0, e.sessionKm ?? 0));
  setText(o, "[data-elim-total]", formatDistanceLabel(e.sessionKm ?? 0));
  setText(o, "[data-elim-endured]", formatDuration(e.enduredSec ?? 0));
}

/**
 * Backyard: Der Timer ist eine echte Sekundenuhr ab Rundenstart (unabhängig
 * von Strava). Er friert ein, sobald das Streckenziel erreicht ist. Distanz
 * kommt aus dem Poll, die Sekundenanzeige aus dem 1-s-Tick.
 */
function renderBackyardPanel(panel) {
  const e = getParticipant(panel);
  const bar = panel.querySelector(".beacon-panel__round-bar");
  const block = panel.querySelector(".beacon-panel__round");
  if (!bar || !block) return;

  panel.classList.toggle("beacon-panel--eliminated", e.eliminated);
  if (e.eliminated) renderEliminatedOverlay(panel, e);
  renderRoundChart(panel, e);

  const started = backyardCurrentRound >= 1;
  const startMs = roundStartMs();
  const live = started && e.totalKm != null && e.baselineKm != null ? Math.max(0, e.totalKm - e.baselineKm) : 0;

  if (started && !e.finished && live >= roundDistanceKm - TOLERANCE_KM) {
    e.finished = true;
    e.finishSec = startMs != null ? Math.max(0, (Date.now() - startMs) / 1000) : 0;
    e.finishKm = live;
    if (!e.roundTimes.some((r) => r.round === backyardCurrentRound)) {
      e.roundTimes.push({ round: backyardCurrentRound, sec: e.finishSec });
    }
  }

  const roundSec = !started ? 0 : e.finished ? e.finishSec : startMs != null ? Math.max(0, (Date.now() - startMs) / 1000) : 0;
  const dist = e.finished ? e.finishKm : live;
  const pct = Math.round(Math.min(dist / roundDistanceKm, 1) * 100);
  const pace = formatPaceMinKm(roundSec, dist);

  setText(panel, ".beacon-panel__round-number", String(started ? backyardCurrentRound : 1));
  bar.style.width = `${pct}%`;
  setText(panel, ".beacon-panel__round-pct", `${pct} %`);
  setText(panel, "[data-round-time]", formatDuration(roundSec));
  setText(panel, "[data-round-dist]", formatKmDe(dist));
  setText(panel, "[data-round-pace]", pace);
  setText(panel, "[data-overall-pace]", pace);

  block.classList.toggle("beacon-panel__round--complete", e.finished);
  setText(
    panel,
    ".beacon-panel__round-remaining",
    e.finished ? `Runde geschafft in ${formatDuration(roundSec)}` : `Noch ${formatKmDe(Math.max(0, roundDistanceKm - dist))}`
  );
}

// ====== Backyard: Info-Streifen ===========================================
function statusOf(e) {
  if (e.eliminated) return { key: "out", label: "Raus" };
  if (backyardCurrentRound < 1) return { key: "ready", label: "Bereit" };
  if (e.finished) return { key: "done", label: "Im Ziel" };
  return { key: "run", label: "Läuft" };
}
function chipTime(e, key) {
  if (key === "done") return formatDuration(e.finishSec ?? 0);
  if (key === "out") return formatDuration(e.enduredSec ?? 0);
  if (key === "run") {
    const s = roundStartMs();
    return s != null ? formatDuration(Math.max(0, (Date.now() - s) / 1000)) : "0:00";
  }
  return "0:00";
}
function renderRunners() {
  const host = backyardStripEl.querySelector("[data-by-runners]");
  if (!host) return;
  host.innerHTML = [...participants.values()]
    .map((e) => {
      const progress = progressKm(e);
      const pct = Math.max(0, Math.min(progress / roundDistanceKm, 1)) * 100;
      const cls = e.eliminated ? " backyard-runner--out" : progress >= roundDistanceKm - TOLERANCE_KM ? " backyard-runner--done" : "";
      const av = e.avatarSrc
        ? `<img class="backyard-runner__avatar" src="${escapeHtml(e.avatarSrc)}" alt="">`
        : `<span class="backyard-runner__avatar backyard-runner__avatar--placeholder">${escapeHtml((e.name || "?").charAt(0).toUpperCase())}</span>`;
      return `<div class="backyard-runner${cls}" style="left:${pct}%" title="${escapeHtml(`${e.name || "—"} · ${formatDistanceLabel(progress)}`)}">${av}</div>`;
    })
    .join("");
}
function renderParticipants() {
  const chipsHost = backyardStripEl.querySelector("[data-by-participants]");
  const summaryHost = backyardStripEl.querySelector("[data-by-summary]");
  if (!chipsHost) return;
  if (!participants.size) {
    chipsHost.innerHTML = '<span class="backyard-parts__empty">Keine Beacon-Läufer geladen</span>';
    if (summaryHost) summaryHost.innerHTML = "";
    return;
  }
  const count = { done: 0, run: 0, out: 0 };
  const chips = [...participants.values()].map((e) => {
    const st = statusOf(e);
    if (count[st.key] != null) count[st.key] += 1;
    const name = e.name || "—";
    const av = e.avatarSrc
      ? `<img class="backyard-chip__avatar" src="${escapeHtml(e.avatarSrc)}" alt="">`
      : `<span class="backyard-chip__avatar backyard-chip__avatar--ph">${escapeHtml(name.charAt(0).toUpperCase())}</span>`;
    return `<div class="backyard-chip backyard-chip--${st.key}" title="${escapeHtml(`${name} · ${st.label}`)}">${av}<span class="backyard-chip__text"><span class="backyard-chip__name">${escapeHtml(name)}</span><span class="backyard-chip__time">${escapeHtml(st.label)} · ${chipTime(e, st.key)}</span></span></div>`;
  });
  if (summaryHost) {
    summaryHost.innerHTML =
      `<span class="bp-pill bp-pill--done">Im Ziel ${count.done}</span>` +
      `<span class="bp-pill bp-pill--run">Läuft ${count.run}</span>` +
      `<span class="bp-pill bp-pill--out">Raus ${count.out}</span>`;
  }
  chipsHost.innerHTML = chips.join("");
}
function renderInfo(now) {
  setText(backyardStripEl, "[data-by-end]", formatDistanceLabel(roundDistanceKm));
  setText(backyardStripEl, "[data-by-clock]", formatClock(now));

  const nowMs = now.getTime();
  let round, remaining, label;
  if (backyardFrozen) {
    round = `Runde ${backyardCurrentRound}`;
    remaining = "00:00";
    label = "Rennen beendet";
  } else if (backyardStartMs == null) {
    round = "Bereit";
    remaining = "00:00";
    label = "Timer gestoppt";
  } else if (nowMs < backyardStartMs) {
    round = "Vor dem Start";
    remaining = formatCountdown(backyardStartMs - nowMs);
    label = "bis Start";
  } else {
    round = `Runde ${backyardCurrentRound}`;
    remaining = formatCountdown(backyardStartMs + backyardCurrentRound * backyardRoundMs - nowMs);
    label = "bis alle am Start";
  }
  setText(backyardStripEl, "[data-by-round]", round);
  setText(backyardStripEl, "[data-by-remaining]", remaining);
  setText(backyardStripEl, "[data-by-remaining-label]", label);
  renderParticipants();
}

// ====== Backyard: Timer & Steuerung =======================================
function backyardTick() {
  if (!backyardEnabled) return;
  const now = new Date();
  if (participants.size > 0 && activeCount() === 0) backyardFrozen = true; // alle raus -> einfrieren
  if (!backyardFrozen) {
    let round = 0;
    if (backyardStartMs != null && now.getTime() >= backyardStartMs) {
      round = Math.floor((now.getTime() - backyardStartMs) / backyardRoundMs) + 1;
    }
    if (round !== backyardCurrentRound) handleRoundChange(round);
  }
  participants.forEach((e, panel) => panel?.isConnected && renderBackyardPanel(panel));
  renderRunners();
  renderInfo(now);
}
function applyRoundDistanceFromInput() {
  const d = Number.parseFloat(backyardRoundDistInput.value);
  if (Number.isFinite(d) && d > 0) roundDistanceKm = d;
}
function saveBackyardConfig() {
  try {
    localStorage.setItem(
      BACKYARD_KEY,
      JSON.stringify({
        enabled: backyardEnabled,
        start: backyardStartInput.value,
        roundMin: backyardRoundMinInput.value,
        roundDist: backyardRoundDistInput.value
      })
    );
  } catch {}
}
function syncBackyardToggle() {
  backyardToggleBtn.textContent = backyardEnabled ? "Backyard: An" : "Backyard: Aus";
  backyardToggleBtn.classList.toggle("toggle-active", backyardEnabled);
}
function resetParticipantState(e) {
  Object.assign(e, {
    baselineKm: e.totalKm,
    finished: false,
    finishSec: null,
    finishKm: null,
    eliminated: false,
    eliminatedRound: null,
    roundsCompleted: 0,
    reachedKm: 0,
    sessionKm: 0,
    sessionSec: 0,
    enduredSec: 0,
    roundTimes: []
  });
}
function resetAllParticipants() {
  participants.forEach((e, panel) => {
    resetParticipantState(e);
    if (panel?.isConnected) panel.classList.remove("beacon-panel--eliminated");
  });
}
function applyBackyardConfig() {
  const roundMin = Number.parseFloat(backyardRoundMinInput.value);
  backyardRoundMs = Number.isFinite(roundMin) && roundMin > 0 ? roundMin * 60 * 1000 : 60 * 60 * 1000;
  applyRoundDistanceFromInput();
  backyardStartMs = parseBackyardStart(backyardStartInput.value);
  backyardCurrentRound = 0;
  backyardFrozen = false;
  resetAllParticipants();
}
/** "Werte übernehmen": Konfiguration anwenden und Timer (neu) starten. */
function saveBackyard() {
  if (parseBackyardStart(backyardStartInput.value) == null) {
    backyardStartInput.focus();
    return;
  }
  applyBackyardConfig();
  backyardEnabled = true;
  backyardStripEl.hidden = false;
  syncBackyardToggle();
  clearInterval(backyardTimer);
  backyardTimer = setInterval(backyardTick, 1000);
  backyardTick();
  saveBackyardConfig();
}
function toggleBackyard() {
  if (backyardEnabled) {
    backyardEnabled = false;
    clearInterval(backyardTimer);
    backyardTimer = null;
    backyardStripEl.hidden = true;
    syncBackyardToggle();
    saveBackyardConfig();
  } else {
    saveBackyard();
  }
}
/** Reset: Runden auf 0, Timer gestoppt, Ausscheidungen/Zeiten/Diagramme weg. */
function resetBackyard() {
  backyardStartMs = null;
  backyardCurrentRound = 0;
  backyardFrozen = false;
  resetAllParticipants();
  if (backyardEnabled) backyardTick();
}

// ====== Strava-Beacon: Webview + Scraping =================================
function isStravaBeaconUrl(href) {
  try {
    const u = new URL(href);
    if (!u.hostname.toLowerCase().includes("strava.com")) return false;
    return `${u.pathname}${u.search}${u.hash}`.toLowerCase().includes("beacon");
  } catch {
    return false;
  }
}
function buildBeaconScrapeScript() {
  return `(function(){
    function t(s){var e=document.querySelector(s);return e?(e.innerText||e.textContent||"").trim():"";}
    function findActivityBanner(){
      var picks=[".activity-ended-banner",".beacon-ended-banner","#beacon-banner",".map-overlay-banner",".beacon-alert",".alert-banner",".alert"];
      for(var i=0;i<picks.length;i++){
        var el=document.querySelector(picks[i]);if(!el)continue;
        var cs=window.getComputedStyle(el);
        if(cs.display==="none"||cs.visibility==="hidden"||el.offsetHeight<16)continue;
        if(el.closest("#beacon-stats-area"))continue;
        var tx=(el.innerText||"").trim();if(tx.length>4&&tx.length<800)return tx;
      }
      return"";
    }
    var img=document.querySelector("img.avatar-img");
    return JSON.stringify({
      avatarSrc:img?img.src:"",name:t("p.avatar-primary"),lastUpdated:t("#last-updated"),
      activityState:t("#activity-state"),distance:t("#stat-distance"),movingTime:t("#stat-moving-time"),
      battery:t("#stat-battery-level"),bannerText:findActivityBanner()
    });
  })();`;
}
/** Nur die Karte sichtbar lassen (DOM bleibt fürs Scraping erhalten). */
function buildMapFocusStyleScript() {
  return `(function(){
    var id="lunyad-map-focus",el=document.getElementById(id);
    if(!el){el=document.createElement("style");el.id=id;(document.head||document.documentElement).appendChild(el);}
    el.textContent=["html,body{margin:0!important;overflow:hidden!important;background:#e8eaef!important;height:100%!important;}","body *{visibility:hidden!important;pointer-events:none!important;}","#map-canvas,#map-canvas *{visibility:visible!important;pointer-events:auto!important;}","#map-canvas{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;z-index:1!important;}"].join("");
  })();`;
}
function scheduleMapFocusInject(webview) {
  if (!webview) return;
  clearTimeout(webview._mapFocusTimer);
  webview._mapFocusTimer = setTimeout(() => {
    webview._mapFocusTimer = null;
    if (isStravaBeaconUrl(webviewUrl(webview))) {
      webview.executeJavaScript(buildMapFocusStyleScript()).catch(() => {});
    }
  }, 300);
}
function attachBeaconWebviewHandlers(webview, panel) {
  const onReady = () => {
    const loading = panel.querySelector(".beacon-panel__map-loading");
    if (loading) loading.hidden = true;
    scheduleMapFocusInject(webview);
    if (!webview._beaconPollStarted) {
      webview._beaconPollStarted = true;
      startBeaconPoller(webview, panel);
    }
  };
  webview.addEventListener("dom-ready", onReady);
  webview.addEventListener("did-finish-load", onReady);
  webview.addEventListener("did-navigate", () => scheduleMapFocusInject(webview));
  webview.addEventListener("did-navigate-in-page", () => scheduleMapFocusInject(webview));
}
function stopAllBeaconPollers() {
  beaconPollers.forEach((id) => clearInterval(id));
  beaconPollers.clear();
}
async function pollBeaconPanel(webview, panel) {
  if (!webview || !panel.isConnected || !isStravaBeaconUrl(webviewUrl(webview))) return;
  try {
    const json = await webview.executeJavaScript(buildBeaconScrapeScript());
    if (typeof json === "string" && json) updateBeaconPanel(panel, JSON.parse(json));
  } catch {
    /* Gastkontext noch nicht bereit */
  }
}
function startBeaconPoller(webview, panel) {
  const key = Symbol("beacon-poll");
  webview._beaconPollKey = key;
  pollBeaconPanel(webview, panel);
  beaconPollers.set(key, setInterval(() => pollBeaconPanel(webview, panel), BEACON_POLL_MS));
}
function updateBeaconPanel(panel, data) {
  if (!data || !panel.querySelector(".beacon-panel__name")) return;
  setAvatar(panel.querySelector(".beacon-panel__avatar"), data.avatarSrc);
  setText(panel, ".beacon-panel__name", data.name || "—");
  setText(panel, ".beacon-panel__updated", data.lastUpdated || "—");
  setText(panel, ".beacon-panel__state", data.activityState || "—");
  setText(panel, '[data-stat="distance"]', data.distance || "—");
  setText(panel, '[data-stat="moving-time"]', data.movingTime || "—");
  setText(panel, '[data-stat="battery"]', data.battery || "—");
  const banner = panel.querySelector(".beacon-panel__banner");
  const msg = (data.bannerText || "").trim();
  setText(panel, ".beacon-panel__banner-text", msg);
  if (banner) banner.hidden = !msg;
  backyardOnData(panel, data);
  updateRoundTracking(panel, data);
}

// ====== Raster aufbauen ===================================================
function beaconPanelTemplate() {
  return `
    <header class="beacon-panel__header">
      <img class="beacon-panel__avatar" alt="" hidden />
      <div class="beacon-panel__head-text">
        <h2 class="beacon-panel__name">—</h2>
        <p class="beacon-panel__updated">—</p>
      </div>
      <div class="beacon-panel__chart" data-round-chart title="Rundenzeit je Runde"></div>
    </header>
    <div class="beacon-panel__map-host">
      <div class="beacon-panel__lap">
        <div class="beacon-panel__round">
          <div class="beacon-panel__round-head">
            <span class="beacon-panel__round-label">Runde</span>
            <span class="beacon-panel__round-number">1</span>
          </div>
          <div class="beacon-panel__round-track"><div class="beacon-panel__round-bar"></div></div>
          <div class="beacon-panel__round-meta">
            <span class="beacon-panel__round-pct">0 %</span>
            <span class="beacon-panel__round-remaining">Noch ${formatKmDe(roundDistanceKm)}</span>
          </div>
          <div class="beacon-panel__pace-row">
            <span data-round-time>0:00</span><span data-round-dist>0,0 km</span><span data-round-pace>—</span>
          </div>
        </div>
        <div class="beacon-panel__lap-history-wrap"><ul class="beacon-panel__round-history" hidden></ul></div>
      </div>
      <div class="beacon-panel__hud">
        <p class="beacon-panel__state">—</p>
        <div class="beacon-panel__hud-stats">
          <div class="beacon-stat beacon-stat--compact"><span class="beacon-stat__value" data-stat="distance">—</span><span class="beacon-stat__label">Distanz</span></div>
          <div class="beacon-stat beacon-stat--compact"><span class="beacon-stat__value" data-stat="moving-time">—</span><span class="beacon-stat__label">Aktive Zeit</span></div>
          <div class="beacon-stat beacon-stat--compact"><span class="beacon-stat__value" data-stat="battery">—</span><span class="beacon-stat__label">Akku</span></div>
        </div>
        <div class="beacon-panel__hud-overall"><span class="beacon-stat__label">Gesamt-Pace</span><span class="beacon-stat__value" data-overall-pace>—</span></div>
      </div>
      <div class="beacon-panel__banner" hidden><p class="beacon-panel__banner-text"></p></div>
      <div class="beacon-panel__eliminated" aria-hidden="true">
        <div class="beacon-panel__elim-card">
          <img class="beacon-panel__elim-avatar" alt="" hidden />
          <p class="beacon-panel__elim-name">—</p>
          <p class="beacon-panel__elim-badge">Ausgeschieden</p>
          <div class="beacon-panel__elim-stats">
            <div class="beacon-stat"><span class="beacon-stat__value" data-elim-completed>0</span><span class="beacon-stat__label">Runden geschafft</span></div>
            <div class="beacon-stat"><span class="beacon-stat__value" data-elim-reached>0 m</span><span class="beacon-stat__label">Letzte Runde</span></div>
            <div class="beacon-stat"><span class="beacon-stat__value" data-elim-round>—</span><span class="beacon-stat__label">Raus in Runde</span></div>
            <div class="beacon-stat"><span class="beacon-stat__value" data-elim-pace>—</span><span class="beacon-stat__label">Pace</span></div>
            <div class="beacon-stat"><span class="beacon-stat__value" data-elim-total>0 m</span><span class="beacon-stat__label">Gesamt-Strecke</span></div>
            <div class="beacon-stat"><span class="beacon-stat__value" data-elim-endured>0:00</span><span class="beacon-stat__label">Durchgehalten</span></div>
          </div>
        </div>
      </div>
      <div class="beacon-panel__map-loading">Karte wird geladen…</div>
    </div>`;
}
function createBeaconPanel(parent, url) {
  const panel = document.createElement("div");
  panel.className = "beacon-panel" + (isStravaStatsEnabled ? "" : " beacon-panel--stats-hidden");
  panel.innerHTML = beaconPanelTemplate();
  const mapView = document.createElement("webview");
  mapView.className = "beacon-panel__map-webview";
  mapView.src = url;
  mapView.allowpopups = false;
  panel.querySelector(".beacon-panel__map-host").appendChild(mapView);
  attachBeaconWebviewHandlers(mapView, panel);
  parent.appendChild(panel);
}
function appendPlainWebview(parent, url) {
  const view = document.createElement("webview");
  view.src = url;
  view.allowpopups = false;
  parent.appendChild(view);
}
function calcColumns(count) {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}
function renderUrlInputs() {
  urlInputsContainer.innerHTML = "";
  for (let i = 0; i < panelCount; i += 1) {
    const group = document.createElement("div");
    group.className = "input-group";
    const input = document.createElement("input");
    input.className = "url-input";
    input.type = "text";
    input.placeholder = `Haupt-Link für Feld ${i + 1}`;
    input.value = primaryUrls[i] || "";
    input.addEventListener("change", () => {
      primaryUrls[i] = input.value;
      renderGrid();
    });
    group.appendChild(input);
    urlInputsContainer.appendChild(group);
  }
}
function renderGrid() {
  stopAllBeaconPollers();
  participants.clear();
  const cols = calcColumns(panelCount);
  gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gridEl.style.gridTemplateRows = `repeat(${Math.ceil(panelCount / cols)}, 1fr)`;
  gridEl.innerHTML = "";
  for (let i = 0; i < panelCount; i += 1) {
    const tile = document.createElement("div");
    tile.className = "tile";
    const url = normalizeUrl(primaryUrls[i] || "");
    if (!url) {
      tile.innerHTML = '<div class="tile-empty">Noch kein Link eingetragen</div>';
    } else if (isStravaBeaconUrl(url)) {
      createBeaconPanel(tile, url);
    } else {
      appendPlainWebview(tile, url);
    }
    gridEl.appendChild(tile);
  }
}
function updatePanelCount() {
  const next = Number(panelCountSelect.value);
  if (next < 1 || next > 8) return;
  panelCount = next;
  renderUrlInputs();
  renderGrid();
}

// ====== Events & Init =====================================================
updateGridBtn.addEventListener("click", updatePanelCount);
stravaStatsBtn.addEventListener("click", () => {
  isStravaStatsEnabled = !isStravaStatsEnabled;
  syncStravaStats();
});
liveModeBtn.addEventListener("click", enterLiveMode);
themeToggleBtn.addEventListener("click", () => {
  isLightTheme = !isLightTheme;
  applyTheme();
});
backyardSaveBtn.addEventListener("click", saveBackyard);
backyardToggleBtn.addEventListener("click", toggleBackyard);
backyardResetBtn.addEventListener("click", resetBackyard);
backyardRoundDistInput.addEventListener("change", () => {
  applyRoundDistanceFromInput();
  saveBackyardConfig();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("live")) {
    event.preventDefault();
    exitLiveMode();
  }
});
window.desktopApi?.onGlobalEscape?.(() => {
  if (document.body.classList.contains("live")) exitLiveMode();
});

try {
  isLightTheme = localStorage.getItem(THEME_KEY) === "1";
} catch {}
applyTheme();

try {
  const stored = JSON.parse(localStorage.getItem(BACKYARD_KEY) || "null");
  if (stored && typeof stored === "object") {
    if (stored.start) backyardStartInput.value = stored.start;
    if (stored.roundMin) backyardRoundMinInput.value = stored.roundMin;
    if (stored.roundDist) backyardRoundDistInput.value = stored.roundDist;
  }
} catch {}
applyRoundDistanceFromInput();
syncBackyardToggle();

panelCountSelect.value = String(panelCount);
stravaStatsBtn.classList.toggle("toggle-active", isStravaStatsEnabled);
renderUrlInputs();
renderGrid();
