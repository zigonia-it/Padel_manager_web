window.PadelstarProfileUi = (() => {
  function create({ defaultAvatarId, elements, escapeHtml, getLocalStorage, getProfile, getAccountUser = () => null, getActiveTournaments = () => [], getFinishedTournaments = () => [], getProfileManager, profileHistoryStorageKey, t, accentPicker, defaultAccent, tournamentStatusText }) {
    function renderProfile() {
      const profileManager = getProfileManager();
      const profile = getProfile();
      if (!elements.profileForm || !profileManager) return;
      elements.profileNameInput.value = profile?.displayName ?? "";
      elements.profileAvatarPicker?.querySelectorAll("input[name=profileAvatarId]").forEach((input) => {
        input.checked = input.value === (profile?.avatarId ?? defaultAvatarId);
      });
      accentPicker?.setSelected(elements.profileAccentPicker, profile?.accent ?? defaultAccent);
      const pendingDeletion = Boolean(profile?.deletionScheduledFor);
      elements.profileDeletionStatus.textContent = pendingDeletion
        ? t("profile.deletePending", { date: new Date(profile.deletionScheduledFor).toLocaleDateString(document.documentElement.lang || "nb-NO") }) : "";
      elements.profileDeletionStatus.classList.toggle("hidden", !pendingDeletion);
      elements.deleteProfileButton.classList.toggle("hidden", !profile || pendingDeletion);
      elements.cancelProfileDeletionButton.classList.toggle("hidden", !pendingDeletion);
      const accountId = getAccountUser()?.id;
      const history = accountId ? profileManager.historyForProfile(profileManager.loadHistory(getLocalStorage(), profileHistoryStorageKey), profile?.id)
        .filter((entry) => entry.accountUserId === accountId) : [];
      const summary = profileManager.summarizeHistory(history);
      elements.profileStats.innerHTML = profile ? [
        [t("profile.tournaments"), summary.tournaments], [t("profile.matches"), summary.matches],
        [t("profile.wins"), summary.wins], [t("profile.points"), summary.points],
      ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("") : `<p class="hint">${t("profile.empty")}</p>`;
      const filter = elements.profileHistoryFilter?.value ?? "all";
      const cutoff = filter === "month" ? Date.now() - 30 * 86400000 : filter === "year" ? Date.now() - 365 * 86400000 : 0;
      const filteredHistory = history.filter((entry) => !cutoff || new Date(entry.endedAt ?? entry.recordedAt).getTime() >= cutoff);
      const matchSummary = (entry) => (entry.matchRecords ?? []).map((match) => {
        const first = (match.teamOne?.players ?? []).map((player) => escapeHtml(player.name)).join(" & ") || "—";
        const second = (match.teamTwo?.players ?? []).map((player) => escapeHtml(player.name)).join(" & ") || "—";
        const score = (match.completedSets ?? []).map((set) => `${set.teamOne}-${set.teamTwo}`).join(", ");
        return `<li>${first} <span aria-hidden="true">×</span> ${second}${score ? ` <small>${escapeHtml(score)}</small>` : ""}</li>`;
      }).join("");
      elements.profileHistoryList.innerHTML = filteredHistory.length === 0
        ? `<p class="hint">${t("profile.noHistory")}</p>`
        : `<h4>${t("profile.historyTitle")}</h4><ul class="profile-history-list">${filteredHistory.map((entry) => `<li><div><strong>${escapeHtml(entry.tournamentName)}</strong><small>${entry.endedAt ? new Date(entry.endedAt).toLocaleDateString(document.documentElement.lang || "nb-NO") : ""}</small></div><span>${t("profile.historyDetail", { placement: entry.placement ?? "-", points: entry.points, wins: entry.wins, matches: entry.matches })}</span>${matchSummary(entry) ? `<details><summary>${t("common.matches")}</summary><ul>${matchSummary(entry)}</ul></details>` : ""}</li>`).join("")}</ul>`;

      const account = getAccountUser();
      if (elements.activeTournamentsList) {
        const activeTournaments = account ? getActiveTournaments() : [];
        elements.activeTournamentsList.innerHTML = activeTournaments.length === 0
          ? `<p class="hint">${t("profile.noActiveTournaments")}</p>`
          : activeTournaments.map((tournament) => `
            <article class="saved-tournament-item">
              <span class="status-chip">${escapeHtml(tournamentStatusText?.(tournament.status) ?? tournament.status ?? "")}</span>
              <strong>${escapeHtml(tournament.name ?? "")}</strong>
              <span>${tournament.playerCount} ${t("resume.players")} · ${tournament.inviteCode}</span>
              <button class="secondary" type="button" data-owned-tournament-id="${escapeHtml(tournament.id)}">${t("resume.continueAdmin")}</button>
            </article>`).join("");
      }
      if (elements.finishedTournamentsList) {
        const finished = account ? getFinishedTournaments() : [];
        elements.finishedTournamentsList.innerHTML = finished.length === 0
          ? `<p class="hint">${t("profile.noFinishedTournaments")}</p>`
          : finished.map((tournament) => `
            <article class="saved-tournament-item">
              <strong>${escapeHtml(tournament.name ?? "")}</strong>
              <span>${tournament.playerCount} ${t("resume.players")} · ${tournament.endedAt ? new Date(tournament.endedAt).toLocaleDateString(document.documentElement.lang || "nb-NO") : ""}</span>
              <button class="secondary" type="button" data-owned-tournament-id="${escapeHtml(tournament.id)}">${t("profile.openToCorrect")}</button>
            </article>`).join("");
      }
      if (elements.profileAccountEmail) elements.profileAccountEmail.textContent = account?.email ?? "";
      if (elements.profileAccountCreated) {
        elements.profileAccountCreated.textContent = account?.created_at
          ? t("account.memberSince", { date: new Date(account.created_at).toLocaleDateString(document.documentElement.lang || "nb-NO") })
          : "";
      }
      if (elements.profileAccountEmailStatus) {
        elements.profileAccountEmailStatus.textContent = account
          ? account.email_confirmed_at ? t("account.emailConfirmed") : t("account.emailNotConfirmed")
          : "";
      }
      elements.accountSettingsPanel?.classList.toggle("hidden", !account);
    }
    return { renderProfile };
  }
  return { create };
})();
