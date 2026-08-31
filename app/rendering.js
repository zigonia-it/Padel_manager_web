(() => {
  function create({ translate, globalMatchNumber, setScoreText, gameScoreText, escapeHtml }) {
    function matchContextText(match) {
      const matchIndex = globalMatchNumber(match);
      const sitOutCount = match.sittingOut?.length ?? 0;
      const parts = [
        translate("tournament.roundLabel", { round: match.rotationNumber }),
        matchIndex ? translate("matches.matchNumber", { match: matchIndex }) : "",
        sitOutCount ? translate("matches.restingCount", { count: sitOutCount }) : "",
      ].filter(Boolean);
      return parts.join(" · ");
    }

    function primaryMatchHeadline(match) {
      if (match.state === "finished" && match.winnerTeamIndex !== null) {
        const winner = match.winnerTeamIndex === 0 ? match.teamOne : match.teamTwo;
        if (match.isWalkover) return translate("score.walkoverWinner", { winner: winner.displayName });
        return translate("score.matchWinner", { winner: winner.displayName, score: setScoreText(match) });
      }
      if (match.state === "cancelled") return translate("score.matchCancelled");
      return translate("score.matchup", { teamOne: match.teamOne.displayName, teamTwo: match.teamTwo.displayName });
    }

    function scoreSummary(match) {
      if (match.isWalkover) return translate("score.walkover");
      if (match.completedSets.length) {
        const sets = match.completedSets.map((set) => `${set.teamOne}-${set.teamTwo}`).join(", ");
        return match.state === "finished"
          ? translate("score.finishedPrefix", { sets })
          : translate("score.setsPrefix", { sets });
      }
      return translate("score.currentSummary", { sets: setScoreText(match), game: gameScoreText(match) });
    }

    function sittingOutSummary(match) {
      if (!match.sittingOut?.length) return "";
      return ` · ${translate("matches.restingPlayers", {
        players: match.sittingOut.map((player) => escapeHtml(player.name)).join(", "),
      })}`;
    }

    return { matchContextText, primaryMatchHeadline, scoreSummary, sittingOutSummary };
  }

  window.PadelstarRendering = { create };
})();
