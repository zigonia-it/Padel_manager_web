(function attachTheme(global) {
  function create({ document = global.document } = {}) {
    function applyTheme() {
      document.body.dataset.theme = "classic";
      const themeColor = document.querySelector('meta[name="theme-color"]');
      themeColor?.setAttribute("content", "#07101d");
    }

    return Object.freeze({ applyTheme });
  }

  global.PadelstarTheme = Object.freeze({ create });
}(window));
