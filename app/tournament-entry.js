(function attachPadelstarTournamentEntry(global) {
  "use strict";

  function create(deps) {
    const {
      createInviteCode,
      createTournament,
      randomAvatarId,
      getAdminAuthUser,
      getAdminEmail,
      sendAdminSignInLink,
      ensureProfileForJoin,
      findPlayerByName,
      getClient,
      getState,
      hasTournamentForInvite,
      joinRemoteTournament,
      joinTournament,
      linkProfileToPlayer,
      loadRemoteTournamentByInvite,
      parsePlayerNames,
      render,
      saveState,
      setLocalRole,
      setState,
      showToast,
      showAccount,
      showWorkspace,
      syncJoinPreview,
      t,
    } = deps;

    async function handleCreate(event) {
      event.preventDefault();
      const form = event.currentTarget;
      let adminUser = null;
      if (getAdminAuthUser && getClient()) {
        adminUser = await getAdminAuthUser();
        if (!adminUser) {
          showAccount?.();
          showToast(t("admin.identitySignInRequired"), "status-message-error");
          return;
        }
      }
      const formData = new FormData(form);
      const adminParticipates = formData.get("adminParticipates") === "on";
      const adminPlayerName = formData.get("adminPlayerName").trim();
      const playerNames = parsePlayerNames(formData.get("players"));

      if (adminParticipates && !adminPlayerName) {
        showToast(t("messages.adminNameRequired"), "status-message-error");
        form.elements.adminPlayerName.focus();
        return;
      }

      const tournamentPlayers = adminParticipates
        ? [adminPlayerName, ...playerNames.filter((name) => name.toLowerCase() !== adminPlayerName.toLowerCase())]
        : playerNames;
      const nextState = createTournament({
        name: formData.get("tournamentName").trim(),
        inviteCode: createInviteCode(),
        players: tournamentPlayers,
        courtCount: Number(formData.get("courts")),
      });
      if (adminUser?.id) nextState.ownerUserId = adminUser.id;

      if (adminParticipates) {
        nextState.players[0].joinedFrom = "admin-self";
        nextState.players[0].participantType = "admin-player";
        linkProfileToPlayer(nextState.players[0]);
        nextState.selectedPlayerId = nextState.players[0].id;
      }

      setState(nextState);
      setLocalRole("admin");
      saveState({ remote: false });
      await deps.createRemoteTournament();
      showWorkspace();
      render();
    }

    async function handleJoin(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      const inviteCode = formData.get("inviteCode").trim().toUpperCase();
      const playerName = formData.get("playerName").trim();
      const avatarId = randomAvatarId();
      const client = getClient();
      const loadedRemote = client ? await loadRemoteTournamentByInvite(inviteCode) : false;

      if (!hasTournamentForInvite(inviteCode, loadedRemote)) {
        showToast(t("messages.tournamentNotFound", { code: inviteCode }), "status-message-error");
        return;
      }
      if (!playerName) return;
      ensureProfileForJoin(playerName, avatarId);

      let player;
      if (client) {
        const joined = await joinRemoteTournament(playerName, avatarId);
        if (!joined) return;
        player = findPlayerByName(playerName);
      } else {
        const currentState = getState();
        const existingPlayer = findPlayerByName(playerName);
        if (!existingPlayer && currentState.rounds.length > 0) {
          showToast(t("messages.tournamentStartedAskAdmin"), "status-message-error");
          return;
        }
        player = existingPlayer ?? joinTournament(playerName, avatarId);
      }

      if (!player) return;
      const currentState = getState();
      currentState.selectedPlayerId = player.id;
      setLocalRole("player");
      saveState({ remote: false });
      showWorkspace("player");
      form.reset();
      syncJoinPreview();
      saveState({ remote: Boolean(client) });
      render();
    }

    function bind(elements) {
      elements.createTournamentForm?.addEventListener("submit", handleCreate);
      elements.joinTournamentForm?.addEventListener("submit", handleJoin);
    }

    return { bind, handleCreate, handleJoin };
  }

  global.PadelstarTournamentEntry = { create };
})(window);
