(function attachPadelstarSetupForms(global) {
  "use strict";

  function create({ elements, getDefaultTournament, getProfile, initials, accentStyle, translate, syncInviteCodeCells, accentPicker }) {
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
      const selectedAccent = elements.joinAccentPicker?.querySelector("input:checked")?.value;
      elements.joinNamePreview.textContent = name;
      elements.joinAvatarPreview.textContent = initials(name);
      elements.joinAvatarPreviewFrame?.setAttribute("style", accentStyle(selectedAccent ?? profile?.accent ?? "gold"));
    }

    function syncJoinFormFromProfile() {
      const profile = getProfile();
      if (!profile || !elements.joinTournamentForm) return;
      if (!elements.joinTournamentForm.elements.playerName.value) {
        elements.joinTournamentForm.elements.playerName.value = profile.displayName;
      }
      if (profile.accent) accentPicker?.setSelected(elements.joinAccentPicker, profile.accent);
    }

    function prefillInviteCodeFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const inviteCode = params.get("join") ?? params.get("code");
      if (inviteCode) prefillJoinForm(inviteCode);
    }

    function prefillJoinForm(inviteCode) {
      elements.joinTournamentForm.elements.inviteCode.value = inviteCode.trim().toUpperCase();
      syncInviteCodeCells?.();
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
