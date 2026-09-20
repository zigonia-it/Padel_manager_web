window.PadelstarTournamentRounds = (() => {
  function nextPowerOfTwo(value) {
    return 2 ** Math.ceil(Math.log2(value));
  }

  function shuffleItems(items, random = Math.random) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function createCupBracket({ bracketSize, firstRound, byeTeams, includesThirdPlaceMatch }) {
    const totalRounds = Math.max(1, Math.log2(bracketSize));
    const rounds = [{
      roundNumber: 1,
      slots: firstRound.matches.map((match) => ({ type: "match", matchId: match.id })),
      byeTeams,
      thirdPlaceSlot: null,
    }];

    for (let roundNumber = 2; roundNumber <= totalRounds; roundNumber += 1) {
      rounds.push({
        roundNumber,
        slots: Array.from({ length: Math.max(1, bracketSize / 2 ** roundNumber) }, () => ({ type: "pending" })),
        byeTeams: [],
        thirdPlaceSlot: roundNumber === totalRounds && includesThirdPlaceMatch ? { type: "pending" } : null,
      });
    }

    return {
      bracketSize,
      includesThirdPlaceMatch,
      rounds,
      finalMatchId: null,
      thirdPlaceMatchId: null,
    };
  }

  // A match in which both sides withdrew is cancelled and has no winner (see app/player-withdrawal.js).
  function isBothSidesCancelled(match) {
    return !match.isThirdPlaceMatch && match.state === "cancelled" && match.withdrawal?.bothSides === true;
  }

  function isPresentTeam(state, team) {
    return (team.players ?? []).some((player) => !(state.players ?? []).some((item) => item.id === player.id && item.withdrawn === true));
  }

  // Games won minus games lost over every played (not walked-over) match of the cup.
  function gamesDifference(state, teamId) {
    let difference = 0;
    (state.rounds ?? []).forEach((round) => (round.matches ?? []).forEach((match) => {
      if (match.state !== "finished" || match.isWalkover) return;
      const side = match.teamOne?.id === teamId ? 0 : match.teamTwo?.id === teamId ? 1 : null;
      if (side === null) return;
      (match.completedSets ?? []).forEach((set) => { difference += side === 0 ? set.teamOne - set.teamTwo : set.teamTwo - set.teamOne; });
    }));
    return difference;
  }

  // Both sides of a match withdrew: the best-placed losing team of the round takes the place (the admin confirms it).
  // All candidates lost in this round, so the games difference over the cup ranks them, then the order of their match.
  // A team that lost by walkover did not play, and a team with nobody left cannot play on: neither is a candidate.
  // Returns { missing, teams } with one team per cancelled match at most (the same rule runs on the server).
  function luckyLoserProposal(state, round) {
    const matches = (round?.matches ?? []).filter((match) => !match.isThirdPlaceMatch);
    const missing = matches.filter(isBothSidesCancelled).length;
    if (!missing) return { missing: 0, teams: [] };
    const candidates = [];
    matches.forEach((match, index) => {
      if (match.state !== "finished" || match.winnerTeamIndex === null || match.winnerTeamIndex === undefined || match.isWalkover) return;
      const team = match.winnerTeamIndex === 0 ? match.teamTwo : match.teamOne;
      if (!isPresentTeam(state, team)) return;
      candidates.push({ team, index, difference: gamesDifference(state, team.id) });
    });
    candidates.sort((a, b) => b.difference - a.difference || a.index - b.index);
    return { missing, teams: candidates.slice(0, missing).map((candidate) => candidate.team) };
  }

  // The teams that play the next round, in bracket order. `luckyLosers` fill the places of cancelled matches.
  function advancingTeams(round, bracketRound, fallbackByeTeams = [], luckyLosers = []) {
    const queue = [...luckyLosers];
    const advancing = [...(bracketRound?.byeTeams ?? fallbackByeTeams)];
    round.matches.filter((match) => !match.isThirdPlaceMatch).forEach((match) => {
      if (match.state === "finished" && match.winnerTeamIndex !== null) advancing.push(match.winnerTeamIndex === 0 ? match.teamOne : match.teamTwo);
      else if (isBothSidesCancelled(match) && queue.length) advancing.push(queue.shift());
    });
    return advancing;
  }

  return { advancingTeams, createCupBracket, gamesDifference, isBothSidesCancelled, luckyLoserProposal, nextPowerOfTwo, shuffleItems };
})();
