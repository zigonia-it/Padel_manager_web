// The guide and the privacy page open as a popup over the app (a dialog with the page inside a frame), with an X in the top
// right corner. Without JavaScript, or where <dialog> is unsupported, the links still work as ordinary links.
(function (global) {
  const PAGES = { guide: "guide.html", privacy: "privacy.html" };

  function create({ document, t = (key) => key } = {}) {
    const dialog = document.querySelector("#infoDialog");
    const frame = document.querySelector("#infoDialogFrame");
    const title = document.querySelector("#infoDialogTitle");
    const supported = Boolean(dialog && frame && typeof dialog.showModal === "function");
    let returnFocus = null;

    function open(page, label = "") {
      if (!supported || !PAGES[page]) return false;
      returnFocus = document.activeElement;
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
      frame.addEventListener("load", () => { if (dialog.open) frame.contentWindow?.focus(); });
      // clicking the dark area around the card closes it
      dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
      dialog.addEventListener("close", () => {
        frame.removeAttribute("src");
        returnFocus?.focus?.();
        returnFocus = null;
      });
      // Escape pressed while the focus is inside the page in the frame
      global.addEventListener("message", (event) => {
        if (event.origin === global.location.origin && event.data?.type === "padelstar-close-info") close();
      });
    }

    return { open, close, bind, supported };
  }

  global.PadelstarInfoDialog = { create, PAGES };
  if (global.document?.readyState !== "loading") {
    create({ document: global.document }).bind();
  } else {
    global.document.addEventListener("DOMContentLoaded", () => create({ document: global.document }).bind());
  }
})(window);
