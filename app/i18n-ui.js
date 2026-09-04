(() => {
  const flagImageUrl = (languageCode) => {
    const countryByLanguage = { nb: "no", nn: "no", en: "gb", es: "es", de: "de", fr: "fr", sv: "se", da: "dk" };
    return `https://flagcdn.com/h60/${countryByLanguage[languageCode] ?? "un"}.png`;
  };

  const flagImageSrcset = (languageCode) => {
    const countryByLanguage = { nb: "no", nn: "no", en: "gb", es: "es", de: "de", fr: "fr", sv: "se", da: "dk" };
    return `https://flagcdn.com/h120/${countryByLanguage[languageCode] ?? "un"}.png 2x`;
  };

  function resolveDeviceLanguage({ navigatorRef, fallbackLanguage, i18n }) {
    const candidates = [navigatorRef?.language, ...(navigatorRef?.languages ?? [])].filter(Boolean);
    for (const candidate of candidates) {
      const normalized = i18n?.normalizeLanguage(candidate);
      if (normalized && i18n?.supportedLanguages?.().some((item) => item.code === normalized)) return normalized;
    }
    return i18n?.normalizeLanguage(fallbackLanguage) ?? fallbackLanguage;
  }

  function loadUserLanguage({ storage, storageKey, fallbackLanguage = "nb", i18n, navigatorRef = typeof navigator !== "undefined" ? navigator : null, onMode }) {
    const storedLanguage = storage.getItem(storageKey);
    const manualLanguage = storedLanguage && storedLanguage !== "device" ? storedLanguage : null;
    const mode = manualLanguage ? "manual" : "device";
    const language = mode === "manual" ? manualLanguage : resolveDeviceLanguage({ navigatorRef, fallbackLanguage, i18n });
    const normalized = i18n?.normalizeLanguage(language) ?? language;
    onMode?.(mode);
    return normalized;
  }

  function syncLanguageOptions({ select, i18n, currentLanguage = "nb", languageMode = "device" }) {
    if (!select || !i18n?.supportedLanguages) return;
    select.replaceChildren();
    const deviceOption = document.createElement("option");
    deviceOption.value = "device";
    deviceOption.textContent = i18n.translate(currentLanguage, "language.followDevice");
    select.append(deviceOption);
    const languages = i18n.supportedLanguages();
    languages.forEach((language) => {
      const option = document.createElement("option");
      option.value = language.code;
      option.textContent = language.label;
      select.append(option);
    });
    select.value = languageMode === "device" ? "device" : currentLanguage;

    const picker = select.closest(".language-picker");
    const options = picker?.querySelector(".language-options");
    if (!picker || !options) return;
    picker.classList.add("language-picker-enhanced");
    options.replaceChildren();
    const deviceButton = document.createElement("button");
    deviceButton.type = "button";
    deviceButton.className = "language-option";
    deviceButton.dataset.language = "device";
    deviceButton.setAttribute("role", "option");
    deviceButton.innerHTML = `<span class="language-option-flag language-option-globe" aria-hidden="true">🌐</span><span>${i18n.translate(currentLanguage, "language.followDevice")}</span>`;
    deviceButton.addEventListener("click", () => {
      select.value = "device";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      picker.querySelector(".language-menu")?.removeAttribute("open");
    });
    options.append(deviceButton);
    languages.forEach((language) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "language-option";
      option.dataset.language = language.code;
      option.setAttribute("role", "option");
      option.innerHTML = `<img class="language-option-flag" src="${flagImageUrl(language.code)}" srcset="${flagImageSrcset(language.code)}" alt="${language.label}" width="24" height="18"><span>${language.label}</span>`;
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
      elements.languageSelect.value = state.settings.languageMode === "device" ? "device" : language;
      const selected = i18n?.supportedLanguages?.().find((item) => item.code === language);
      const picker = elements.languageSelect.closest(".language-picker");
      const currentFlag = picker?.querySelector(".language-current-flag");
      const currentName = picker?.querySelector(".language-current-name");
      if (currentFlag) {
        currentFlag.src = flagImageUrl(language);
        currentFlag.srcset = flagImageSrcset(language);
        currentFlag.alt = language === "nb" ? "Norsk Bokmål" : selected?.label ?? language;
      }
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

  window.PadelstarI18nUi = { loadUserLanguage, syncLanguageOptions, applyLanguage, resolveDeviceLanguage };
})();
