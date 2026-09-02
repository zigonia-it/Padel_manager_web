window.PadelstarTournamentRuntime = (() => {
  function create({
    activateRound,
    buildSchedule,
    canCompleteRound,
    createTeam,
    generateRoundMatches,
    getActiveRound,
    matchPlayers,
    setsWonByTeam,
    now = () => new Date().toISOString(),
    randomUUID = () => crypto.randomUUID(),
    rounds,
    showToast,
    translate,
    uniquePlayers,
    getState,
  }) {
    function state() {
      return getState();
    }

    function createScheduledRound(roundPlan, roundNumber) {
      const currentState = state();
      const matchPlan = generateRoundMatches(roundPlan.teams, roundNumber, roundPlan.sittingOut);
      const matches = matchPlan.map((match, index) => ({
        ...match,
        isThirdPlaceMatch: false,
        courtId: currentState.courts[index % currentState.courts.length]?.id ?? null,
        courtName: currentState.courts[index % currentState.courts.length]?.name ?? null,
        state: "waiting",
      }));
      const playingPlayerIds = new Set(matches.flatMap((match) => matchPlayers(match).map((player) => player.id)));
      const sittingOut = uniquePlayers([
        ...roundPlan.sittingOut,
        ...roundPlan.teams.flatMap((team) => team.players).filter((player) => !playingPlayerIds.has(player.id)),
      ]);
      matches.forEach((match) => {
        match.sittingOut = sittingOut;
      });

      return { id: randomUUID(), roundNumber, status: "scheduled", createdAt: now(), sittingOut, matches };
    }

    function createScheduledMatch(teamOne, teamTwo, roundNumber, matchIndex, isThirdPlaceMatch = false) {
      const currentState = state();
      const match = generateRoundMatches([teamOne, teamTwo], roundNumber, [])[0];
      return {
        ...match,
        isThirdPlaceMatch,
        courtId: currentState.courts[matchIndex % currentState.courts.length]?.id ?? null,
        courtName: currentState.courts[matchIndex % currentState.courts.length]?.name ?? null,
        state: "waiting",
      };
    }

    function generateFullTournamentSchedule() {
      const currentState = state();
      if (currentState.settings.format === "cup") {
        generateCupTournament();
        return;
      }
      const schedule = currentState.schedule.length ? currentState.schedule : buildSchedule(currentState.players, currentState.settings.format);
      if (!schedule.length) {
        showToast(translate("messages.needTwoPlayers"), "status-message-error");
        return;
      }
      currentState.rounds = schedule.map((roundPlan, index) => createScheduledRound(roundPlan, index + 1)).filter((round) => round.matches.length > 0);
      if (!currentState.rounds.length) {
        showToast(translate("messages.noValidMatches"), "status-message-error");
        return;
      }
      activateRound(currentState.rounds[0]);
      currentState.status = "Runde pågår";
    }

    function createAutoCupTeams(players) {
      return Array.from({ length: Math.floor(players.length / 2) }, (_, index) => createTeam([players[index * 2], players[index * 2 + 1]]));
    }

    function cupTeamsForStart() {
      const currentState = state();
      if (currentState.settings.cupTeamSetupMode === "manual") return currentState.cupTeams;
      const activePlayers = currentState.players.filter((player) => player.active && player.availability !== "away");
      const pairedPlayers = activePlayers.slice(0, activePlayers.length - (activePlayers.length % 2));
      return createAutoCupTeams(pairedPlayers);
    }

    function generateCupTournament() {
      const currentState = state();
      const activePlayers = currentState.players.filter((player) => player.active && player.availability !== "away");
      const teams = cupTeamsForStart();
      if (teams.length < 2) {
        showToast(translate(currentState.settings.cupTeamSetupMode === "manual" ? "messages.manualCupNeedsTeams" : "messages.autoCupNeedsPlayers"), "status-message-error");
        return;
      }
      const bracketSize = rounds.nextPowerOfTwo(teams.length);
      const seededTeams = rounds.shuffleItems(teams);
      const byeCount = bracketSize - seededTeams.length;
      const byeTeams = seededTeams.slice(0, byeCount);
      const teamPlayerIds = new Set(teams.flatMap((team) => team.players.map((player) => player.id)));
      const firstRound = createScheduledRound({
        teams: seededTeams.slice(byeCount),
        sittingOut: [...activePlayers.filter((player) => !teamPlayerIds.has(player.id)), ...byeTeams.flatMap((team) => team.players)],
      }, 1);
      currentState.cup = {
        teamSetupMode: "auto",
        includesThirdPlaceMatch: currentState.settings.includesThirdPlaceMatch,
        bracketSize,
        byeTeams,
        bracket: rounds.createCupBracket({ bracketSize, firstRound, byeTeams, includesThirdPlaceMatch: currentState.settings.includesThirdPlaceMatch }),
      };
      currentState.rounds = firstRound.matches.length ? [firstRound] : [];
      if (!currentState.rounds.length) {
        currentState.status = "Cup ferdig";
        return;
      }
      activateRound(currentState.rounds[0]);
      currentState.status = "Runde pågår";
    }

    function getCupBracketRound(roundNumber) {
      return state().cup?.bracket?.rounds?.find((round) => round.roundNumber === roundNumber) ?? null;
    }

    function createNextCupRound() {
      const currentState = state();
      const previousRound = currentState.rounds.at(-1);
      if (!previousRound || previousRound.status !== "finished") return null;
      const previousBracketRound = getCupBracketRound(previousRound.roundNumber);
      const regularMatches = previousRound.matches.filter((match) => !match.isThirdPlaceMatch);
      const advancing = rounds.advancingTeams(previousRound, previousBracketRound, currentState.cup?.byeTeams ?? []);
      const losingTeams = regularMatches
        .filter((match) => match.state === "finished" && match.winnerTeamIndex !== null)
        .map((match) => match.winnerTeamIndex === 0 ? match.teamTwo : match.teamOne);
      currentState.cup.byeTeams = [];
      if (advancing.length < 2) {
        currentState.cup.winnerTeam = advancing[0] ?? null;
        return null;
      }
      const nextBracketRound = currentState.cup.bracket?.rounds?.find((round) => round.roundNumber > previousRound.roundNumber);
      const nextRoundNumber = nextBracketRound?.roundNumber ?? previousRound.roundNumber + 1;
      const nextRound = createScheduledRound({ teams: advancing, sittingOut: [] }, nextRoundNumber);
      const isFinalRound = nextBracketRound ? nextRoundNumber === currentState.cup.bracket.rounds.at(-1)?.roundNumber : advancing.length === 2;
      let thirdPlaceMatch = null;
      if (isFinalRound && currentState.cup.includesThirdPlaceMatch && losingTeams.length >= 2) {
        thirdPlaceMatch = createScheduledMatch(losingTeams[0], losingTeams[1], nextRoundNumber, nextRound.matches.length, true);
        nextRound.matches.push(thirdPlaceMatch);
      }
      if (nextBracketRound) {
        nextBracketRound.slots = nextRound.matches.filter((match) => !match.isThirdPlaceMatch).map((match) => ({ type: "match", matchId: match.id }));
        nextBracketRound.byeTeams = [];
        nextBracketRound.thirdPlaceSlot = thirdPlaceMatch
          ? { type: "match", matchId: thirdPlaceMatch.id }
          : nextBracketRound.thirdPlaceSlot && nextBracketRound.thirdPlaceSlot.type === "pending" ? null : nextBracketRound.thirdPlaceSlot;
        if (isFinalRound) {
          currentState.cup.bracket.finalMatchId = nextRound.matches.find((match) => !match.isThirdPlaceMatch)?.id ?? null;
          currentState.cup.bracket.thirdPlaceMatchId = thirdPlaceMatch?.id ?? null;
        }
      }
      return nextRound;
    }

    function cupCanAdvance() {
      const currentState = state();
      if (currentState.settings.format !== "cup") return false;
      const round = currentState.rounds.at(-1);
      if (!round || (round.status !== "finished" && !(round.status === "active" && canCompleteRound(round)))) return false;
      return rounds.advancingTeams(round, getCupBracketRound(round.roundNumber), currentState.cup?.byeTeams ?? []).length > 1;
    }

    function cupCanFinalize() {
      const currentState = state();
      if (currentState.settings.format !== "cup") return false;
      const round = currentState.rounds.at(-1);
      if (!round || round.status !== "active" || !canCompleteRound(round)) return false;
      const finalRoundNumber = currentState.cup?.bracket?.rounds?.at(-1)?.roundNumber;
      return finalRoundNumber ? round.roundNumber === finalRoundNumber : true;
    }

    function startNextScheduledRound() {
      const currentState = state();
      const nextRound = currentState.rounds.find((round) => round.status === "scheduled");
      if (nextRound) {
        activateRound(nextRound);
        return;
      }
      if (currentState.settings.format !== "cup") return;
      const nextCupRound = createNextCupRound();
      if (!nextCupRound) {
        currentState.status = "Cup ferdig";
        return;
      }
      currentState.rounds.push(nextCupRound);
      activateRound(nextCupRound);
    }

    function activateNextWaitingMatch(match) {
      const activeRound = getActiveRound();
      const nextWaitingMatch = activeRound?.matches.find((item) => item.state === "waiting");
      if (!nextWaitingMatch) return null;
      nextWaitingMatch.state = "playing";
      nextWaitingMatch.courtId = match.courtId;
      nextWaitingMatch.courtName = match.courtName;
      return nextWaitingMatch;
    }

    function markCupCompleteIfDone() {
      const currentState = state();
      if (currentState.settings.format !== "cup") return;
      const activeRound = getActiveRound();
      if (!activeRound || !canCompleteRound(activeRound)) return;
      const finalRoundNumber = currentState.cup?.bracket?.rounds?.at(-1)?.roundNumber;
      const isFinalRound = finalRoundNumber ? activeRound.roundNumber === finalRoundNumber : !cupCanAdvance();
      if (!isFinalRound) return;
      const finalMatch = activeRound.matches.find((match) => !match.isThirdPlaceMatch);
      activeRound.status = "finished";
      currentState.status = "Cup ferdig";
      currentState.cup.winnerTeam = finalMatch?.winnerTeamIndex === 0
        ? finalMatch.teamOne
        : finalMatch?.winnerTeamIndex === 1 ? finalMatch.teamTwo : null;
    }

    function finishMatch(match) {
      const currentState = state();
      match.state = "finished";
      match.currentGame = { teamOne: 0, teamTwo: 0 };
      match.winnerTeamIndex = setsWonByTeam(match, 0) > setsWonByTeam(match, 1) ? 0 : 1;
      match.isWalkover = false;
      match.completedAt = now();
      activateNextWaitingMatch(match);
      markCupCompleteIfDone();
      return currentState;
    }

    return { activateNextWaitingMatch, cupCanAdvance, cupCanFinalize, createNextCupRound, finishMatch, generateCupTournament, generateFullTournamentSchedule, markCupCompleteIfDone, startNextScheduledRound };
  }

  return { create };
})();
