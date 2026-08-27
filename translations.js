const padelstarTranslations = {
  nb: {
    brandEyebrow: "Padel Manager",
    languageLabel: "Språk",
    localPwa: "Lokal",
    offline: "Offline",
    startTournament: "Start turnering",
    startNextRound: "Start neste runde",
    finishTournament: "Fullfør turnering",
    realtimeConnecting: "Kobler til",
    realtimeConnected: "Online",
    realtimeDisconnected: "Frakoblet",
    realtimeReconnecting: "Kobler til på nytt",
    realtimeError: "Tilkoblingsfeil",
    refreshRemoteState: "Last inn siste state",
    syncPending: "synkroniserer",
  },
  nn: {
    brandEyebrow: "Padel Manager",
    languageLabel: "Språk",
    localPwa: "Lokal",
    offline: "Fråkopla",
    startTournament: "Start turnering",
    startNextRound: "Start neste runde",
    finishTournament: "Fullfør turnering",
    realtimeConnecting: "Koplar til",
    realtimeConnected: "Online",
    realtimeDisconnected: "Fråkopla",
    realtimeReconnecting: "Koplar til på nytt",
    realtimeError: "Tilkoblinsfeil",
    refreshRemoteState: "Last inn siste state",
    syncPending: "synkroniserer",
  },
  en: {
    brandEyebrow: "Padel Manager",
    languageLabel: "Language",
    localPwa: "Local",
    offline: "Offline",
    startTournament: "Start tournament",
    startNextRound: "Start next round",
    finishTournament: "Finish tournament",
    realtimeConnecting: "Connecting",
    realtimeConnected: "Online",
    realtimeDisconnected: "Disconnected",
    realtimeReconnecting: "Reconnecting",
    realtimeError: "Connection error",
    refreshRemoteState: "Load latest state",
    syncPending: "syncing",
  },
};

window.PadelstarTranslations = padelstarTranslations;
window.PadelstarI18n = {
  translate(language, key) {
    return padelstarTranslations[language]?.[key] ?? padelstarTranslations.nb[key] ?? key;
  },
};
