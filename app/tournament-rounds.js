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

  function advancingTeams(round, bracketRound, fallbackByeTeams = []) {
    return [
      ...(bracketRound?.byeTeams ?? fallbackByeTeams),
      ...round.matches
        .filter((match) => !match.isThirdPlaceMatch)
        .filter((match) => match.state === "finished" && match.winnerTeamIndex !== null)
        .map((match) => match.winnerTeamIndex === 0 ? match.teamOne : match.teamTwo),
    ];
  }

  return { advancingTeams, createCupBracket, nextPowerOfTwo, shuffleItems };
})();
