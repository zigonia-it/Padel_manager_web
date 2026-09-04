(function attachPadelstarTournamentSharing(global) {
  "use strict";

  function create({ elements, getState, translate, createJoinLink, observability }) {
    async function copyText(text, successMessage) {
      try {
        await navigator.clipboard.writeText(text);
        elements.copyStatus.textContent = successMessage;
      } catch {
        elements.copyStatus.textContent = translate("messages.copyFallback");
        if (text === createJoinLink()) elements.joinLink.select();
      }
    }

    async function shareCurrentTournament() {
      const state = getState();
      const shareData = {
        title: state.name,
        text: translate("share.shareText", { code: state.inviteCode }),
        url: createJoinLink(),
      };
      try {
        if (navigator.share) {
          await navigator.share(shareData);
          observability?.emit("share_completed", { method: "native" });
          elements.copyStatus.textContent = translate("share.shared");
          return;
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        observability?.error("share_failed", error, { method: "native" });
      }
      await copyText(createJoinLink(), translate("share.shareFallback"));
      observability?.emit("share_completed", { method: "copy" });
    }

    return { copyText, shareCurrentTournament };
  }

  global.PadelstarTournamentSharing = { create };
})(window);
