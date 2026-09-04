(function attachPadelstarSetupForms(global) {
  "use strict";

  function create({ elements, getDefaultTournament, getProfile, defaultAvatarId, avatarUrl, accentStyle, translate }) {
    function syncCreateFormDefaults() {
      const defaultTournament = getDefaultTournament();
      elements.createTournamentForm.elements.tournamentName.value = defaultTournament.name;
      elements.createTournamentForm.elements.players.value = defaultTournament.players
        .map((player) => player.name)
        .join("\n");
      elements.createTournamentForm.elements.courts.value = defaultTournament.courts.length;
      elements.createTournamentForm.elements.adminParticipates.checked = false;
      elements.createTournamentForm.elements.adminPlayerName.value = getProfile()?.displayName?.trim() || "Admin";
      syncAdminPlayerChoice();
    }

    function syncAdminPlayerChoice() {
      const adminParticipates = elements.createTournamentForm.elements.adminParticipates.checked;
      elements.adminPlayerNameField.classList.toggle("hidden", !adminParticipates);
      elements.createTournamentForm.elements.adminPlayerName.required = adminParticipates;
    }

    function syncAdminPlayerNameFromProfile() {
      const name = getProfile()?.displayName?.trim();
      const field = elements.createTournamentForm?.elements.adminPlayerName;
      if (name && field && (!field.value.trim() || field.value.trim() === "Admin")) field.value = name;
    }

    function syncJoinPreview() {
      const inputName = elements.joinTournamentForm.elements.playerName.value.trim();
      const profile = getProfile();
      const name = inputName || profile?.displayName || translate("setup.yourName");
      const avatarId = profile?.avatarId || defaultAvatarId;
      elements.joinNamePreview.textContent = name;
      elements.joinAvatarPreview.src = avatarUrl({ name, avatarId });
      elements.joinAvatarPreviewFrame?.setAttribute("style", accentStyle(profile?.accent ?? "gold"));
    }

    function syncJoinFormFromProfile() {
      const profile = getProfile();
      if (!profile || !elements.joinTournamentForm) return;
      if (!elements.joinTournamentForm.elements.playerName.value) {
        elements.joinTournamentForm.elements.playerName.value = profile.displayName;
      }
    }

    function prefillInviteCodeFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const inviteCode = params.get("join") ?? params.get("code");
      if (inviteCode) prefillJoinForm(inviteCode);
    }

    function prefillJoinForm(inviteCode) {
      elements.joinTournamentForm.elements.inviteCode.value = inviteCode.trim().toUpperCase();
    }

    return {
      prefillInviteCodeFromUrl,
      prefillJoinForm,
      syncAdminPlayerChoice,
      syncAdminPlayerNameFromProfile,
      syncCreateFormDefaults,
      syncJoinFormFromProfile,
      syncJoinPreview,
    };
  }

  global.PadelstarSetupForms = { create };
})(window);
