(function initializeLinkUtils(global) {
  const publicAppUrl = "https://padelstar.app/";
  const spectatorQueryKey = "spectate";

  function isLocalDevelopment(location) {
    return ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  }

  function createTournamentLink({ location, inviteCode, queryKey }) {
    const url = new URL(isLocalDevelopment(location) ? location.origin : publicAppUrl);
    url.searchParams.set(queryKey, inviteCode);
    url.hash = "";
    return url.toString();
  }

  function createQrCodeUrl(text) {
    const params = new URLSearchParams({
      text,
      size: "360",
      margin: "2",
      format: "svg",
      dark: "16130e",
      light: "fbf5e6",
      ecLevel: "Q",
    });
    return `https://quickchart.io/qr?${params.toString()}`;
  }

  global.PadelstarLinks = Object.freeze({
    publicAppUrl,
    spectatorQueryKey,
    createJoinLink({ location, inviteCode }) {
      return createTournamentLink({ location, inviteCode, queryKey: "join" });
    },
    createSpectatorLink({ location, inviteCode }) {
      return createTournamentLink({ location, inviteCode, queryKey: spectatorQueryKey });
    },
    createQrCodeUrl,
  });
})(window);
