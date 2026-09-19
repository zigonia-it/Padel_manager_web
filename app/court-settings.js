(function attachPadelstarCourtSettings(global) {
  "use strict";

  function parseCourtNumbers(value) {
    const numbers = String(value)
      .split(/[\s,;]+/)
      .map((item) => Number.parseInt(item, 10))
      .filter((item) => Number.isInteger(item) && item > 0 && item <= 99);
    const uniqueNumbers = [...new Set(numbers)].slice(0, 12).sort((left, right) => left - right);
    return uniqueNumbers.length ? uniqueNumbers : [1];
  }

  function create({ elements, getState, translate, escapeAttribute, escapeHtml }) {
    // The court names are edited in the Styring tab and in the lobby: the same rows and the same lock in both.
    function renderCourtNamesInto(list, form) {
      const state = getState();
      if (!list) return;
      const locked = state.rounds.length > 0 || state.status === "Avsluttet";
      // do not rebuild the rows while the person is typing in one of them
      if (list.contains?.(global.document?.activeElement) && list.dataset.locked === String(locked) && list.children.length === state.courts.length) return;
      list.dataset.locked = String(locked);
      list.innerHTML = state.courts.map((court) => `
    <label class="court-name-row">
      <span>${escapeHtml(translate("common.court"))} ${court.courtNumber}</span>
      <input name="courtName" type="text" maxlength="80" value="${escapeAttribute(court.name ?? "")}" placeholder="${escapeAttribute(translate("common.court"))} ${court.courtNumber}" ${locked ? "disabled" : ""}>
    </label>`).join("");
      const submitButton = form?.querySelector("button");
      if (submitButton) submitButton.disabled = locked;
      const countInput = form?.elements.courtCount;
      if (countInput) {
        countInput.disabled = locked;
        if (global.document?.activeElement !== countInput) countInput.value = String(state.courts.length);
      }
    }

    function renderCourtNames() {
      renderCourtNamesInto(elements.courtNamesList, elements.courtNamesForm);
      renderCourtNamesInto(elements.lobbyCourtNamesList, elements.lobbyCourtNamesForm);
    }

    function localizeGeneratedCourtNames() {
      const state = getState();
      const courtPattern = /^(Bane|Court|Pista|Platz|Terrain|Bana)\s+\d+$/i;
      const courtName = (court) => `${translate("common.court")} ${court.courtNumber}`;
      const previousNames = new Map(state.courts.map((court) => [court.id, court.name]));
      state.courts.forEach((court) => {
        if (courtPattern.test(String(court.name ?? ""))) court.name = courtName(court);
      });
      state.rounds.flatMap((round) => round.matches ?? []).forEach((match) => {
        if (courtPattern.test(String(match.courtName ?? ""))) {
          const court = state.courts.find((item) => item.courtNumber === match.plannedCourtIndex + 1 || previousNames.get(item.id) === match.courtName);
          if (court) match.courtName = courtName(court);
        }
      });
    }

    function courtsInputValue() {
      return getState().courts.map((court) => court.courtNumber).join(", ");
    }

    return { courtsInputValue, localizeGeneratedCourtNames, renderCourtNames };
  }

  global.PadelstarCourtSettings = { create, parseCourtNumbers };
})(window);
