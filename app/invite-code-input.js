window.PadelstarInviteCodeInput = (() => {
  const cellCount = 8;

  function create({ elements }) {
    function cells() {
      return [...elements.joinTournamentForm.querySelectorAll(".invite-code-cell")];
    }

    function hiddenField() {
      return elements.joinTournamentForm.elements.inviteCode;
    }

    function focusCell(index) {
      cells()[Math.max(0, Math.min(cellCount - 1, index))]?.focus();
    }

    function syncHiddenFromCells() {
      hiddenField().value = cells().map((cell) => cell.value).join("");
    }

    function syncCellsFromHidden() {
      const value = (hiddenField().value || "").toUpperCase();
      cells().forEach((cell, index) => { cell.value = value[index] ?? ""; });
    }

    function handleInput(event) {
      const cell = event.target;
      cell.value = cell.value.slice(-1).toUpperCase();
      syncHiddenFromCells();
      if (cell.value) focusCell(Number(cell.dataset.codeCellIndex) + 1);
    }

    function handleKeydown(event) {
      const cell = event.target;
      const index = Number(cell.dataset.codeCellIndex);
      if (event.key === "Backspace" && !cell.value) focusCell(index - 1);
      if (event.key === "ArrowLeft") focusCell(index - 1);
      if (event.key === "ArrowRight") focusCell(index + 1);
    }

    function handleFocus(event) {
      event.target.select();
    }

    function handlePaste(event) {
      event.preventDefault();
      const text = (event.clipboardData?.getData("text") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      cells().forEach((cell, index) => { cell.value = text[index] ?? ""; });
      syncHiddenFromCells();
      focusCell(Math.min(text.length, cellCount - 1));
    }

    function initialize() {
      cells().forEach((cell) => {
        cell.addEventListener("input", handleInput);
        cell.addEventListener("keydown", handleKeydown);
        cell.addEventListener("focus", handleFocus);
        cell.addEventListener("paste", handlePaste);
      });
    }

    return { initialize, syncCellsFromHidden };
  }

  return { create };
})();
