window.PadelstarProfileUi = (() => {
  function create({ defaultAvatarId, elements, escapeHtml, getLocalStorage, getProfile, getProfileManager, profileHistoryStorageKey, t }) {
    function renderProfile() {
      const profileManager = getProfileManager();
      const profile = getProfile();
      if (!elements.profileForm || !profileManager) return;
      elements.profileNameInput.value = profile?.displayName ?? "";
      elements.profileAvatarPicker.querySelectorAll("input[name=profileAvatarId]").forEach((input) => {
        input.checked = input.value === (profile?.avatarId ?? defaultAvatarId);
      });
      const pendingDeletion = Boolean(profile?.deletionScheduledFor);
      elements.profileDeletionStatus.textContent = pendingDeletion
        ? t("profile.deletePending", { date: new Date(profile.deletionScheduledFor).toLocaleDateString(document.documentElement.lang || "nb-NO") }) : "";
      elements.profileDeletionStatus.classList.toggle("hidden", !pendingDeletion);
      elements.deleteProfileButton.classList.toggle("hidden", !profile || pendingDeletion);
      elements.cancelProfileDeletionButton.classList.toggle("hidden", !pendingDeletion);
      const history = profileManager.historyForProfile(profileManager.loadHistory(getLocalStorage(), profileHistoryStorageKey), profile?.id);
      const summary = profileManager.summarizeHistory(history);
      elements.profileStats.innerHTML = profile ? [
        [t("profile.tournaments"), summary.tournaments], [t("profile.matches"), summary.matches],
        [t("profile.wins"), summary.wins], [t("profile.points"), summary.points],
      ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("") : `<p class="hint">${t("profile.empty")}</p>`;
      const filter = elements.profileHistoryFilter?.value ?? "all";
      const cutoff = filter === "month" ? Date.now() - 30 * 86400000 : filter === "year" ? Date.now() - 365 * 86400000 : 0;
      const filteredHistory = history.filter((entry) => !cutoff || new Date(entry.endedAt ?? entry.recordedAt).getTime() >= cutoff);
      elements.profileHistoryList.innerHTML = filteredHistory.length === 0
        ? `<p class="hint">${t("profile.noHistory")}</p>`
        : `<h4>${t("profile.historyTitle")}</h4><ul class="profile-history-list">${filteredHistory.map((entry) => `<li><div><strong>${escapeHtml(entry.tournamentName)}</strong><small>${entry.endedAt ? new Date(entry.endedAt).toLocaleDateString(document.documentElement.lang || "nb-NO") : ""}</small></div><span>${t("profile.historyDetail", { placement: entry.placement ?? "-", points: entry.points, wins: entry.wins, matches: entry.matches })}</span></li>`).join("")}</ul>`;
    }
    return { renderProfile };
  }
  return { create };
})();
