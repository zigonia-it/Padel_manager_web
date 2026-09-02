(function initializePadelstarPwaInstall(global) {
  "use strict";

  function create({ documentRef = global.document, navigatorRef = global.navigator, windowRef = global }) {
    let deferredPrompt = null;
    let lastTrigger = null;

    function isStandaloneMode() {
      return Boolean(
        windowRef.matchMedia?.("(display-mode: standalone)").matches
        || navigatorRef.standalone === true,
      );
    }

    function platform() {
      const userAgent = String(navigatorRef.userAgent ?? "").toLowerCase();
      if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
      if (/android/.test(userAgent)) return "android";
      if (/cros/.test(userAgent)) return "chromeos";
      if (/windows/.test(userAgent)) return "windows";
      if (/macintosh|mac os x/.test(userAgent)) return "macos";
      return "generic";
    }

    function button() { return documentRef.querySelector("#installAppButton"); }
    function modal() { return documentRef.querySelector("#installModal"); }

    function updateVisibility() {
      const installButton = button();
      if (!installButton) return;
      installButton.hidden = isStandaloneMode() || (!deferredPrompt && !navigatorRef.userAgent);
      installButton.dataset.installMethod = deferredPrompt ? "native" : "manual";
    }

    function instructions() {
      const labels = {
        ios: ["iPhone / iPad", ["Åpne Padelstar i Safari.", "Trykk på Del-knappen.", "Velg «Legg til på Hjem-skjerm».", "Trykk «Legg til»." ]],
        android: ["Android", ["Åpne Padelstar i Chrome.", "Åpne menyen ⋮.", "Velg «Installer app» eller «Legg til på startskjermen».", "Bekreft installasjonen."]],
        windows: ["Windows", ["Åpne Padelstar i Edge eller Chrome.", "Åpne nettlesermenyen.", "Velg «Installer app» eller tilsvarende.", "Bekreft installasjonen."]],
        macos: ["Mac", ["Åpne Padelstar i Safari.", "Velg Del.", "Velg «Legg til i Dock».", "Bekreft installasjonen."]],
        chromeos: ["Chromebook", ["Åpne Padelstar i Chrome.", "Åpne menyen ⋮.", "Velg «Installer app».", "Bekreft installasjonen."]],
        generic: ["Installer Padelstar", ["Åpne nettlesermenyen.", "Se etter «Installer app» eller «Legg til på startskjermen».", "Bekreft installasjonen."]],
      };
      const [title, steps] = labels[platform()] ?? labels.generic;
      return `<h3>${title}</h3><ol>${steps.map((step) => `<li>${step}</li>`).join("")}</ol>`;
    }

    function openInstallInstructions() {
      const installModal = modal();
      const content = documentRef.querySelector("#installInstructions");
      if (!installModal || !content || isStandaloneMode()) return;
      content.innerHTML = instructions();
      lastTrigger = documentRef.activeElement;
      if (typeof installModal.showModal === "function") installModal.showModal();
      else installModal.hidden = false;
      documentRef.querySelector("#installModalClose")?.focus();
    }

    function closeInstallInstructions() {
      const installModal = modal();
      if (!installModal) return;
      if (typeof installModal.close === "function" && installModal.open) installModal.close();
      installModal.hidden = true;
      lastTrigger?.focus?.();
      lastTrigger = null;
    }

    async function install() {
      if (!deferredPrompt) {
        openInstallInstructions();
        return;
      }
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      updateVisibility();
    }

    function initialize() {
      const installButton = button();
      installButton?.addEventListener("click", () => void install());
      documentRef.querySelector("#installModalClose")?.addEventListener("click", closeInstallInstructions);
      modal()?.addEventListener("cancel", closeInstallInstructions);
      windowRef.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        deferredPrompt = event;
        updateVisibility();
      });
      windowRef.addEventListener("appinstalled", () => {
        deferredPrompt = null;
        updateVisibility();
      });
      updateVisibility();
    }

    return { closeInstallInstructions, initialize, install, isStandaloneMode, openInstallInstructions, platform };
  }

  global.PadelstarPwaInstall = { create };
})(window);
