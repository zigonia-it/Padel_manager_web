(function attachPadelstarAppEvents(global) {
  "use strict";

  function bind({ elements, documentRef, windowRef, callbacks }) {
    const {
      activateAdminPanel,
      activatePlayerAction,
      closeLargeScore,
      closeSetScoreDialog,
      handleOnline,
      handleOffline,
      render,
      setPendingSetScoreMatchId,
      setLargeScoreMatchId,
      syncJoinPreview,
    } = callbacks;

    elements.confirmDialog?.addEventListener("click", (event) => {
      if (event.target === elements.confirmDialog) elements.confirmDialog.close("cancel");
    });
    windowRef.addEventListener("online", handleOnline);
    windowRef.addEventListener("offline", handleOffline);
    elements.joinTournamentForm.elements.playerName.addEventListener("input", syncJoinPreview);
    elements.avatarPicker.addEventListener("change", syncJoinPreview);
    elements.closeLargeScoreButton.addEventListener("click", closeLargeScore);
    elements.largeScoreDialog.addEventListener("click", (event) => {
      if (event.target === elements.largeScoreDialog) closeLargeScore();
    });
    elements.largeScoreDialog.addEventListener("close", () => setLargeScoreMatchId(null));
    elements.closeSetScoreButton.addEventListener("click", closeSetScoreDialog);
    elements.setScoreDialog.addEventListener("click", (event) => {
      if (event.target === elements.setScoreDialog) closeSetScoreDialog();
    });
    elements.setScoreDialog.addEventListener("close", () => setPendingSetScoreMatchId(null));
    documentRef.querySelectorAll(".subtab").forEach((tab) => {
      tab.addEventListener("click", () => activateAdminPanel(tab.dataset.adminPanel));
    });
    documentRef.addEventListener("click", (event) => {
      const clickTarget = event.target instanceof global.Element ? event.target : null;
      if (!clickTarget) return;
      const playerAction = clickTarget.closest("[data-player-action]")?.dataset.playerAction;
      if (!playerAction) return;
      activatePlayerAction(playerAction);
      render();
    });
  }

  global.PadelstarAppEvents = { bind };
})(window);
