(function attachTheme(global) {
  function create({ document = global.document } = {}) {
    function applyTheme() {
      document.body.dataset.theme = "classic";
      // The browser bar colour (meta theme-color) follows the colour theme: app/color-mode.js owns it.
    }

    return Object.freeze({ applyTheme });
  }

  global.PadelstarTheme = Object.freeze({ create });
}(window));
