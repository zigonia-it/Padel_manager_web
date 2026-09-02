(function initializeTvMode(global) {
  "use strict";
  const storageKey = "padelstar-demo";
  const queryKey = "spectate";
  let state = null;
  let remoteConnected = false;
  let messageIndex = 0;
  const footerMessages = [
    "SPILL SMART. SPILL SAMMEN.",
    "HVER BALL TELLER.",
    "NY KAMP. NY MULIGHET.",
    "NESTE KAMP VENTER.",
    "SPILL VIDERE.",
  ];

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  const allMatches = () => (state?.rounds ?? []).flatMap((round) => round.matches ?? []);
  const playersIn = (match, index) => match?.[index === 0 ? "teamOne" : "teamTwo"]?.players ?? [];
  const avatarUrl = (player) => `https://api.dicebear.com/10.x/lorelei-neutral/svg?seed=${encodeURIComponent(`${player.name ?? "Sophie"}-${player.avatarId ?? "smash"}`)}&size=96`;
  const teamNames = (team) => (team?.players ?? []).map((player) => `<span>${escapeHtml(player.name)}</span>`).join("");
  const standingPlayer = (player) => `<span class="tv-standing-player"><img src="${avatarUrl(player)}" alt=""><span class="tv-standing-name">${escapeHtml(player.name)}</span></span>`;
  const score = (match, index) => Number(match?.currentSet?.[index === 0 ? "teamOne" : "teamTwo"] ?? 0);

  function playerStats() {
    const stats = new Map((state?.players ?? []).map((player) => [player.id, { player, matches: 0, wins: 0, points: 0, diff: 0 }]));
    allMatches().filter((match) => match.state === "finished").forEach((match) => {
      for (const index of [0, 1]) for (const player of playersIn(match, index)) {
        const entry = stats.get(player.id); if (!entry) continue;
        entry.matches += 1; entry.wins += Number(match.winnerTeamIndex === index);
        const won = (match.completedSets ?? []).reduce((total, set) => total + Number(index === 0 ? set.teamOne : set.teamTwo), 0);
        const lost = (match.completedSets ?? []).reduce((total, set) => total + Number(index === 0 ? set.teamTwo : set.teamOne), 0);
        entry.points += won; entry.diff += won - lost;
      }
    });
    return [...stats.values()].sort((a, b) => b.wins - a.wins || b.points - a.points || b.diff - a.diff || a.player.name.localeCompare(b.player.name, "nb"));
  }

  function matchCard(match, next = false) {
    return `<article class="tv-match-card${next ? "" : " tv-live-match"}"><h3><span>${escapeHtml(match.courtName ?? "BANE")}</span>${escapeHtml(matchContext(match))}</h3><div class="tv-match-teams"><div class="tv-team">${teamNames(match.teamOne)}</div><strong class="tv-team-score">${next ? "–" : score(match, 0)}</strong><span class="tv-versus">VS</span><strong class="tv-team-score">${next ? "–" : score(match, 1)}</strong><div class="tv-team">${teamNames(match.teamTwo)}</div></div><div class="tv-match-meta"><span class="${next ? "" : "tv-live-label"}">${next ? "◷ Starter snart" : "● PÅGÅR"}</span><span>${escapeHtml(matchContext(match))}</span></div></article>`;
  }

  function matchContext(match) { return `Runde ${match.rotationNumber ?? 1} · Kamp`; }

  function render() {
    if (!state) return;
    const matches = allMatches();
    const live = matches.filter((match) => match.state === "playing");
    const next = matches.filter((match) => match.state === "waiting");
    document.querySelector("#tvTournamentTitle").textContent = String(state.name || "PADELSTAR").toLocaleUpperCase("nb-NO");
    document.querySelector("#tvRoundLabel").textContent = `RUNDE ${state.currentRound || 1}`;
    document.querySelector("#tvLiveMatches").innerHTML = (live.length ? live : next.slice(0, 3)).map((match) => matchCard(match, !live.includes(match))).join("") || `<p>Ingen aktive kamper akkurat nå.</p>`;
    document.querySelector("#tvNextMatches").innerHTML = next.slice(0, 5).map((match) => matchCard(match, true)).join("") || `<p>Ingen kamper i kø.</p>`;
    document.querySelector("#tvStandings").innerHTML = playerStats().map((entry) => `<li class="tv-standing-row">${standingPlayer(entry.player)}<span>${entry.matches}</span><span>${entry.wins}</span><span class="tv-standing-points">${entry.points}</span><span>${entry.diff > 0 ? "+" : ""}${entry.diff}</span></li>`).join("");
    const finished = matches.filter((match) => match.state === "finished").length;
    document.querySelector("#tvProgress").textContent = `RUNDE ${state.currentRound || 1} / ${Math.max((state.rounds ?? []).length, 1)}`;
    document.querySelector("#tvPlayerProgress").textContent = `${finished} / ${matches.length}`;
    document.querySelector("#tvStatus").textContent = state.status === "Avsluttet" ? "FERDIG" : "LIVE";
    const status = document.querySelector(".tv-footer-status");
    const offline = !navigator.onLine || (!remoteConnected && new URLSearchParams(global.location.search).has(queryKey));
    status.classList.toggle("offline", offline);
    document.querySelector("#tvStatus").textContent = offline ? "OFFLINE" : (state.status === "Avsluttet" ? "FERDIG" : "LIVE");
  }

  async function loadRemote() {
    const code = new URLSearchParams(global.location.search).get(queryKey)?.trim().toUpperCase();
    const settings = global.PADELSTAR_SUPABASE;
    if (!code || !settings || !global.supabase?.createClient) { remoteConnected = false; return false; }
    try { const client = global.supabase.createClient(settings.url, settings.anonKey); const { data, error } = await client.rpc("get_spectator_tournament_by_code", { p_invite_code: code }); if (error || !data) { remoteConnected = false; return false; } state = data; remoteConnected = true; return true; } catch { remoteConnected = false; return false; }
  }

  async function start() {
    try { state = JSON.parse(global.localStorage.getItem(storageKey) ?? "null"); } catch { state = null; }
    await loadRemote();
    state ||= { name: "PADELSTAR", currentRound: 1, rounds: [], players: [], status: "Pågår" };
    render(); setInterval(async () => { await loadRemote(); if (!state) { try { state = JSON.parse(global.localStorage.getItem(storageKey) ?? "null"); } catch { /* keep last state */ } } render(); }, 15000);
    setInterval(() => { const now = new Date(); const clock = document.querySelector("#tvClock"); clock.textContent = now.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" }); clock.dateTime = now.toISOString(); }, 1000);
    setInterval(() => { messageIndex = (messageIndex + 1) % footerMessages.length; document.querySelector("#tvMessage").textContent = footerMessages[messageIndex]; }, 60000);
    document.querySelector("#tvExitButton").addEventListener("click", () => { if (global.history.length > 1) global.history.back(); else global.location.href = "index.html"; });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js").catch(() => { });
  }
  global.PadelstarTvMode = { start };
  global.addEventListener("DOMContentLoaded", start, { once: true });
})(window);
