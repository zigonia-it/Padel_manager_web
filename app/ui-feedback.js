(function initializeUiFeedback(global) {
  function create({ elements, translate }) {
    let toastTimer = null;

    function requestConfirmation(message) {
      const dialog = elements.confirmDialog;
      if (!dialog || typeof dialog.showModal !== "function") {
        return Promise.resolve(typeof global.confirm === "function" ? global.confirm(message) : true);
      }
      const previouslyFocused = document.activeElement;
      elements.confirmMessage.textContent = message;
      elements.confirmCancel.textContent = translate("actions.close");
      elements.confirmAccept.textContent = translate("common.confirm");
      dialog.returnValue = "cancel";
      dialog.showModal();
      elements.confirmAccept.focus();
      return new Promise((resolve) => {
        const finish = () => {
          if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
          resolve(dialog.returnValue === "accept");
        };
        dialog.addEventListener("close", finish, { once: true });
      });
    }

    function showToast(message, statusClass = "status-message-success") {
      if (!elements.appToast || !message) return;
      global.clearTimeout(toastTimer);
      elements.appToast.textContent = message;
      elements.appToast.className = `app-toast is-visible ${statusClass}`;
      toastTimer = global.setTimeout(() => {
        elements.appToast.classList.remove("is-visible");
      }, 4200);
    }

    return { requestConfirmation, showToast };
  }

  global.PadelstarUiFeedback = { create };
})(window);
