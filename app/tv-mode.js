(function initializeTvMode(global) {
  "use strict";
  const storageKey = "padelstar-demo";
  const queryKey = "spectate";
  let state = null;
  let remoteConnected = false;
  let messageIndex = 0;
  const footerMessageKeys = ["tv.message1", "tv.message2", "tv.message3", "tv.message4", "tv.message5"];
  const supportedLanguages = () => global.PadelstarI18n.productionLanguages().map((entry) => entry.code);

  // The language of the screen: an explicit ?lang=, the choice saved in this browser, then the device language.
  function resolveLanguage(search = global.location?.search ?? "", storage = global.localStorage, navigatorRef = global.navigator) {
    const supported = supportedLanguages();
    const fallback = global.PadelstarI18n.fallbackLanguage;
    const requested = new URLSearchParams(search).get("lang");
    if (supported.includes(requested)) return requested;
    let stored = null;
    try { stored = storage?.getItem("padelstar-language"); } catch { /* storage unavailable */ }
    if (supported.includes(stored)) return stored;
    const device = [...(navigatorRef?.languages ?? []), navigatorRef?.language].filter(Boolean).map((code) => String(code).toLowerCase());
    for (const code of device) {
      const match = supported.find((language) => code === language || code.startsWith(`${language}-`)) ?? (code.startsWith("no") || code.startsWith("nn") ? "nb" : null);
      if (match && supported.includes(match)) return match;
    }
    return fallback;
  }

  let language = "nb";
  const t = (key, values) => global.PadelstarI18n.translate(language, key, values);
  const locale = () => (language === "en" ? "en-GB" : "nb-NO");

  function applyStaticTranslations() {
    document.documentElement.lang = language;
    document.querySelectorAll("[data-tv-i18n]").forEach((node) => {
      let values = {};
      try { values = node.dataset.tvValues ? JSON.parse(node.dataset.tvValues) : {}; } catch { values = {}; }
      node.textContent = t(node.dataset.tvI18n, values);
    });
  }

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  const allMatches = () => (state?.rounds ?? []).flatMap((round) => round.matches ?? []);
  const playersIn = (match, index) => match?.[index === 0 ? "teamOne" : "teamTwo"]?.players ?? [];
  // The same gem avatar as the app (accent colour + initials); no third-party image service.
  const visuals = global.PadelstarPlayerVisuals.create({ accentStyle: global.PadelstarAccentSystem.accentStyle, escapeHtml });
  const teamNames = (team) => (team?.players ?? []).map((player) => `<span>${escapeHtml(player.name)}</span>`).join("");
  const standingPlayer = (player) => `<span class="tv-standing-player">${visuals.avatarMarkup(player, "tv-avatar", 36)}<span class="tv-standing-name">${escapeHtml(player.name)}</span></span>`;
  const score = (match, index) => Number(match?.currentSet?.[index === 0 ? "teamOne" : "teamTwo"] ?? 0);

  // Same ranking as the app (points, head-to-head, wins, sets, game difference, games, name).
  function playerStats() {
    return global.PadelstarScoring.leaderboardEntries(state?.players ?? [], allMatches(), state?.settings?.pointMode ?? "matches").map((entry) => ({
      player: entry.player, matches: entry.matchesPlayed, wins: entry.matchWins, points: entry.gamesWon, diff: entry.gameDifference,
    }));
  }

  function timerLabel(startedAt, minutes, now = Date.now()) {
    const start = Date.parse(startedAt);
    const seconds = Number.isNaN(start) ? minutes * 60 : Math.max(0, Math.ceil((start + minutes * 60000 - now) / 1000));
    return { seconds, text: `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}` };
  }

  function timerHtml(match) {
    if (match.endReason === "timeExpired") return `<span class="tv-timer tv-timer-ended">${t("tv.timeExpired")}</span>`;
    const minutes = match.rules?.timedMinutes ?? 0;
    if (!minutes || match.state !== "playing") return "";
    return `<span class="tv-timer" data-timer-start="${escapeHtml(match.startedAt ?? "")}" data-timer-minutes="${minutes}">${timerLabel(match.startedAt, minutes).text}</span>`;
  }

  function updateTimers() {
    document.querySelectorAll(".tv-timer[data-timer-minutes]").forEach((node) => {
      const { seconds, text } = timerLabel(node.dataset.timerStart, Number(node.dataset.timerMinutes));
      node.textContent = text;
      node.classList.toggle("tv-timer-warning", seconds > 0 && seconds <= 60);
      node.classList.toggle("tv-timer-expired", seconds === 0);
    });
  }

  function matchCard(match, next = false) {
    const awaiting = match.state === "awaitingApproval";
    return `<article class="tv-match-card${next ? "" : " tv-live-match"}"><h3><span>${escapeHtml(match.courtName ?? t("tv.court"))}</span>${escapeHtml(matchContext(match))}</h3><div class="tv-match-teams"><div class="tv-team">${teamNames(match.teamOne)}</div><strong class="tv-team-score">${next ? "–" : score(match, 0)}</strong><span class="tv-versus">${t("tv.versus")}</span><strong class="tv-team-score">${next ? "–" : score(match, 1)}</strong><div class="tv-team">${teamNames(match.teamTwo)}</div></div><div class="tv-match-meta"><span class="${next ? "" : "tv-live-label"}">${next ? t("tv.startingSoon") : awaiting ? t("tv.awaitingApproval") : t("tv.playing")}</span><span>${escapeHtml(matchContext(match))}</span>${timerHtml(match)}</div></article>`;
  }

  function matchContext(match) { return t("tv.matchContext", { round: match.rotationNumber ?? 1 }); }

  const isCup = () => state?.settings?.format === "cup";
  const cupBracket = () => state?.cup?.bracket;
  const matchById = (id) => allMatches().find((match) => match.id === id);

  function cupRoundLabel(round, index, totalRounds) {
    if (totalRounds === 1 || index === totalRounds - 1) return t("tv.final");
    if (index === totalRounds - 2) return t("tv.semifinal");
    if (index === 0) return t("tv.firstRound");
    return t("tv.round", { round: round.roundNumber ?? index + 1 });
  }

  function bracketCardHtml(slot, roundIndex, slotIndex) {
    const position = `data-round="${roundIndex}" data-slot="${slotIndex}"`;
    const match = slot && slot.type !== "pending" ? matchById(slot.matchId) : null;
    if (!match) {
      return `<div class="tv-bracket-card pending" ${position}><div class="tv-bracket-team placeholder">${t("tv.waiting")}</div><div class="tv-bracket-team placeholder">${t("tv.waiting")}</div></div>`;
    }
    const winner = match.winnerTeamIndex === 0 ? match.teamOne : match.winnerTeamIndex === 1 ? match.teamTwo : null;
    const stateClass = match.state === "finished" ? "finished" : match.state === "playing" ? "playing" : "pending";
    return `<div class="tv-bracket-card ${stateClass}" ${position}>
      <div class="tv-bracket-team${winner === match.teamOne ? " winner" : ""}">${escapeHtml(match.teamOne.displayName)}</div>
      <div class="tv-bracket-team${winner === match.teamTwo ? " winner" : ""}">${escapeHtml(match.teamTwo.displayName)}</div>
    </div>`;
  }

  function renderBracketTreeHtml(bracket) {
    return bracket.rounds.map((round, index) => `
      <div class="tv-bracket-col" data-round-index="${index}">
        <div class="tv-bracket-col-label">${cupRoundLabel(round, index, bracket.rounds.length)}</div>
        ${round.slots.map((slot, slotIndex) => bracketCardHtml(slot, index, slotIndex)).join("")}
        ${round.byeTeams?.length ? `<div class="tv-bracket-bye">${t("tv.bye", { teams: round.byeTeams.map((team) => escapeHtml(team.displayName)).join(", ") })}</div>` : ""}
      </div>`).join("");
  }

  function renderBracketExtraHtml(bracket) {
    const thirdRound = bracket.rounds.find((round) => round.thirdPlaceSlot);
    if (!thirdRound?.thirdPlaceSlot) return "";
    return `<div class="tv-bracket-extra-label">${t("tv.thirdPlace")}</div>${bracketCardHtml(thirdRound.thirdPlaceSlot, -1, 0)}`;
  }

  function svgLine(svg, x1, y1, x2, y2) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1); line.setAttribute("y1", y1);
    line.setAttribute("x2", x2); line.setAttribute("y2", y2);
    svg.appendChild(line);
  }

  function drawBracketLines() {
    const svg = document.querySelector("#tvBracketSvg");
    const wrap = document.querySelector(".tv-bracket-tree-wrap");
    const tree = document.querySelector("#tvBracketTree");
    if (!svg || !wrap || !tree) return;
    const wrapRect = wrap.getBoundingClientRect();
    svg.setAttribute("width", Math.max(tree.scrollWidth, wrapRect.width));
    svg.setAttribute("height", Math.max(tree.scrollHeight, wrapRect.height));
    svg.innerHTML = "";
    const columns = [...document.querySelectorAll(".tv-bracket-col")];
    for (let roundIndex = 0; roundIndex < columns.length - 1; roundIndex += 1) {
      const cards = [...columns[roundIndex].querySelectorAll(".tv-bracket-card")];
      const parentCards = [...columns[roundIndex + 1].querySelectorAll(".tv-bracket-card")];
      for (let slotIndex = 0; slotIndex < cards.length; slotIndex += 2) {
        const cardA = cards[slotIndex];
        const cardB = cards[slotIndex + 1];
        const parent = parentCards[Math.floor(slotIndex / 2)];
        if (!cardA || !cardB || !parent) continue;
        const rectA = cardA.getBoundingClientRect();
        const rectB = cardB.getBoundingClientRect();
        const rectP = parent.getBoundingClientRect();
        const ax = rectA.right - wrapRect.left, ay = rectA.top + rectA.height / 2 - wrapRect.top;
        const bx = rectB.right - wrapRect.left, by = rectB.top + rectB.height / 2 - wrapRect.top;
        const px = rectP.left - wrapRect.left, py = rectP.top + rectP.height / 2 - wrapRect.top;
        const midX = Math.max(ax, bx) + (px - Math.max(ax, bx)) / 2;
        const mergeY = (ay + by) / 2;
        svgLine(svg, ax, ay, midX, ay);
        svgLine(svg, bx, by, midX, by);
        svgLine(svg, midX, ay, midX, by);
        svgLine(svg, midX, mergeY, px, py);
      }
    }
  }

  function renderCupPanel() {
    const bracket = cupBracket();
    const winnerTeam = state?.cup?.winnerTeam;
    document.querySelector("#tvCupChampion").classList.toggle("hidden", !winnerTeam);
    if (winnerTeam) document.querySelector("#tvCupChampion").innerHTML = `<span>${t("tv.cupChampion")}</span><strong>${escapeHtml(winnerTeam.displayName)}</strong>`;
    const tree = document.querySelector("#tvBracketTree");
    const extra = document.querySelector("#tvBracketExtra");
    if (!bracket?.rounds?.length) {
      tree.innerHTML = `<p>${t("tv.bracketPending")}</p>`;
      extra.innerHTML = "";
      document.querySelector("#tvBracketSvg").innerHTML = "";
      return;
    }
    tree.innerHTML = renderBracketTreeHtml(bracket);
    extra.innerHTML = renderBracketExtraHtml(bracket);
    drawBracketLines();
  }

  function render() {
    if (!state) return;
    const matches = allMatches();
    const playing = matches.filter((match) => match.state === "playing");
    const awaitingApproval = matches.filter((match) => match.state === "awaitingApproval");
    const live = [...playing, ...awaitingApproval];
    const next = matches.filter((match) => match.state === "waiting");
    document.querySelector("#tvTournamentTitle").textContent = String(state.name || "PADELSTAR").toLocaleUpperCase(locale());
    document.querySelector("#tvRoundLabel").textContent = t("tv.round", { round: state.currentRound || 1 });
    const idle = live.length === 0 && next.length === 0;
    document.querySelector("#tvLiveMatches").innerHTML = (live.length ? live : next.slice(0, 3)).map((match) => matchCard(match, !live.includes(match))).join("") || `<p>${t("tv.noActive")}</p>`;
    document.querySelector("#tvNextMatches").innerHTML = next.slice(0, 5).map((match) => matchCard(match, true)).join("") || `<p>${t("tv.noQueue")}</p>`;
    document.querySelector(".tv-live-panel").classList.toggle("hidden", idle);
    document.querySelector(".tv-next-panel").classList.toggle("hidden", idle);
    document.querySelector(".tv-columns").classList.toggle("tv-idle", idle);
    const cup = isCup();
    document.querySelector("#standingTitle").innerHTML = cup
      ? `<img class="heading-icon" src="assets/icons/trophy-96.png" alt="">${t("tv.cupBracket")}`
      : `<img class="heading-icon" src="assets/icons/trophy-96.png" alt="">${t("tv.standings")}`;
    document.querySelector("#tvStandingsHead").classList.toggle("hidden", cup);
    document.querySelector("#tvStandings").classList.toggle("hidden", cup);
    document.querySelector("#tvCupBracket").classList.toggle("hidden", !cup);
    document.querySelector("#tvStandingPanel").classList.toggle("tv-panel-full", idle);
    if (cup) {
      renderCupPanel();
    } else {
      document.querySelector("#tvStandings").innerHTML = playerStats().map((entry) => `<li class="tv-standing-row">${standingPlayer(entry.player)}<span>${entry.matches}</span><span>${entry.wins}</span><span class="tv-standing-points">${entry.points}</span><span>${entry.diff > 0 ? "+" : ""}${entry.diff}</span></li>`).join("");
    }
    const finished = matches.filter((match) => match.state === "finished").length;
    document.querySelector("#tvProgress").textContent = t("tv.roundOf", { round: state.currentRound || 1, total: Math.max((state.rounds ?? []).length, 1) });
    document.querySelector("#tvPlayerProgress").textContent = `${finished} / ${matches.length}`;
    const status = document.querySelector(".tv-footer-status");
    const offline = !navigator.onLine || (!remoteConnected && new URLSearchParams(global.location.search).has(queryKey));
    status.classList.toggle("offline", offline);
    document.querySelector("#tvStatus").textContent = offline ? t("tv.statusOffline") : (state.status === "Avsluttet" ? t("tv.statusDone") : t("tv.statusLive"));
    updateTimers();
  }

  async function loadRemote() {
    const code = new URLSearchParams(global.location.search).get(queryKey)?.trim().toUpperCase();
    const settings = global.PADELSTAR_SUPABASE;
    if (!code || !settings || !global.supabase?.createClient) { remoteConnected = false; return false; }
    try { const client = global.supabase.createClient(settings.url, settings.anonKey); const { data, error } = await client.rpc("get_spectator_tournament_by_code", { p_invite_code: code }); if (error || !data) { remoteConnected = false; return false; } state = data; remoteConnected = true; return true; } catch { remoteConnected = false; return false; }
  }

  async function start() {
    language = resolveLanguage();
    applyStaticTranslations();
    document.querySelector("#tvThemeToggle")?.setAttribute("aria-label", t("theme.label"));
    global.PadelstarColorMode?.create({ document, storage: global.localStorage }).bind();
    try { state = JSON.parse(global.localStorage.getItem(storageKey) ?? "null"); } catch { state = null; }
    await loadRemote();
    state ||= { name: "PADELSTAR", currentRound: 1, rounds: [], players: [], status: "Pågår" };
    render(); setInterval(async () => { await loadRemote(); if (!state) { try { state = JSON.parse(global.localStorage.getItem(storageKey) ?? "null"); } catch { /* keep last state */ } } render(); }, 15000);
    setInterval(() => { const now = new Date(); const clock = document.querySelector("#tvClock"); clock.textContent = now.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }); clock.dateTime = now.toISOString(); updateTimers(); }, 1000);
    setInterval(() => { messageIndex = (messageIndex + 1) % footerMessageKeys.length; document.querySelector("#tvMessage").textContent = t(footerMessageKeys[messageIndex]); }, 60000);
    document.querySelector("#tvExitButton").addEventListener("click", () => { if (global.history.length > 1) global.history.back(); else global.location.href = "index.html"; });
    global.addEventListener("resize", () => { if (isCup()) drawBracketLines(); });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js").catch(() => { });
  }
  global.PadelstarTvMode = { start, resolveLanguage };
  global.addEventListener("DOMContentLoaded", start, { once: true });
})(window);
