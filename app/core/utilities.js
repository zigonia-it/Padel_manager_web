(function attachUtilities(global) {
  function create({ document = global.document, random = Math.random } = {}) {
    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;",
      })[character]);
    }

    function escapeAttribute(value) {
      return escapeHtml(value);
    }

    function appendEmptyText(container, emptyText) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = emptyText;
      container.append(empty);
    }

    function createInviteCode() {
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      return Array.from({ length: 8 }, () => alphabet[Math.floor(random() * alphabet.length)]).join("");
    }

    function slugify(value) {
      return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "padelstar";
    }

    return Object.freeze({ escapeHtml, escapeAttribute, appendEmptyText, createInviteCode, slugify });
  }

  global.PadelstarUtilities = Object.freeze({ create });
}(window));
