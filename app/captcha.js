// "I'm not a robot" check for sign-up, sign-in and sign-in links (Cloudflare Turnstile).
//
// Off until a site key is configured (supabase-config.js: captchaSiteKey). With a key, every protected action first opens a small
// dialog with the Turnstile checkbox; the token it returns goes to Supabase Auth as options.captchaToken. Turnstile tokens work once,
// so each action gets a fresh widget. Supabase checks the token with the secret key set under Authentication -> Attack Protection;
// this file never sees that secret.
(function (global) {
  const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

  function create({ document = global.document, window = global, getSiteKey = () => window.PADELSTAR_SUPABASE?.captchaSiteKey, translate = (key) => key, loadScript } = {}) {
    let scriptPromise = null;

    const siteKey = () => String(getSiteKey?.() ?? "").trim();
    const enabled = () => siteKey() !== "";

    function ensureScript() {
      if (window.turnstile) return Promise.resolve(window.turnstile);
      if (scriptPromise) return scriptPromise;
      scriptPromise = new Promise((resolve, reject) => {
        const add = loadScript ?? ((src, done, fail) => {
          const script = document.createElement("script");
          script.src = src; script.async = true; script.onload = done; script.onerror = fail;
          document.head.append(script);
        });
        add(SCRIPT_URL, () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing"))), () => reject(new Error("turnstile blocked")));
      }).catch((error) => { scriptPromise = null; throw error; });
      return scriptPromise;
    }

    // Resolves with a token (string), null when the person closes the dialog or the check cannot load, and undefined when no check is configured.
    async function challenge() {
      if (!enabled()) return undefined;
      const dialog = document.querySelector("#captchaDialog");
      const slot = document.querySelector("#captchaSlot");
      const notice = document.querySelector("#captchaNotice");
      if (!dialog || !slot) return null;
      if (notice) notice.textContent = "";
      slot.replaceChildren();
      let turnstile;
      try { turnstile = await ensureScript(); } catch { if (notice) notice.textContent = translate("captcha.unavailable"); return null; }

      return new Promise((resolve) => {
        let widgetId = null;
        let settled = false;
        const finish = (value) => {
          if (settled) return;
          settled = true;
          try { if (widgetId !== null) turnstile.remove(widgetId); } catch { /* already gone */ }
          slot.replaceChildren();
          dialog.removeEventListener("close", onClose);
          if (dialog.open) dialog.close();
          resolve(value);
        };
        const onClose = () => finish(null);
        dialog.addEventListener("close", onClose);
        widgetId = turnstile.render(slot, {
          sitekey: siteKey(),
          theme: document.documentElement?.dataset?.theme === "light" ? "light" : "dark",
          callback: (token) => finish(token),
          "error-callback": () => { if (notice) notice.textContent = translate("captcha.failed"); },
          "expired-callback": () => { if (notice) notice.textContent = translate("captcha.expired"); },
        });
        if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");
      });
    }

    return { enabled, challenge, siteKey };
  }

  global.PadelstarCaptcha = { create, SCRIPT_URL };
})(window);
