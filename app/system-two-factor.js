// Two-factor step of the system administration page (admin.html): the owner enters a code from an authenticator app
// (TOTP, Supabase Auth MFA) or, the first time, sets the app up by scanning a QR code. The page shows no administration
// data before this has succeeded, and the database refuses every owner function to a session that has not passed it
// (is_system_owner() requires the assurance level aal2), so this page is only the way to get such a session.
(function (global) {
  const TEXT = {
    nb: {
      tfTitle: "Bekreft med autentiseringsappen", tfIntro: "Skriv inn den 6-sifrede koden fra autentiseringsappen din for å åpne systemadministrasjonen.",
      tfSetupTitle: "Sett opp tofaktor", tfSetupIntro: "Systemadministrasjonen krever en kode fra en autentiseringsapp i tillegg til innloggingen. Sett den opp én gang:",
      tfStep1: "Åpne autentiseringsappen din. Alle apper som støtter engangskoder (TOTP, 6 sifre) fungerer, for eksempel Google Authenticator, Microsoft Authenticator eller 1Password.",
      tfStep2: "Skann QR-koden, eller skriv inn nøkkelen under for hånd.", tfStep3: "Skriv inn den 6-sifrede koden appen viser.",
      tfBackup: "Sikkerhetskopi: skann QR-koden på to enheter nå (for eksempel telefon og nettbrett), eller lagre nøkkelen i en passordbehandler. Mister du appen uten sikkerhetskopi, må tofaktoren nullstilles i databasen.",
      tfQrAlt: "QR-kode for autentiseringsappen", tfSecret: "Nøkkel", tfCode: "Kode", tfConfirm: "Bekreft", tfActivate: "Aktiver og åpne",
      tfWrongCode: "Feil kode. Vent på neste kode i appen og prøv igjen.", tfBadFormat: "Skriv inn 6 sifre.", tfBusy: "Sjekker …",
      tfUnavailable: "Tofaktor kunne ikke settes opp. Sjekk at MFA med autentiseringsapp (TOTP) er slått på i Supabase (Authentication, Multi-Factor), og last siden på nytt.",
      tfFactorsFailed: "Kunne ikke sjekke tofaktor. Last siden på nytt.",
    },
    en: {
      tfTitle: "Confirm with your authenticator app", tfIntro: "Enter the 6-digit code from your authenticator app to open system administration.",
      tfSetupTitle: "Set up two-factor", tfSetupIntro: "System administration needs a code from an authenticator app on top of signing in. Set it up once:",
      tfStep1: "Open your authenticator app. Any app that supports one-time codes (TOTP, 6 digits) works, for example Google Authenticator, Microsoft Authenticator or 1Password.",
      tfStep2: "Scan the QR code, or type the key below by hand.", tfStep3: "Enter the 6-digit code the app shows.",
      tfBackup: "Backup: scan the QR code on two devices now (for example a phone and a tablet), or save the key in a password manager. If you lose the app without a backup, the two-factor has to be reset in the database.",
      tfQrAlt: "QR code for the authenticator app", tfSecret: "Key", tfCode: "Code", tfConfirm: "Confirm", tfActivate: "Activate and open",
      tfWrongCode: "Wrong code. Wait for the next code in the app and try again.", tfBadFormat: "Enter 6 digits.", tfBusy: "Checking …",
      tfUnavailable: "Two-factor could not be set up. Check that MFA with an authenticator app (TOTP) is switched on in Supabase (Authentication, Multi-Factor), and reload the page.",
      tfFactorsFailed: "Could not check two-factor. Reload the page.",
    },
  };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const groups = (secret) => String(secret ?? "").replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();

  function codeForm(t, buttonLabel) {
    return `<form class="system-admin-two-factor-form" novalidate>
      <label>${escapeHtml(t.tfCode)}
        <input name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="123456" aria-describedby="twoFactorError" required>
      </label>
      <button type="submit" class="primary">${escapeHtml(buttonLabel)}</button>
      <p class="system-admin-two-factor-error" id="twoFactorError" data-two-factor-error role="alert"></p>
    </form>`;
  }

  function challengeMarkup(t) {
    return `<section class="system-admin-two-factor" aria-labelledby="twoFactorTitle"><h2 id="twoFactorTitle">${escapeHtml(t.tfTitle)}</h2><p>${escapeHtml(t.tfIntro)}</p>${codeForm(t, t.tfConfirm)}</section>`;
  }

  function enrollMarkup(t, { qr, secret } = {}) {
    return `<section class="system-admin-two-factor" aria-labelledby="twoFactorTitle"><h2 id="twoFactorTitle">${escapeHtml(t.tfSetupTitle)}</h2><p>${escapeHtml(t.tfSetupIntro)}</p>
      <ol><li>${escapeHtml(t.tfStep1)}</li><li>${escapeHtml(t.tfStep2)}</li><li>${escapeHtml(t.tfStep3)}</li></ol>
      <div class="system-admin-two-factor-key">
        <img class="system-admin-two-factor-qr" alt="${escapeHtml(t.tfQrAlt)}" width="176" height="176" src="${escapeHtml(qr)}">
        <p><span>${escapeHtml(t.tfSecret)}</span><code>${escapeHtml(groups(secret))}</code></p>
      </div>
      <p class="hint">${escapeHtml(t.tfBackup)}</p>${codeForm(t, t.tfActivate)}</section>`;
  }

  async function loadFactors(client) {
    const { data, error } = await client.auth.mfa.listFactors();
    if (error) return { error };
    const all = data?.all ?? [];
    return {
      verified: (data?.totp ?? all.filter((f) => f.factor_type === "totp" && f.status === "verified")).filter((f) => f.status !== "unverified"),
      stale: all.filter((f) => f.factor_type === "totp" && f.status === "unverified"),
    };
  }

  // Shows the code form (or the set-up first) and resolves true once the session has passed the second factor, false when
  // it could not be started. Wrong codes keep the form open.
  async function run({ client, container, t }) {
    const show = (message) => { container.hidden = false; container.innerHTML = `<p class="system-admin-two-factor-error" role="alert">${escapeHtml(message)}</p>`; };
    let factors;
    try { factors = await loadFactors(client); } catch { factors = { error: true }; }
    if (factors.error) { show(t.tfFactorsFailed); return false; }

    let factorId;
    if (factors.verified.length) {
      factorId = factors.verified[0].id;
      container.innerHTML = challengeMarkup(t);
    } else {
      // an abandoned set-up leaves an unverified factor behind; remove it so a new one can be made
      for (const stale of factors.stale) { try { await client.auth.mfa.unenroll({ factorId: stale.id }); } catch { /* the new factor is enrolled anyway */ } }
      let enrolled;
      try { enrolled = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: `Padelstar ${new Date().toISOString().slice(0, 16)}`, issuer: "Padelstar" }); } catch { enrolled = { error: true }; }
      if (enrolled.error || !enrolled.data?.id) { show(t.tfUnavailable); return false; }
      factorId = enrolled.data.id;
      container.innerHTML = enrollMarkup(t, { qr: enrolled.data.totp?.qr_code, secret: enrolled.data.totp?.secret });
    }
    container.hidden = false;

    const form = container.querySelector("form");
    const errorNode = container.querySelector("[data-two-factor-error]");
    const button = container.querySelector("button[type=submit]");
    return new Promise((resolve) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const code = String(form.elements.code.value ?? "").replace(/\s+/g, "");
        if (!/^\d{6}$/.test(code)) { errorNode.textContent = t.tfBadFormat; return; }
        errorNode.textContent = "";
        button.disabled = true;
        let result;
        try { result = await client.auth.mfa.challengeAndVerify({ factorId, code }); } catch { result = { error: true }; }
        button.disabled = false;
        if (result.error) { errorNode.textContent = t.tfWrongCode; form.elements.code.value = ""; return; }
        container.hidden = true;
        container.innerHTML = "";
        resolve(true);
      });
    });
  }

  global.PadelstarSystemTwoFactor = { TEXT, challengeMarkup, enrollMarkup, run, groups };
})(window);
