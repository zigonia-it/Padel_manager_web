(function initializeAccentSystem(global) {
  const palette = {
    blue: "#1a59f2",
    orange: "#e67a0a",
    mint: "#148f42",
    pink: "#d12e52",
    indigo: "#7030d1",
    teal: "#0a8080",
    red: "#c70a33",
    yellow: "#b88c00",
    gold: "#f0b52e",
    silver: "#616b7a",
    bronze: "#9e560f",
    sapphire: "#052e9e",
    emerald: "#0a7538",
    garnet: "#991020",
    amethyst: "#8524b8",
    onyx: "#1f2126",
  };
  const legacyAccentMap = { green: "mint", clay: "bronze", navy: "sapphire", coral: "orange" };
  const accents = Object.keys(palette);

  function hexToRgb(hex) {
    const normalized = hex.replace("#", "");
    return [
      Number.parseInt(normalized.slice(0, 2), 16),
      Number.parseInt(normalized.slice(2, 4), 16),
      Number.parseInt(normalized.slice(4, 6), 16),
    ];
  }

  function rgbToHex([r, g, b]) {
    return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
  }

  function mixHex(hex, targetHex, amount) {
    const source = hexToRgb(hex);
    const target = hexToRgb(targetHex);
    return rgbToHex(source.map((value, index) => value + (target[index] - value) * amount));
  }

  function normalizeAccent(accent, fallbackIndex = 0) {
    if (palette[accent]) return accent;
    if (legacyAccentMap[accent]) return legacyAccentMap[accent];
    return accents[fallbackIndex % accents.length];
  }

  function accentStyle(accent) {
    const base = palette[normalizeAccent(accent)] ?? palette.gold;
    const light = mixHex(base, "#ffffff", 0.28);
    const dark = mixHex(base, "#000000", 0.18);
    const [r, g, b] = hexToRgb(base);
    return `--player-accent: ${base}; --player-accent-light: ${light}; --player-accent-dark: ${dark}; --player-accent-rgb: ${r}, ${g}, ${b};`;
  }

  global.PadelstarAccentSystem = Object.freeze({
    accentStyle,
    accents: Object.freeze(accents),
    legacyAccentMap: Object.freeze(legacyAccentMap),
    normalizeAccent,
    palette: Object.freeze(palette),
  });
})(window);
