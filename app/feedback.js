(function (global) {
  "use strict";

  // Beta feedback: a small dialog that posts to /api/feedback (an emailing serverless function on Vercel).
  // When that is not reachable or not configured (offline, local preview, missing settings) the user still gets a
  // ready-made e-mail draft, so a message is never lost.
  const ENDPOINT = "/api/feedback";
  const FALLBACK_EMAIL = "sigurd.grodem@live.no";
  const CATEGORIES = ["bug", "idea", "question", "other"];
  const MIN_MESSAGE = 5;
  const MAX_MESSAGE = 2000;
  const EMAIL_PATTERN = /^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]{2,}$/;

  function validate({ category, message, email }) {
    if (!CATEGORIES.includes(category)) return "category";
    const text = String(message ?? "").trim();
    if (text.length < MIN_MESSAGE) return "messageTooShort";
    if (text.length > MAX_MESSAGE) return "messageTooLong";
    const address = String(email ?? "").trim();
    if (address && (address.length > 200 || !EMAIL_PATTERN.test(address))) return "emailInvalid";
    return null;
  }

  function buildPayload({ category, message, email, website = "" }, context = {}) {
    return {
      category,
      message: String(message ?? "").trim(),
      email: String(email ?? "").trim(),
      website,
      context: {
        version: context.version ?? "",
        language: context.language ?? "",
        view: context.view ?? "",
        role: context.role ?? "",
        screen: context.screen ?? "",
        userAgent: context.userAgent ?? "",
      },
    };
  }

  // An e-mail draft with the same text, used when the message could not be sent from the app.
  function mailtoHref(payload) {
    const subject = `[Padelstar ${payload.context.version || ""}] ${payload.category}`.trim();
    const body = `${payload.message}\n\n--\nApp: ${payload.context.version} · ${payload.context.language} · ${payload.context.view}`;
    return `mailto:${FALLBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  // Resolves to { ok: true } or { ok: false, reason } where reason is one of
  // offline | notConfigured | rateLimited | invalid | failed
  async function send(payload, { fetchImpl = global.fetch?.bind(global), online = global.navigator?.onLine !== false } = {}) {
    if (!online) return { ok: false, reason: "offline" };
    if (!fetchImpl) return { ok: false, reason: "failed" };
    try {
      const response = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) return { ok: true };
      if (response.status === 503 || response.status === 404) return { ok: false, reason: "notConfigured" };
      if (response.status === 429) return { ok: false, reason: "rateLimited" };
      if (response.status === 400) return { ok: false, reason: "invalid" };
      return { ok: false, reason: "failed" };
    } catch {
      return { ok: false, reason: "failed" };
    }
  }

  function create({ document, t, escapeHtml, getContext, fetchImpl }) {
    let dialog = null;

    function context() {
      const base = getContext?.() ?? {};
      return {
        ...base,
        screen: `${global.innerWidth ?? "?"}x${global.innerHeight ?? "?"}`,
        userAgent: global.navigator?.userAgent ?? "",
      };
    }

    function ensureDialog() {
      if (dialog) return dialog;
      dialog = document.createElement("dialog");
      dialog.className = "app-confirm-dialog feedback-dialog";
      dialog.setAttribute("aria-labelledby", "feedbackTitle");
      document.body.append(dialog);
      return dialog;
    }

    function close() {
      dialog?.close?.();
    }

    function open() {
      ensureDialog().innerHTML = `
        <form class="app-confirm-card feedback-card" novalidate>
          <h2 id="feedbackTitle">${t("feedback.title")} <span class="feedback-beta">${t("feedback.beta")}</span></h2>
          <p class="hint">${t("feedback.intro")}</p>
          <label>${t("feedback.category")}
            <select name="category">${CATEGORIES.map((category) => `<option value="${category}">${t(`feedback.category.${category}`)}</option>`).join("")}</select>
          </label>
          <label>${t("feedback.message")}
            <textarea name="message" rows="5" maxlength="${MAX_MESSAGE}" placeholder="${escapeHtml(t("feedback.messagePlaceholder"))}" required></textarea>
          </label>
          <label>${t("feedback.email")}
            <input name="email" type="email" autocomplete="email" maxlength="200" placeholder="${escapeHtml(t("feedback.emailPlaceholder"))}">
          </label>
          <div class="feedback-trap" aria-hidden="true"><label>Website <input name="website" type="text" tabindex="-1" autocomplete="off"></label></div>
          <p class="hint feedback-privacy">${t("feedback.privacy")}</p>
          <div class="feedback-status" role="status" aria-live="polite"></div>
          <div class="dialog-actions">
            <button class="ghost" type="button" data-feedback="cancel">${t("feedback.cancel")}</button>
            <button class="primary" type="submit" data-feedback="send">${t("feedback.send")}</button>
          </div>
        </form>`;
      const form = dialog.querySelector("form");
      dialog.querySelector('[data-feedback="cancel"]').addEventListener("click", close);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        void submit(form);
      });
      dialog.showModal?.();
      form.elements.message.focus();
    }

    function showStatus(html, kind = "") {
      const status = dialog.querySelector(".feedback-status");
      status.className = `feedback-status ${kind}`;
      status.innerHTML = html;
    }

    async function submit(form) {
      const data = new FormData(form);
      const fields = { category: data.get("category"), message: data.get("message"), email: data.get("email"), website: data.get("website") };
      const problem = validate(fields);
      if (problem) {
        showStatus(`<p class="feedback-error">${t(`feedback.error.${problem}`)}</p>`, "error");
        return;
      }
      const payload = buildPayload(fields, context());
      const sendButton = dialog.querySelector('[data-feedback="send"]');
      sendButton.disabled = true;
      showStatus(`<p>${t("feedback.sending")}</p>`);
      const result = await send(payload, fetchImpl ? { fetchImpl } : {});
      if (result.ok) {
        form.reset();
        showStatus(`<p class="feedback-thanks">${t("feedback.thanks")}</p>`, "success");
        dialog.querySelector('[data-feedback="cancel"]').textContent = t("feedback.close");
        sendButton.hidden = true;
        return;
      }
      sendButton.disabled = false;
      // The text stays in the form; offer a mail draft so nothing is lost.
      showStatus(`<p class="feedback-error">${t(`feedback.error.${result.reason}`)}</p>
        <p><a class="button secondary" href="${escapeHtml(mailtoHref(payload))}">${t("feedback.emailInstead")}</a></p>`, "error");
    }

    // Any element with data-feedback-open (footer link, menu entry) opens the dialog.
    function bind(root = document) {
      root.querySelectorAll("[data-feedback-open]").forEach((element) => {
        if (element.dataset.feedbackBound) return;
        element.dataset.feedbackBound = "true";
        element.addEventListener("click", (event) => {
          event.preventDefault();
          open();
        });
      });
    }

    return { open, close, bind };
  }

  global.PadelstarFeedback = { create, validate, buildPayload, mailtoHref, send, CATEGORIES, ENDPOINT, FALLBACK_EMAIL };
})(window);
