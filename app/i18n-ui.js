(() => {
  function loadUserLanguage({ storage, storageKey, fallbackLanguage = "nb", i18n }) {
    const storedLanguage = storage.getItem(storageKey);
    const language = storedLanguage || fallbackLanguage;
    const normalized = i18n?.normalizeLanguage(language) ?? language;
    if (!storedLanguage) storage.setItem(storageKey, normalized);
    return normalized;
  }

  function syncLanguageOptions({ select, i18n }) {
    if (!select || !i18n?.supportedLanguages) return;
    select.replaceChildren();
    const languages = i18n.supportedLanguages();
    languages.forEach((language) => {
      const option = document.createElement("option");
      option.value = language.code;
      option.textContent = language.label;
      select.append(option);
    });

    const picker = select.closest(".language-picker");
    const options = picker?.querySelector(".language-options");
    if (!picker || !options) return;
    picker.classList.add("language-picker-enhanced");
    options.replaceChildren();
    languages.forEach((language) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "language-option";
      option.dataset.language = language.code;
      option.setAttribute("role", "option");
      option.innerHTML = `<span aria-hidden="true">${language.flag ?? "🌐"}</span><span>${language.label}</span>`;
      option.addEventListener("click", () => {
        select.value = language.code;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        picker.querySelector(".language-menu")?.removeAttribute("open");
      });
      options.append(option);
    });
  }

  function applyLanguage({ state, elements, i18n, translate, applyTheme }) {
    const language = i18n?.normalizeLanguage(state.settings.language) ?? state.settings.language ?? "nb";
    state.settings.language = language;
    document.documentElement.lang = i18n?.htmlLang(language) ?? (language === "en" ? "en" : "no");
    if (elements.languageSelect) {
      elements.languageSelect.value = language;
      const selected = i18n?.supportedLanguages?.().find((item) => item.code === language);
      const picker = elements.languageSelect.closest(".language-picker");
      const currentFlag = picker?.querySelector(".language-current-flag");
      const currentName = picker?.querySelector(".language-current-name");
      if (currentFlag) currentFlag.textContent = selected?.flag ?? "🌐";
      if (currentName) currentName.textContent = selected?.label ?? language;
      picker?.querySelectorAll(".language-option").forEach((option) => {
        const isSelected = option.dataset.language === language;
        option.setAttribute("aria-selected", String(isSelected));
      });
    }

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = translate(node.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
      node.setAttribute("aria-label", translate(node.dataset.i18nAriaLabel));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      node.setAttribute("placeholder", translate(node.dataset.i18nPlaceholder));
    });
    document.querySelectorAll("[data-i18n-alt]").forEach((node) => {
      node.setAttribute("alt", translate(node.dataset.i18nAlt));
    });
    document.querySelectorAll("[data-i18n-content]").forEach((node) => {
      node.setAttribute("content", translate(node.dataset.i18nContent));
    });
    applyTheme?.();
  }

  window.PadelstarI18nUi = { loadUserLanguage, syncLanguageOptions, applyLanguage };
})();
