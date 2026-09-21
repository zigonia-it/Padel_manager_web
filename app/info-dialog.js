// The guide and the privacy page open as a popup over the app (a dialog with the page inside a frame), with an X in the top
// right corner. Without JavaScript, or where <dialog> is unsupported, the links still work as ordinary links.
//
// The X belongs to the dialog, not to the page in the frame: on a phone the popup fills the screen, so if the frame ever stays
// blank (a slow or failed load, a browser that does not paint a frame inside a dialog) there must still be a way back. And if
// the page has not loaded properly within a few seconds the link simply opens the page as an ordinary page instead.
(function (global) {
  const PAGES = { guide: "guide.html", privacy: "privacy.html" };

  const LOAD_TIMEOUT_MS = 8000;

  function create({ document, t = (key) => key, navigate = (url) => global.location.assign(url), setTimer = (fn, ms) => global.setTimeout(fn, ms), clearTimer = (id) => global.clearTimeout(id) } = {}) {
    const dialog = document.querySelector("#infoDialog");
    const frame = document.querySelector("#infoDialogFrame");
    const title = document.querySelector("#infoDialogTitle");
    const closeButton = document.querySelector("#infoDialogClose");
    const supported = Boolean(dialog && frame && typeof dialog.showModal === "function");
    let returnFocus = null;
    let currentPage = null;
    let watchdog = null;

    // The page did not arrive (or something else came instead): leave the popup and open the page normally.
    function fallBack() {
      const page = currentPage;
      if (watchdog !== null) clearTimer(watchdog);
      watchdog = null;
      if (dialog?.open) dialog.close();
      if (page && PAGES[page]) navigate(PAGES[page]);
    }

    function loadedCorrectly() {
      try {
        const doc = frame.contentDocument;
        return Boolean(doc && doc.querySelector(".privacy-document"));
      } catch {
        return false;
      }
    }

    function open(page, label = "") {
      if (!supported || !PAGES[page]) return false;
      returnFocus = document.activeElement;
      currentPage = page;
      if (watchdog !== null) clearTimer(watchdog);
      watchdog = setTimer(fallBack, LOAD_TIMEOUT_MS);
      // ?embed=1 hides the page's own header (the popup has its own close button); the page follows the saved language itself.
      frame.src = `${PAGES[page]}?embed=1`;
      frame.title = label;
      if (title) title.textContent = label;
      if (!dialog.open) dialog.showModal();
      return true;
    }

    function close() {
      if (dialog?.open) dialog.close();
    }

    function frameLoaded() {
      // the frame also "loads" when its source is removed on close; only a page opened by a link counts
      if (!dialog?.open || !currentPage) return;
      if (!loadedCorrectly()) { fallBack(); return; }
      if (watchdog !== null) clearTimer(watchdog);
      watchdog = null;
      frame.contentWindow?.focus();
    }

    function bind() {
      if (!supported) return;
      document.addEventListener("click", (event) => {
        const link = event.target.closest?.("[data-info-dialog]");
        if (!link || event.defaultPrevented) return;
        // let "open in new tab" and modified clicks behave like normal links
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
        if (open(link.dataset.infoDialog, link.textContent.trim())) event.preventDefault();
      });
      // put the keyboard focus inside the page once it has loaded, so its own X and Escape work at once
      frame.addEventListener("load", frameLoaded);
      closeButton?.addEventListener("click", close);
      // clicking the dark area around the card closes it
      dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
      dialog.addEventListener("close", () => {
        if (watchdog !== null) clearTimer(watchdog);
        watchdog = null;
        currentPage = null;
        frame.removeAttribute("src");
        returnFocus?.focus?.();
        returnFocus = null;
      });
      // Escape pressed while the focus is inside the page in the frame
      global.addEventListener("message", (event) => {
        if (event.origin === global.location.origin && event.data?.type === "padelstar-close-info") close();
      });
    }

    return { open, close, bind, supported, fallBack, LOAD_TIMEOUT_MS };
  }

  global.PadelstarInfoDialog = { create, PAGES };
  if (global.document?.readyState !== "loading") {
    create({ document: global.document }).bind();
  } else {
    global.document.addEventListener("DOMContentLoaded", () => create({ document: global.document }).bind());
  }
})(window);
