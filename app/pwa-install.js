(function initializePadelstarPwaInstall(global) {
  "use strict";

  function create({ documentRef = global.document, navigatorRef = global.navigator, windowRef = global, translate = null }) {
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
      const t = (key) => translate?.(key) ?? key;
      const labels = {
        ios: [t("pwa.iosTitle"), [t("pwa.iosStep1"), t("pwa.iosStep2"), t("pwa.iosStep3"), t("pwa.iosStep4")]],
        android: [t("pwa.androidTitle"), [t("pwa.androidStep1"), t("pwa.androidStep2"), t("pwa.androidStep3"), t("pwa.androidStep4")]],
        windows: [t("pwa.windowsTitle"), [t("pwa.windowsStep1"), t("pwa.windowsStep2"), t("pwa.windowsStep3"), t("pwa.windowsStep4")]],
        macos: [t("pwa.macosTitle"), [t("pwa.macosStep1"), t("pwa.macosStep2"), t("pwa.macosStep3"), t("pwa.macosStep4")]],
        chromeos: [t("pwa.chromeosTitle"), [t("pwa.chromeosStep1"), t("pwa.chromeosStep2"), t("pwa.chromeosStep3"), t("pwa.chromeosStep4")]],
        generic: [t("pwa.genericTitle"), [t("pwa.genericStep1"), t("pwa.genericStep2"), t("pwa.genericStep3")]],
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
