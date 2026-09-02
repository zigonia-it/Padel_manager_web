(function initializeAvatarSystem(global) {
  const options = [
    { id: "smash", name: "Sophie" },
    { id: "serve", name: "Aiden" },
    { id: "wall", name: "Luna" },
    { id: "lob", name: "Milo" },
  ];

  global.PadelstarAvatarSystem = Object.freeze({
    defaultAvatarId: options[0].id,
    options: Object.freeze(options),
    url(player) {
      const seed = encodeURIComponent(`${player.name ?? "Sophie"}-${player.avatarId ?? options[0].id}`);
      return `https://api.dicebear.com/10.x/lorelei-neutral/svg?seed=${seed}&size=128`;
    },
  });
})(window);
