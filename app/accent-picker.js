window.PadelstarAccentPicker = (() => {
  function create({ palette }) {
    function labelFor(key) {
      return key.charAt(0).toUpperCase() + key.slice(1);
    }

    function renderSwatches(container, name, selected) {
      if (!container) return;
      container.innerHTML = Object.entries(palette).map(([key, hex]) => `
        <label class="accent-swatch" style="--swatch-color: ${hex}">
          <input type="radio" name="${name}" value="${key}" ${key === selected ? "checked" : ""}>
          <span class="sr-only">${labelFor(key)}</span>
        </label>`).join("");
    }

    function setSelected(container, accent) {
      if (!container) return;
      container.querySelectorAll("input[type=radio]").forEach((input) => {
        input.checked = input.value === accent;
      });
    }

    return { renderSwatches, setSelected };
  }

  return { create };
})();
