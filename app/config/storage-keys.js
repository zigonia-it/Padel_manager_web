(function attachStorageKeys(global) {
  const storageKey = "padelstar-demo";

  global.PadelstarStorageKeys = Object.freeze({
    legacyStorageKey: "padel-manager-demo",
    legacyRoleStorageKey: "padel-manager-role",
    storageKey,
    roleStorageKey: "padelstar-role",
    languageStorageKey: "padelstar-language",
    profileStorageKey: "padelstar-profile",
    profileHistoryStorageKey: "padelstar-profile-history",
    tournamentHistoryStorageKey: "padelstar-tournament-history",
    notificationPreferenceKey: "padelstar-notifications",
    pushSubscriptionStorageKey: "padelstar-push-subscription",
    syncStorageKey: `${storageKey}-sync`,
    recoveryStorageKey: `${storageKey}-last-good`,
    tournamentLibraryStorageKey: "padelstar-tournament-library",
  });
}(window));
