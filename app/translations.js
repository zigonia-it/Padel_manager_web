const fallbackLanguage = "nb";

const padelstarLanguageMeta = [
  { code: "nb", label: "Bokmål", flag: "🇳🇴", fallback: "nb", htmlLang: "nb" },
  { code: "nn", label: "Nynorsk", flag: "🇳🇴", fallback: "nb", htmlLang: "nn" },
  { code: "en", label: "English", flag: "🇬🇧", fallback: "en", htmlLang: "en" },
  { code: "es", label: "Español", flag: "🇪🇸", fallback: "en", htmlLang: "es" },
  { code: "de", label: "Deutsch", flag: "🇩🇪", fallback: "en", htmlLang: "de" },
  { code: "fr", label: "Français", flag: "🇫🇷", fallback: "en", htmlLang: "fr" },
  { code: "sv", label: "Svenska", flag: "🇸🇪", fallback: "nb", htmlLang: "sv" },
  { code: "da", label: "Dansk", flag: "🇩🇰", fallback: "nb", htmlLang: "da" },
];

const padelstarTranslations = {
  nb: {
    brandEyebrow: "Padel Manager",
    languageLabel: "Språk",
    localPwa: "Offline",
    offline: "Offline",
    startTournament: "Start turnering",
    startNextRound: "Start neste runde",
    finishTournament: "Fullfør turnering",
    realtimeConnecting: "Kobler til",
    realtimeConnected: "Online",
    realtimeDisconnected: "Frakoblet",
    realtimeReconnecting: "Kobler til på nytt",
    realtimeError: "Tilkoblingsfeil",
    refreshRemoteState: "Last inn siste",
    syncPending: "sender",
    actions: {
      leaveTournament: "Forlat turnering",
      markAway: "Meld deg ute",
      returnToTournament: "Bli med igjen",
      viewAsSpectator: "Se som tilskuer",
      choosePlayer: "Velg spiller",
      joinAgain: "Bli med på nytt",
    },
    player: {
      leaveConfirm: "Forlate turneringen som {name}? Turneringen og spillerlisten beholdes for alle andre.{pendingScoreText}",
      leavePendingScores: " Ventende poeng fra denne enheten blir ikke sendt.",
      away: "Ute/reist",
    },
    status: {
      connectionAria: "Tilkoblingsstatus: {status}",
    },
  },
  nn: {
    brandEyebrow: "Padel Manager",
    languageLabel: "Språk",
    localPwa: "Offline",
    offline: "Fråkopla",
    startTournament: "Start turnering",
    startNextRound: "Start neste runde",
    finishTournament: "Fullfør turnering",
    realtimeConnecting: "Koplar til",
    realtimeConnected: "Online",
    realtimeDisconnected: "Fråkopla",
    realtimeReconnecting: "Koplar til på nytt",
    realtimeError: "Tilkoblingsfeil",
    refreshRemoteState: "Last inn siste",
    syncPending: "sender",
    actions: {
      leaveTournament: "Forlat turnering",
    },
    player: {
      leaveConfirm: "Forlate turneringa som {name}? Turneringa og spelarlista blir verande for alle andre.{pendingScoreText}",
      leavePendingScores: " Ventande poeng frå denne eininga blir ikkje sende.",
    },
    status: {
      connectionAria: "Tilkoblingsstatus: {status}",
    },
  },
  en: {
    brandEyebrow: "Padel Manager",
    languageLabel: "Language",
    localPwa: "Offline",
    offline: "Offline",
    startTournament: "Start tournament",
    startNextRound: "Start next round",
    finishTournament: "Finish tournament",
    realtimeConnecting: "Connecting",
    realtimeConnected: "Online",
    realtimeDisconnected: "Disconnected",
    realtimeReconnecting: "Reconnecting",
    realtimeError: "Connection error",
    refreshRemoteState: "Load latest",
    syncPending: "sending",
    actions: {
      leaveTournament: "Leave tournament",
    },
    player: {
      leaveConfirm: "Leave the tournament as {name}? The tournament and player list stay unchanged for everyone else.{pendingScoreText}",
      leavePendingScores: " Pending scores from this device will not be sent.",
    },
    status: {
      connectionAria: "Connection status: {status}",
    },
  },
  es: {
    brandEyebrow: "Padel Manager",
    languageLabel: "Idioma",
    localPwa: "Offline",
    offline: "Sin conexión",
    startTournament: "Iniciar torneo",
    startNextRound: "Iniciar siguiente ronda",
    finishTournament: "Finalizar torneo",
    realtimeConnecting: "Conectando",
    realtimeConnected: "Online",
    realtimeDisconnected: "Desconectado",
    realtimeReconnecting: "Reconectando",
    realtimeError: "Error de conexión",
    refreshRemoteState: "Cargar lo último",
    syncPending: "enviando",
    actions: {
      leaveTournament: "Salir del torneo",
    },
    player: {
      leaveConfirm: "¿Salir del torneo como {name}? El torneo y la lista de jugadores se mantienen para todos los demás.{pendingScoreText}",
      leavePendingScores: " Las puntuaciones pendientes de este dispositivo no se enviarán.",
    },
    status: {
      connectionAria: "Estado de conexión: {status}",
    },
  },
  de: {
    brandEyebrow: "Padel Manager",
    languageLabel: "Sprache",
    localPwa: "Offline",
    offline: "Offline",
    startTournament: "Turnier starten",
    startNextRound: "Nächste Runde starten",
    finishTournament: "Turnier abschließen",
    realtimeConnecting: "Verbinden",
    realtimeConnected: "Online",
    realtimeDisconnected: "Getrennt",
    realtimeReconnecting: "Erneut verbinden",
    realtimeError: "Verbindungsfehler",
    refreshRemoteState: "Neueste laden",
    syncPending: "sendet",
    actions: {
      leaveTournament: "Turnier verlassen",
    },
    player: {
      leaveConfirm: "Turnier als {name} verlassen? Das Turnier und die Spielerliste bleiben für alle anderen unverändert.{pendingScoreText}",
      leavePendingScores: " Ausstehende Punkte von diesem Gerät werden nicht gesendet.",
    },
    status: {
      connectionAria: "Verbindungsstatus: {status}",
    },
  },
  fr: {
    brandEyebrow: "Padel Manager",
    languageLabel: "Langue",
    localPwa: "Hors ligne",
    offline: "Hors ligne",
    startTournament: "Démarrer le tournoi",
    startNextRound: "Démarrer la manche suivante",
    finishTournament: "Terminer le tournoi",
    realtimeConnecting: "Connexion",
    realtimeConnected: "Online",
    realtimeDisconnected: "Déconnecté",
    realtimeReconnecting: "Reconnexion",
    realtimeError: "Erreur de connexion",
    refreshRemoteState: "Charger le dernier état",
    syncPending: "envoi",
    actions: {
      leaveTournament: "Quitter le tournoi",
    },
    player: {
      leaveConfirm: "Quitter le tournoi en tant que {name} ? Le tournoi et la liste des joueurs restent inchangés pour les autres.{pendingScoreText}",
      leavePendingScores: " Les scores en attente depuis cet appareil ne seront pas envoyés.",
    },
    status: {
      connectionAria: "État de connexion : {status}",
    },
  },
  sv: {
    brandEyebrow: "Padel Manager",
    languageLabel: "Språk",
    localPwa: "Offline",
    offline: "Offline",
    startTournament: "Starta turnering",
    startNextRound: "Starta nästa omgång",
    finishTournament: "Slutför turnering",
    realtimeConnected: "Online",
    realtimeDisconnected: "Frånkopplad",
    actions: { leaveTournament: "Lämna turneringen" },
    status: { connectionAria: "Anslutningsstatus: {status}" },
  },
  da: {
    brandEyebrow: "Padel Manager",
    languageLabel: "Sprog",
    localPwa: "Offline",
    startTournament: "Start turnering",
    startNextRound: "Start næste runde",
    finishTournament: "Afslut turnering",
    realtimeConnected: "Online",
    realtimeDisconnected: "Afbrudt",
    actions: { leaveTournament: "Forlad turneringen" },
    status: { connectionAria: "Forbindelsesstatus: {status}" },
  },
};

Object.assign(padelstarTranslations.nb, { "language.followDevice": "Følg enhetens språk" });
Object.assign(padelstarTranslations.nn, { "language.followDevice": "Følg eininga sitt språk" });
Object.assign(padelstarTranslations.en, { "language.followDevice": "Follow device language" });
Object.assign(padelstarTranslations.es, { "language.followDevice": "Seguir el idioma del dispositivo" });
Object.assign(padelstarTranslations.de, { "language.followDevice": "Gerätesprache verwenden" });
Object.assign(padelstarTranslations.fr, { "language.followDevice": "Suivre la langue de l’appareil" });
Object.assign(padelstarTranslations.sv, { "language.followDevice": "Följ enhetens språk" });
Object.assign(padelstarTranslations.da, { "language.followDevice": "Følg enhedens sprog" });
Object.assign(padelstarTranslations.nb, { "account.signingIn": "Logger inn …" });
Object.assign(padelstarTranslations.nn, { "account.signingIn": "Loggar inn …" });
Object.assign(padelstarTranslations.en, { "account.signingIn": "Signing in …" });
Object.assign(padelstarTranslations.es, { "account.signingIn": "Iniciando sesión …" });
Object.assign(padelstarTranslations.de, { "account.signingIn": "Anmeldung läuft …" });
Object.assign(padelstarTranslations.fr, { "account.signingIn": "Connexion …" });
Object.assign(padelstarTranslations.sv, { "account.signingIn": "Loggar in …" });
Object.assign(padelstarTranslations.da, { "account.signingIn": "Logger ind …" });
Object.assign(padelstarTranslations.nb, {
  "hero.featureOneTitle": "Enklere turneringer",
  "hero.featureOneText": "Opprett og organiser kamper uten unødvendig administrasjon.",
  "hero.featureTwoTitle": "Alle kan bli med",
  "hero.featureTwoText": "Del en kode og la spillerne koble seg på fra egne enheter.",
  "hero.featureThreeTitle": "Resultater i sanntid",
  "hero.featureThreeText": "Følg kamper, poeng og neste runde mens turneringen pågår.",
});

Object.assign(padelstarTranslations.nb, {
  "score.playerSubmitTitle": "Registrer kampresultat",
  "score.playerSubmitMatch": "Kamp",
  "score.teamOneGames": "Lag 1",
  "score.teamTwoGames": "Lag 2",
  "score.playerSubmitHint": "Begge lag kan sende inn. Ulike resultater må avklares av admin.",
  "score.conflict": "Konflikt",
  "score.confirmed": "Bekreftet",
  "score.conflictHint": "Resultatkonflikt: admin må avklare resultatet.",
  "score.conflictAdminHint": "Resultatkonflikt – bruk ‘Sett resultat’ for å korrigere.",
  "score.submissionsTitle": "Resultatforslag",
  "score.useSubmission": "Bruk resultat",
  "score.submitted": "Resultatet er sendt inn.",
  "actions.submitResult": "Send resultat",
  "actions.tvMode": "TV Mode",
  "actions.exitTvMode": "Avslutt TV Mode",
  "queue.title": "Banekø",
  "queue.courts": "{count} baner",
  "queue.inProgress": "Pågår",
  "queue.free": "Ledig",
  "queue.next": "Neste",
  "queue.later": "Deretter",
  "queue.empty": "Ingen kamper i kø akkurat nå.",
  "meta.description": "Padelstar - Padel Manager av Sigurd Steen Grødem / Zigonia IT. Administrer padelturneringer, kamper, baner og resultater.",
  "app.version": "v. 0.4 (Beta)",
  "hero.title": "Spill mer. Organiser mindre.",
  "hero.subtitle": "Opprett turneringen, inviter spillerne og la Padelstar ordne med resten.",
  "avatar.smash": "Smash",
  "avatar.serve": "Serve",
  "avatar.wall": "Vegg",
  "avatar.lob": "Lob",
  "nav.skipToContent": "Hopp til innhold",
  "nav.homeAria": "Gå til hjem",
  "nav.modulesAria": "Moduler",
  "nav.home": "Hjem",
  "nav.create": "Opprett",
  "nav.join": "Bli med",
  "nav.login": "Logg inn",
  "nav.account": "Konto",
  "account.eyebrow": "Personlig konto",
  "account.title": "Konto",
  "account.hint": "Opprett eller oppdater spillerprofilen din for å ta vare på egen statistikk og historikk.",
  "account.authEyebrow": "Innlogging",
  "account.authTitle": "Konto med passord",
  "account.email": "E-post",
  "account.password": "Passord",
  "account.signIn": "Logg inn",
  "account.signUp": "Opprett konto",
  "account.signOut": "Logg ut",
  "account.authSignedInAs": "Innlogget som: {name}",
  "account.accountUser": "konto",
  "account.authSignedIn": "Du er nå logget inn.",
  "account.authSignedOut": "Du er logget ut.",
  "account.authConfirmEmail": "Sjekk e-posten for å bekrefte kontoen før du logger inn.",
  "account.authUnavailable": "Konto-innlogging er ikke tilgjengelig akkurat nå.",
  "account.authFailed": "Innlogging kunne ikke fullføres. Kontroller e-post og passord.",
  "account.openLogin": "Logg inn med konto",
  "account.newPassword": "Nytt passord",
  "account.confirmPassword": "Bekreft passord",
  "account.newPasswordPlaceholder": "La stå tomt for å beholde passordet",
  "account.confirmPasswordPlaceholder": "Skriv passordet på nytt",
  "account.saveChanges": "Lagre endringer",
  "account.memberSince": "Medlem siden {date}",
  "account.emailConfirmed": "E-post bekreftet",
  "account.emailNotConfirmed": "E-post ikke bekreftet",
  "account.authUpdated": "Kontoinformasjonen er oppdatert.",
  "account.authEmailChangePending": "Sjekk den nye e-posten for å bekrefte adresseendringen.",
  "account.authUpdateFailed": "Kontoinformasjonen kunne ikke oppdateres.",
  "account.passwordMismatch": "Passordene er ikke like.",
  "account.noChanges": "Ingen endringer å lagre.",
  "nav.admin": "Admin",
  "nav.player": "Spiller",
  "nav.tournament": "Turnering",
  "nav.frontPageAria": "Forside",
  "nav.openMenu": "Åpne meny",
  "nav.closeMenu": "Lukk meny",
  "nav.startChoicesAria": "Startvalg",
  "nav.openViewMenu": "Åpne visningsmeny",
  "nav.closeViewMenu": "Lukk visningsmeny",
  "nav.viewAria": "Visning",
  "nav.leaveSpectator": "Forlat tilskuervisning",
  "role.admin": "Admin",
  "role.player": "Spiller",
  "role.spectator": "Tilskuer",
  "resume.localSaved": "Lagret lokalt",
  "resume.defaultSummary": "Det finnes en turnering lagret i denne nettleseren.",
  "resume.title": "Dine turneringer",
  "resume.adminSummary": "{players} spillere · {courts} baner · kode {code}",
  "resume.summary": "{players} spillere · {courts} baner",
  "resume.continueAdmin": "Fortsett som admin",
  "resume.continueTournament": "Fortsett turnering",
  "resume.openTournament": "Åpne turnering",
  "resume.players": "spillere",
  "resume.courts": "baner",
  "setup.createEyebrow": "Opprett",
  "setup.createDescription": "Konfigurer din turnering raskt. Sett opp baner, opprett spillerlister manuelt, eller la spillere bli med selv med en invitasjonskode.",
  "setup.joinEyebrow": "Bli med",
  "setup.joinTitle": "Bli med i turnering",
  "setup.joinDescription": "Skriv inn invitasjonskoden du har fått fra arrangøren. Profilen din blir automatisk lagt til i spiller treet.",
  "setup.newTournament": "Ny turnering",
  "setup.tournamentName": "Turneringsnavn",
  "setup.playersOptional": "Spillere, valgfritt",
  "setup.playersOptionalPlaceholder": "Legg inn spillere manuelt hvis noen ikke har egen enhet.",
  "setup.adminParticipation": "Admin-deltakelse",
  "setup.adminPlays": "Admin spiller selv",
  "setup.adminPlaysHint": "Velg dette hvis den som oppretter turneringen også skal ha spillerprofil.",
  "setup.adminPlayerName": "Spillernavn for admin",
  "setup.courtCount": "Antall baner",
  "setup.playerNamePlaceholder": "Skriv navnet ditt",
  "setup.yourAvatar": "Din avatar",
  "setup.yourName": "Navnet ditt",
  "setup.chooseAvatar": "Velg avatar",
  "setup.localJoinHint": "I dette utkastet fungerer koden for turneringen som er opprettet på denne enheten.",
  "setup.creatorProfileHint": "Profil er valgfritt for å delta. Opprett profil hvis du vil beholde turneringen og lagre egen statistikk.",
  "setup.accountOptionalHint": "Vil du lagre turneringen permanent? Opprett profil først.",
  "share.title": "Del turnering",
  "share.inviteCode": "Invitasjonskode",
  "share.qrCode": "QR-kode",
  "share.qrCodeAlt": "QR-kode for påmelding",
  "share.joinLink": "Join-lenke",
  "share.spectatorLink": "Tilskuerlenke",
  "share.joinHint": "Scan QR-koden eller bruk lenken for å bli med i turneringen.",
  "admin.sectionsAria": "Adminseksjoner",
  "admin.control": "Styring",
  "admin.share": "Del",
  "admin.players": "Spillere",
  "admin.matches": "Kamper",
  "admin.courtsInUse": "Baner i bruk",
  "admin.courtListPlaceholder": "1, 2 eller 3, 4, 16",
  "admin.tournamentFormat": "Turneringsformat",
  "admin.roundRobinFormat": "Round robin",
  "admin.cupFormat": "Cup",
  "admin.cupTeamSetup": "Cup-lagoppsett",
  "admin.tablePoints": "Tabellpoeng",
  "admin.gamesPerSet": "Games per sett",
  "admin.setsPerMatch": "Sett per match",
  "admin.lobbyPlayers": "Lobby / spillere",
  "admin.addPlayersPlaceholder": "Legg til én eller flere spillere",
  "cup.teamLinesPlaceholder": "Ada + Bo\nCato + Dina",
  "admin.matchesHistory": "Kamper og historikk",
  "common.name": "Navn",
  "common.automatic": "Automatisk",
  "common.manual": "Manuelt",
  "common.matches": "Kamper",
  "common.sets": "Sett",
  "common.games": "Games",
  "common.standings": "Tabell",
  "common.rules": "Regler",
  "common.match": "Kamp",
  "common.round": "Runde",
  "common.status": "Status",
  "common.points": "Poeng",
  "common.server": "Server",
  "common.court": "Bane",
  "common.winner": "Vinner",
  "common.ready": "Klar",
  "common.missing": "Mangler",
  "common.waiting": "Venter",
  "common.finished": "Ferdig",
  "common.completed": "Fullført",
  "common.playing": "Pågår",
  "common.active": "Aktive",
  "common.betweenRounds": "Mellom",
  "common.cancelled": "Avbrutt",
  "common.resting": "Pause",
  "common.next": "Neste",
  "common.select": "Velg",
  "common.player": "Spiller",
  "common.teamOne": "Lag 1",
  "common.teamTwo": "Lag 2",
  "common.single": "Single",
  "common.double": "Double",
  "common.lobby": "Lobby",
  "common.against": "mot",
  "common.now": "Nå",
  "common.none": "Ingen",
  "common.minimumTwo": "Minst 2",
  "common.teamCount": "{count} lag",
  "common.playingMatches": "Pågående kamper",
  "common.confirmAction": "Bekreft handling",
  "common.confirm": "Bekreft",
  "actions.createTournament": "Opprett turnering",
  "actions.joinTournament": "Bli med i turnering",
  "actions.adminAddedMe": "Admin har lagt meg til",
  "actions.update": "Oppdater",
  "actions.saveRules": "Lagre regler",
  "actions.downloadBackup": "Last ned backup",
  "actions.importBackup": "Importer backup",
  "actions.endTournament": "Avslutt turnering",
  "actions.resetTournament": "Nullstill turnering",
  "actions.copyCode": "Kopier kode",
  "actions.copyLink": "Kopier lenke",
  "actions.copySpectatorLink": "Kopier tilskuerlenke",
  "actions.add": "Legg til",
  "actions.saveCupTeams": "Lagre cup-lag",
  "actions.close": "Lukk",
  "actions.save": "Lagre",
  "actions.remove": "Fjern",
  "actions.replacePlayer": "Bytt",
  "messages.replacePlayerPrompt": "Nytt navn som erstatter {name}",
  "actions.removePlayerAria": "Fjern {name}",
  "actions.editPlayerNameAria": "Endre navn for {name}",
  "actions.playerAvatarAria": "Avatar for {name}",
  "actions.saveCourt": "Lagre bane",
  "actions.updateResult": "Oppdater",
  "actions.setResult": "Set resultat",
  "actions.startMatch": "Start kamp",
  "actions.startTournament": "Start turnering",
  "actions.completeTournament": "Fullfør turnering",
  "actions.largeScore": "Stor score",
  "actions.undoResult": "Angre resultat",
  "actions.undoLast": "Angre siste",
  "actions.cancelMatch": "Avbryt kamp",
  "player.nextMatch": "Din neste kamp",
  "player.chooseProfile": "Velg spillerprofil",
  "player.chooseProfileHint": "Da viser appen bane, makker og motstandere for akkurat deg.",
  "player.yourMatches": "Dine kamper",
  "player.yourStatus": "Din status",
  "player.currentPlayer": "Aktuell spiller",
  "player.teammate": "Makker",
  "player.opponents": "Mot",
  "player.playingNow": "Du spiller nå",
  "player.tournamentFinished": "Turneringen er ferdig",
  "player.finishedWithPlacement": "{name}, du endte på {placement}. plass.",
  "player.finishedWithoutPlacement": "{name}",
  "player.checkFinalStandings": "Sjekk tabellen under for endelige resultater.",
  "player.restingThisRound": "Pause denne runden",
  "player.restingTitle": "{name}, du sitter over nå.",
  "player.restingHint": "Følg med på neste runde. Du vises her igjen når du har kamp.",
  "player.waitingTitle": "{name}, du har ingen aktiv kamp akkurat nå.",
  "player.waitingHint": "Når administrator genererer neste runde, vises bane, makker og motstandere her.",
  "player.identityEmpty": "Åpne invitasjonslenken, scan QR-koden eller velg \"Admin har lagt meg til\" fra startsiden.",
  "player.adminPlays": "Admin spiller",
  "player.registeredSelf": "Registrert selv",
  "player.joinedSelf": "Påmeldt selv",
  "player.addedByAdmin": "Lagt til av admin",
  "player.away": "Ute/reist",
  "player.leftDevice": "Har forlatt enhet",
  "tournament.overview": "Turneringsoversikt",
  "tournament.progressAria": "Turneringsfremdrift",
  "tournament.roundLabel": "Runde {round}",
  "tournament.nextRoundLabel": "Neste blir runde {round}",
  "tournament.firstRoundReady": "Klar for første runde",
  "tournament.matchesFinished": "{finished}/{total} kamper ferdig",
  "tournament.matchesFinishedShort": "{finished}/{total} ferdig",
  "tournament.playersReady": "{players} spillere klare · {courts} baner",
  "tournament.lobbyHeadline": "Del koden og fyll spillerlisten.",
  "tournament.noPlayers": "Ingen spillere ennå. Del koden {code}, eller legg til spillere manuelt.",
  "tournament.noRound": "Rundeoppsett vises her når kampene er generert.",
  "tournament.noMatches": "Ingen kamper ennå. Generer første runde.",
  "tournament.noPlayerMatches": "Du har ingen kamper ennå.",
  "tournament.choosePlayerForMatches": "Velg spillerprofil for å se dine kamper.",
  "tournament.noLiveMatches": "Ingen pågående kamper ennå.",
  "tournament.noMatchesPlaying": "Ingen kamper pågår akkurat nå. Neste kampoppsett er klart i spillerfanen.",
  "tournament.standingsEmpty": "Tabellen vises når spillere er lagt til.",
  "tournament.courtComing": "Bane kommer",
  "tournament.noCourtAssigned": "Ikke tildelt bane",
  "tournament.thisRound": "Denne runden",
  "tournament.noCourt": "Ingen bane",
  "tournament.allGenerated": "Hele turneringen er generert",
  "tournament.finished": "Turneringen er avsluttet.",
  "tournament.cupFinished": "Cup ferdig",
  "tournament.cupFinishedReason": "Cupen er ferdig.",
  "cup.thirdPlaceMatch": "Bronsefinale",
  "cup.final": "Finale",
  "cup.manualTeams": "Manuelle cup-lag",
  "cup.manualTeamsHint": "Ett lag per linje. Bruk + mellom spillere, for eksempel Ada + Bo.",
  "cup.teamSetup": "Lagoppsett",
  "cup.bracket": "Cup-bracket",
  "cup.teamSlots": "{count} lagplasser",
  "cup.firstRound": "Første runde",
  "cup.semiFinal": "Semifinale",
  "cup.waitingForWinners": "Venter på vinnere",
  "cup.waitingForMatch": "Venter på kamp",
  "cup.bye": "Bye: {teams}",
  "score.setResultTitle": "Set resultat",
  "score.chooseFinishedSet": "Velg ferdig sett.",
  "score.matchup": "{teamOne} mot {teamTwo}",
  "score.scoreboardAria": "Poengstilling",
  "score.pointsLabel": "Poeng {team}",
  "score.courtForMatch": "Bane for {teamOne} mot {teamTwo}",
  "score.winnerNote": "Vinner: {winner}",
  "score.walkoverForAria": "Registrer walkover for {team}",
  "score.finishedPrefix": "Ferdig: {sets}",
  "score.setsPrefix": "Sett: {sets}",
  "score.currentSummary": "Sett: {sets} · Game: {game}",
  "score.walkoverWinner": "{winner} vant på walkover",
  "score.walkover": "Walkover",
  "score.matchWinner": "{winner} vant {score}",
  "score.matchCancelled": "Kampen er avbrutt",
  "score.playAllMatchesFirst": "Fullfør kampene",
  "standings.pointsShort": "{points} p",
  "standings.detail": "{played} spilt · {wins} seire · {sets} sett · {games} games",
  "standings.wins": "{wins} seire",
  "standings.played": "{played} spilt",
  "players.count": "{count} spillere",
  "players.noneAddedYet": "Ingen spillere er lagt til ennå.",
  "matches.count": "{count} kamper",
  "matches.matchNumber": "Kamp {match}",
  "matches.restingCount": "{count} pause",
  "matches.restingPlayers": "Pause: {players}",
  "rules.tennisPointsTitle": "Tennispoeng",
  "rules.tennisPointsText": "Poeng føres som 0, 15, 30, 40 og A. Ved 40-40 må laget vinne to poeng på rad.",
  "rules.setsTitle": "Sett",
  "rules.setsText": "Kampen spilles best av {sets} sett. Et sett vinnes normalt til {games} games med to games margin.",
  "rules.rankingTitle": "Rangering",
  "rules.rankingMatches": "Tabellen gir 3 poeng for kampseier.",
  "rules.rankingSets": "Tabellen gir poeng for vunnet sett.",
  "rules.rankingGames": "Tabellen teller hvert vunnet game.",
  "rules.rankingFallback": "Tabellpoeng følger valgt regelsett.",
  "rules.rankingText": "{pointModeText} Ved likhet sorteres spillerne på kampseire, sett og navn.",
  "rules.restTitle": "Pause",
  "rules.restText": "Ved oddetall eller for mange lag til antall baner får noen pause i runden og kommer tilbake i neste rotasjon.",
  "messages.adminNameRequired": "Skriv inn spillernavn for admin.",
  "messages.tournamentNotFound": "Fant ikke turnering med kode {code}.",
  "messages.tournamentStartedAskAdmin": "Turneringen er startet. Be administrator legge deg til i neste turnering.",
  "messages.playersLocked": "Spillere kan bare legges til før første runde i denne turneringen.",
  "messages.courtsLocked": "Baner kan ikke endres mens en runde pågår eller etter at turneringen er avsluttet.",
  "messages.finishTournamentConfirm": "Fullføre turneringen? Pågående kamper som ikke er ferdige blir avbrutt.",
  "messages.endTournamentConfirm": "Avslutte turneringen? Du kan fortsatt se resultater og laste ned backup etterpå.",
  "messages.resetTournamentConfirm": "Nullstille turneringen? Turneringens lokale og nettlagrede data blir slettet.",
  "messages.inviteCodeRequired": "Skriv inn invitasjonskoden først.",
  "messages.remoteConflict": "Turneringen ble endret fra en annen admin. Last inn siste før du fortsetter.",
  "messages.localBackupKept": "Lokal backup er lastet ned. Serverversjonen er fortsatt tilgjengelig.",
  "messages.remoteStateUpdated": "Live-turneringen er oppdatert.",
  "messages.recoveredLocalTournament": "Gjenopprettet siste kjente lokale turnering etter en lagringsfeil.",
  "messages.remoteSaveFailed": "Turneringen kunne ikke lagres live akkurat nå. Den lokale kopien er beholdt.",
  "messages.joinFailed": "Kunne ikke melde deg på akkurat nå. Prøv igjen.",
  "messages.securePlayerFailed": "Kunne ikke opprette en sikker spillerøkt.",
  "messages.syncFailed": "Kunne ikke synkronisere live akkurat nå. Lokal kopi er lagret.",
  "messages.offlineAdminChange": "Du er offline. Koble til igjen før admin-endringen sendes.",
  "messages.matchUpdateFailed": "Kunne ikke oppdatere kampen live akkurat nå. Prøv igjen når forbindelsen er tilbake.",
  "messages.offlineSetResult": "Du er offline. Koble til igjen før settresultatet sendes.",
  "messages.setResultFailed": "Kunne ikke lagre settresultatet live akkurat nå. Prøv igjen når forbindelsen er tilbake.",
  "messages.offlineNextRound": "Du er offline. Koble til igjen før neste runde sendes.",
  "messages.nextRoundFailed": "Kunne ikke starte neste runde live akkurat nå. Prøv igjen når forbindelsen er tilbake.",
  "messages.offlineNextCupRound": "Du er offline. Koble til igjen før neste cup-runde sendes.",
  "messages.nextCupRoundFailed": "Kunne ikke starte neste cup-runde live akkurat nå. Prøv igjen når forbindelsen er tilbake.",
  "messages.pointSyncFailed": "Kunne ikke synkronisere poenget live akkurat nå. Lokal kopi er lagret.",
  "messages.deleteRemoteFailed": "Kunne ikke slette live-turneringen. Lokal kopi nullstilles.",
  "messages.fetchRemoteFailed": "Kunne ikke hente siste live state akkurat nå.",
  "messages.backupImported": "Backup er importert.",
  "messages.importBackupFailed": "Kunne ikke importere backup. Velg en gyldig Padelstar JSON-fil.",
  "messages.copyFallback": "Kunne ikke kopiere automatisk. Marker teksten og kopier manuelt.",
  "messages.inviteCopied": "Invitasjonskoden er kopiert.",
  "messages.joinLinkCopied": "Join-lenken er kopiert.",
  "messages.spectatorLinkCopied": "Tilskuerlenken er kopiert.",
  "messages.duplicatePlayer": "{name} finnes allerede i spillerlisten.",
  "messages.removePlayersLocked": "Spillere kan ikke fjernes etter at kampoppsettet er startet i denne turneringen.",
  "messages.rulesLocked": "Turneringsreglene kan bare endres før første runde.",
  "messages.cupTeamsLocked": "Cup-lag kan bare endres før første runde.",
  "messages.minimumCupTeams": "Legg inn minst to cup-lag.",
  "messages.invalidCupTeamSize": "Lag {team} må ha én eller to spillere.",
  "messages.cupPlayerNotFound": "Fant ikke aktiv spiller «{name}» i spillerlisten.",
  "messages.cupPlayerDuplicate": "{name} er lagt inn på mer enn ett lag.",
  "messages.needTwoPlayers": "Legg til minst to spillere før du genererer kamper.",
  "messages.noValidMatches": "Fant ingen gyldige kamper med spillerlisten.",
  "messages.manualCupNeedsTeams": "Manuell cup krever minst to lag.",
  "messages.autoCupNeedsPlayers": "Cup krever minst to lag, altså minst fire spillere i automatisk lagoppsett.",
  "messages.needTwoPlayersStart": "Legg til minst to spillere før du starter runden.",
  "messages.defineManualCupTeams": "Definer minst to manuelle cup-lag før du starter turneringen.",
  "messages.autoCupNeedsActivePlayers": "Cup med automatisk lagoppsett krever minst fire aktive spillere.",
  "messages.needCourt": "Legg til minst én bane før du starter runden.",
  "messages.finishMatchesBeforeNext": "Alle kamper må være ferdige før neste runde.",
  "messages.noUndo": "Det finnes ingen siste handling å angre for denne kampen.",
  "messages.cancelMatchConfirm": "Avbryte denne kampen? Den teller ikke i tabellen.",
  "messages.walkoverConfirm": "Registrere walkover til {team}?",
  "messages.invalidScoreInteger": "Resultatet må være hele tall.",
  "messages.invalidScoreNegative": "Resultatet kan ikke være negativt.",
  "messages.invalidScoreDraw": "Resultatet kan ikke være uavgjort.",
  "messages.invalidScoreShape": "Sett må vinnes {gamesToWinSet}-x med to games margin, eller {tieBreakOne}-{tieBreakTwo} / {tieBreakOne}-{gamesToWinSet}.",
  "messages.markAwayConfirm": "Markere {name} som ute/reist? Spilleren blir ikke satt opp i nye runder, men historiske kamper beholdes.",
  "messages.returnToTournamentConfirm": "Gjøre {name} tilgjengelig for nye runder igjen?",
  "messages.availabilityUpdateFailed": "Kunne ikke oppdatere spillerstatus live akkurat nå. Prøv igjen når forbindelsen er tilbake.",
  "footer.developedBy": "Utviklet av Sigurd Steen Grødem",
  "footer.copyrightPrefix": "Copyright",
  "footer.rights": "All rights reserved.",
  "footer.privacy": "Personvern",
  "guide.link": "Bruksanvisning",
});

Object.assign(padelstarTranslations.nn, {
  "meta.description": "Padelstar - Padel Manager av Sigurd Steen Grødem / Zigonia IT. Administrer padelturneringar, kampar, baner og resultat.",
  "hero.title": "Spel meir. Organiser mindre.",
  "hero.subtitle": "Opprett turneringa, inviter spelarane og la Padelstar ordne med resten.",
  "nav.skipToContent": "Hopp til innhald",
  "nav.homeAria": "Gå til heim",
  "nav.modulesAria": "Modular",
  "nav.home": "Heim",
  "nav.create": "Opprett",
  "nav.join": "Bli med",
  "nav.admin": "Admin",
  "nav.player": "Spelar",
  "nav.tournament": "Turnering",
  "nav.frontPageAria": "Framside",
  "nav.openMenu": "Opne meny",
  "nav.closeMenu": "Lukk meny",
  "nav.startChoicesAria": "Startval",
  "nav.openViewMenu": "Opne visingsmeny",
  "nav.closeViewMenu": "Lukk visingsmeny",
  "nav.viewAria": "Vising",
  "nav.leaveSpectator": "Forlat tilskodarvising",
  "resume.localSaved": "Lagra lokalt",
  "resume.defaultSummary": "Det finst ei turnering lagra i denne nettlesaren.",
  "resume.title": "Turneringane dine",
  "resume.adminSummary": "{players} spelarar · {courts} baner · kode {code}",
  "resume.summary": "{players} spelarar · {courts} baner",
  "resume.continueAdmin": "Hald fram som admin",
  "resume.continueTournament": "Hald fram med turnering", "resume.openTournament": "Opne turnering", "resume.players": "spelarar", "resume.courts": "baner",
  "setup.createEyebrow": "Opprett",
  "setup.joinEyebrow": "Bli med",
  "setup.newTournament": "Ny turnering",
  "setup.tournamentName": "Turneringsnamn",
  "setup.playersOptional": "Spelarar, valfritt",
  "setup.playersOptionalPlaceholder": "Legg inn spelarar manuelt viss nokon ikkje har eiga eining.",
  "setup.adminParticipation": "Admin-deltaking",
  "setup.adminPlays": "Admin spelar sjølv",
  "setup.adminPlaysHint": "Vel dette viss den som opprettar turneringa også skal ha spelarprofil.",
  "setup.adminPlayerName": "Spelarnamn for admin",
  "setup.courtCount": "Tal på baner",
  "setup.playerNamePlaceholder": "Skriv namnet ditt",
  "setup.yourAvatar": "Avataren din",
  "setup.yourName": "Namnet ditt",
  "setup.chooseAvatar": "Vel avatar",
  "setup.localJoinHint": "I dette utkastet fungerer koden for turneringa som er oppretta på denne eininga.",
  "setup.creatorProfileHint": "Profil er valfritt for å delta. Opprett profil dersom du vil behalde turneringa og lagre eigen statistikk.",
  "setup.accountOptionalHint": "Vil du lagre turneringa permanent? Opprett profil først.",
  "share.title": "Del turnering",
  "share.inviteCode": "Invitasjonskode",
  "share.qrCode": "QR-kode",
  "share.qrCodeAlt": "QR-kode for påmelding",
  "share.joinLink": "Join-lenke",
  "share.joinHint": "Skann QR-koden eller bruk lenka for å bli med i turneringa.",
  "admin.sectionsAria": "Adminseksjonar",
  "admin.control": "Styring",
  "admin.share": "Del",
  "admin.players": "Spelarar",
  "admin.matches": "Kampar",
  "admin.courtsInUse": "Baner i bruk",
  "admin.courtListPlaceholder": "1, 2 eller 3, 4, 16",
  "admin.tournamentFormat": "Turneringsformat",
  "admin.cupTeamSetup": "Cup-lagoppsett",
  "admin.tablePoints": "Tabellpoeng",
  "admin.gamesPerSet": "Games per sett",
  "admin.setsPerMatch": "Sett per kamp",
  "admin.lobbyPlayers": "Lobby / spelarar",
  "admin.addPlayersPlaceholder": "Legg til éin eller fleire spelarar",
  "admin.matchesHistory": "Kampar og historikk",
});

Object.assign(padelstarTranslations.en, {
  "meta.description": "Padelstar - Padel Manager by Sigurd Steen Grodem / Zigonia IT. Manage padel tournaments, matches, courts and results.",
  "hero.title": "Play more. Organize less.",
  "hero.subtitle": "Create the tournament, invite the players and let Padelstar take care of the rest.",
  "nav.homeAria": "Go home", "nav.modulesAria": "Modules", "nav.home": "Home", "nav.create": "Create", "nav.login": "Sign in", "nav.join": "Join", "nav.admin": "Admin", "nav.player": "Player", "nav.tournament": "Tournament", "nav.frontPageAria": "Front page", "nav.openMenu": "Open menu", "nav.closeMenu": "Close menu", "nav.startChoicesAria": "Start choices", "nav.openViewMenu": "Open view menu", "nav.closeViewMenu": "Close view menu", "nav.viewAria": "View", "nav.leaveSpectator": "Leave spectator view",
  "role.admin": "Admin", "role.player": "Player", "role.spectator": "Spectator",
  "resume.localSaved": "Saved locally", "resume.defaultSummary": "Saved tournaments you can open again on this device.", "resume.title": "Your tournaments", "resume.adminSummary": "{players} players · {courts} courts · code {code}", "resume.summary": "{players} players · {courts} courts", "resume.continueAdmin": "Continue as admin", "resume.continueTournament": "Continue tournament", "resume.openTournament": "Open tournament", "resume.players": "players", "resume.courts": "courts",
  "setup.createEyebrow": "Create", "setup.joinEyebrow": "Join", "setup.newTournament": "New tournament", "setup.tournamentName": "Tournament name", "setup.playersOptional": "Players, optional", "setup.playersOptionalPlaceholder": "Add players manually if someone does not have their own device.", "setup.adminParticipation": "Admin participation", "setup.adminPlays": "Admin plays", "setup.adminPlaysHint": "Choose this if the tournament creator will also have a player profile.", "setup.adminPlayerName": "Admin player name", "setup.courtCount": "Number of courts", "setup.playerNamePlaceholder": "Enter your name", "setup.yourAvatar": "Your avatar", "setup.yourName": "Your name", "setup.chooseAvatar": "Choose avatar", "setup.localJoinHint": "In this local version, the code works for the tournament created on this device.", "setup.creatorProfileHint": "A profile is optional for joining. Create one if you want to keep the tournament and save your own statistics.", "setup.accountOptionalHint": "Want to keep the tournament permanently? Create a profile first.",
  "share.title": "Share tournament", "share.inviteCode": "Invite code", "share.qrCode": "QR code", "share.qrCodeAlt": "QR code for joining", "share.joinLink": "Join link", "share.spectatorLink": "Spectator link", "share.joinHint": "Scan the QR code or use the link to join the tournament.",
  "admin.sectionsAria": "Admin sections", "admin.control": "Control", "admin.share": "Share", "admin.players": "Players", "admin.matches": "Matches", "admin.courtsInUse": "Courts in use", "admin.courtListPlaceholder": "1, 2 or 3, 4, 16", "admin.tournamentFormat": "Tournament format", "admin.roundRobinFormat": "Round robin", "admin.cupFormat": "Cup", "admin.cupTeamSetup": "Cup team setup", "admin.tablePoints": "Table points", "admin.gamesPerSet": "Games per set", "admin.setsPerMatch": "Sets per match", "admin.lobbyPlayers": "Lobby / players", "admin.addPlayersPlaceholder": "Add one or more players", "admin.matchesHistory": "Matches and history",
  "common.name": "Name", "common.automatic": "Automatic", "common.manual": "Manual", "common.matches": "Matches", "common.sets": "Sets", "common.games": "Games", "common.standings": "Standings", "common.rules": "Rules", "common.match": "Match", "common.round": "Round", "common.status": "Status", "common.points": "Points", "common.server": "Server", "common.court": "Court", "common.winner": "Winner", "common.ready": "Ready", "common.missing": "Missing", "common.waiting": "Waiting", "common.finished": "Finished", "common.completed": "Completed", "common.playing": "In progress", "common.active": "Active", "common.betweenRounds": "Between rounds", "common.cancelled": "Cancelled", "common.resting": "Resting", "common.next": "Next", "common.select": "Select", "common.player": "Player", "common.teamOne": "Team 1", "common.teamTwo": "Team 2", "common.single": "Singles", "common.double": "Doubles", "common.lobby": "Lobby", "common.against": "vs", "common.now": "Now", "common.none": "None", "common.minimumTwo": "At least 2", "common.teamCount": "{count} teams", "common.playingMatches": "Matches in progress",
  "actions.createTournament": "Create tournament", "actions.joinTournament": "Join tournament", "actions.adminAddedMe": "Admin added me", "actions.update": "Update", "actions.saveRules": "Save rules", "actions.downloadBackup": "Download backup", "actions.importBackup": "Import backup", "actions.endTournament": "End tournament", "actions.resetTournament": "Reset tournament", "actions.copyCode": "Copy code", "actions.copyLink": "Copy link", "actions.copySpectatorLink": "Copy spectator link", "actions.add": "Add", "actions.saveCupTeams": "Save cup teams", "actions.close": "Close", "actions.save": "Save", "actions.remove": "Remove", "actions.removePlayerAria": "Remove {name}", "actions.editPlayerNameAria": "Edit name for {name}", "actions.playerAvatarAria": "Avatar for {name}", "actions.saveCourt": "Save court", "actions.updateResult": "Update", "actions.setResult": "Set result", "actions.startMatch": "Start match", "actions.startTournament": "Start tournament", "actions.completeTournament": "Finish tournament", "actions.largeScore": "Large score", "actions.undoResult": "Undo result", "actions.undoLast": "Undo last", "actions.cancelMatch": "Cancel match", "actions.leaveTournament": "Leave tournament", "actions.markAway": "Mark as away", "actions.returnToTournament": "Return to tournament", "actions.viewAsSpectator": "View as spectator", "actions.choosePlayer": "Choose player", "actions.joinAgain": "Join again",
  "player.nextMatch": "Your next match", "player.chooseProfile": "Choose player profile", "player.chooseProfileHint": "The app will show your court, teammate and opponents.", "player.yourMatches": "Your matches", "player.yourStatus": "Your status", "player.currentPlayer": "Current player", "player.teammate": "Teammate", "player.opponents": "Opponents", "player.playingNow": "You are playing now", "player.tournamentFinished": "The tournament is finished", "player.restingThisRound": "Resting this round", "player.restingTitle": "{name}, you are sitting out now.", "player.waitingTitle": "{name}, you have no active match right now.", "player.identityEmpty": "Open the invite link, scan the QR code or choose Admin added me from the start page.", "player.adminPlays": "Admin plays", "player.registeredSelf": "Registered yourself", "player.joinedSelf": "Joined yourself", "player.addedByAdmin": "Added by admin", "player.away": "Away",
  "tournament.overview": "Tournament overview", "tournament.progressAria": "Tournament progress", "tournament.roundLabel": "Round {round}", "tournament.nextRoundLabel": "Next is round {round}", "tournament.firstRoundReady": "Ready for the first round", "tournament.matchesFinished": "{finished}/{total} matches finished", "tournament.matchesFinishedShort": "{finished}/{total} finished", "tournament.playersReady": "{players} players ready · {courts} courts", "tournament.lobbyHeadline": "Share the code and fill the player list.", "tournament.noPlayers": "No players yet. Share code {code}, or add players manually.", "tournament.noRound": "Round details appear here when matches are generated.", "tournament.noMatches": "No matches yet. Generate the first round.", "tournament.noPlayerMatches": "You have no matches yet.", "tournament.choosePlayerForMatches": "Choose a player profile to see your matches.", "tournament.noLiveMatches": "No matches in progress yet.", "tournament.noMatchesPlaying": "No matches are in progress right now.", "tournament.standingsEmpty": "Standings appear when players are added.", "tournament.courtComing": "Court coming", "tournament.noCourtAssigned": "No court assigned", "tournament.thisRound": "This round", "tournament.noCourt": "No court", "tournament.allGenerated": "The whole tournament is generated", "tournament.finished": "The tournament has ended.", "tournament.cupFinished": "Cup finished", "tournament.cupFinishedReason": "The cup is finished.",
  "messages.inviteCopied": "Invite code copied.", "messages.joinLinkCopied": "Join link copied.", "messages.spectatorLinkCopied": "Spectator link copied.", "messages.remoteStateUpdated": "Live tournament updated.", "messages.markAwayConfirm": "Mark {name} as away? The player will not be placed in new rounds, but historical matches remain.", "messages.returnToTournamentConfirm": "Make {name} available for new rounds again?", "messages.availabilityUpdateFailed": "Could not update player status live. Try again when the connection returns.",
});

Object.assign(padelstarTranslations.es, {
  "meta.description": "Padelstar - Padel Manager de Sigurd Steen Grodem / Zigonia IT. Gestiona torneos, partidos, pistas y resultados de pádel.",
  "hero.title": "Juega más. Organiza menos.",
  "hero.subtitle": "Crea el torneo, invita a los jugadores y deja que Padelstar se encargue del resto.",
  "nav.homeAria": "Ir al inicio", "nav.modulesAria": "Módulos", "nav.home": "Inicio", "nav.create": "Crear", "nav.join": "Unirse", "nav.admin": "Admin", "nav.player": "Jugador", "nav.tournament": "Torneo", "nav.frontPageAria": "Página principal", "nav.openMenu": "Abrir menú", "nav.closeMenu": "Cerrar menú", "nav.startChoicesAria": "Opciones de inicio", "nav.openViewMenu": "Abrir menú de vista", "nav.closeViewMenu": "Cerrar menú de vista", "nav.viewAria": "Vista", "nav.leaveSpectator": "Salir de la vista de espectador", "role.admin": "Admin", "role.player": "Jugador", "role.spectator": "Espectador",
  "resume.localSaved": "Guardado localmente", "resume.defaultSummary": "Torneos guardados que puedes volver a abrir en este dispositivo.", "resume.title": "Tus torneos", "resume.adminSummary": "{players} jugadores · {courts} pistas · código {code}", "resume.summary": "{players} jugadores · {courts} pistas", "resume.continueAdmin": "Continuar como admin", "resume.continueTournament": "Continuar torneo", "resume.openTournament": "Abrir torneo", "resume.players": "jugadores", "resume.courts": "pistas",
  "setup.createEyebrow": "Crear", "setup.joinEyebrow": "Unirse", "setup.newTournament": "Nuevo torneo", "setup.tournamentName": "Nombre del torneo", "setup.playersOptional": "Jugadores, opcional", "setup.playersOptionalPlaceholder": "Añade jugadores manualmente si alguien no tiene su propio dispositivo.", "setup.adminParticipation": "Participación del admin", "setup.adminPlays": "El admin juega", "setup.adminPlaysHint": "Elige esto si quien crea el torneo también tendrá un perfil de jugador.", "setup.adminPlayerName": "Nombre del jugador admin", "setup.courtCount": "Número de pistas", "setup.playerNamePlaceholder": "Escribe tu nombre", "setup.yourAvatar": "Tu avatar", "setup.yourName": "Tu nombre", "setup.chooseAvatar": "Elige avatar", "setup.localJoinHint": "En esta versión local, el código funciona para el torneo creado en este dispositivo.",
  "share.title": "Compartir torneo", "share.inviteCode": "Código de invitación", "share.qrCode": "Código QR", "share.qrCodeAlt": "Código QR para inscribirse", "share.joinLink": "Enlace para unirse", "share.spectatorLink": "Enlace de espectador", "share.joinHint": "Escanea el código QR o usa el enlace para unirte al torneo.",
  "admin.sectionsAria": "Secciones de admin", "admin.control": "Control", "admin.share": "Compartir", "admin.players": "Jugadores", "admin.matches": "Partidos", "admin.courtsInUse": "Pistas en uso", "admin.courtListPlaceholder": "1, 2 o 3, 4, 16", "admin.tournamentFormat": "Formato del torneo", "admin.roundRobinFormat": "Todos contra todos", "admin.cupFormat": "Copa", "admin.cupTeamSetup": "Configuración de equipos de copa", "admin.tablePoints": "Puntos de tabla", "admin.gamesPerSet": "Juegos por set", "admin.setsPerMatch": "Sets por partido", "admin.lobbyPlayers": "Lobby / jugadores", "admin.addPlayersPlaceholder": "Añadir uno o más jugadores", "admin.matchesHistory": "Partidos e historial",
  "common.name": "Nombre", "common.automatic": "Automático", "common.manual": "Manual", "common.matches": "Partidos", "common.sets": "Sets", "common.games": "Juegos", "common.standings": "Clasificación", "common.rules": "Reglas", "common.match": "Partido", "common.round": "Ronda", "common.status": "Estado", "common.points": "Puntos", "common.server": "Saque", "common.court": "Pista", "common.winner": "Ganador", "common.ready": "Listo", "common.missing": "Falta", "common.waiting": "Esperando", "common.finished": "Finalizado", "common.completed": "Completado", "common.playing": "En juego", "common.active": "Activos", "common.betweenRounds": "Entre rondas", "common.cancelled": "Cancelado", "common.resting": "Descanso", "common.next": "Siguiente", "common.select": "Seleccionar", "common.player": "Jugador", "common.teamOne": "Equipo 1", "common.teamTwo": "Equipo 2", "common.single": "Individual", "common.double": "Dobles", "common.lobby": "Lobby", "common.against": "contra", "common.now": "Ahora", "common.none": "Ninguno", "common.minimumTwo": "Al menos 2", "common.teamCount": "{count} equipos", "common.playingMatches": "Partidos en juego",
  "actions.createTournament": "Crear torneo", "actions.joinTournament": "Unirse al torneo", "actions.adminAddedMe": "El admin me ha añadido", "actions.update": "Actualizar", "actions.saveRules": "Guardar reglas", "actions.downloadBackup": "Descargar copia", "actions.importBackup": "Importar copia", "actions.endTournament": "Terminar torneo", "actions.resetTournament": "Restablecer torneo", "actions.copyCode": "Copiar código", "actions.copyLink": "Copiar enlace", "actions.copySpectatorLink": "Copiar enlace de espectador", "actions.add": "Añadir", "actions.saveCupTeams": "Guardar equipos de copa", "actions.close": "Cerrar", "actions.save": "Guardar", "actions.remove": "Eliminar", "actions.removePlayerAria": "Eliminar a {name}", "actions.editPlayerNameAria": "Editar nombre de {name}", "actions.playerAvatarAria": "Avatar de {name}", "actions.saveCourt": "Guardar pista", "actions.updateResult": "Actualizar", "actions.setResult": "Establecer resultado", "actions.startMatch": "Iniciar partido", "actions.startTournament": "Iniciar torneo", "actions.completeTournament": "Terminar torneo", "actions.largeScore": "Marcador grande", "actions.undoResult": "Deshacer resultado", "actions.undoLast": "Deshacer último", "actions.cancelMatch": "Cancelar partido", "actions.leaveTournament": "Salir del torneo", "actions.markAway": "Marcar como ausente", "actions.returnToTournament": "Volver al torneo", "actions.viewAsSpectator": "Ver como espectador", "actions.choosePlayer": "Elegir jugador", "actions.joinAgain": "Volver a unirse",
  "player.nextMatch": "Tu próximo partido", "player.chooseProfile": "Elige un perfil de jugador", "player.chooseProfileHint": "La app mostrará tu pista, compañero y oponentes.", "player.yourMatches": "Tus partidos", "player.yourStatus": "Tu estado", "player.currentPlayer": "Jugador actual", "player.teammate": "Compañero", "player.opponents": "Oponentes", "player.playingNow": "Estás jugando ahora", "player.tournamentFinished": "El torneo ha terminado", "player.restingThisRound": "Descanso esta ronda", "player.restingTitle": "{name}, ahora estás descansando.", "player.waitingTitle": "{name}, no tienes un partido activo ahora.", "player.identityEmpty": "Abre el enlace de invitación, escanea el código QR o elige El admin me ha añadido en la página inicial.", "player.adminPlays": "Juega el admin", "player.registeredSelf": "Registrado por sí mismo", "player.joinedSelf": "Se unió por sí mismo", "player.addedByAdmin": "Añadido por el admin", "player.away": "Ausente",
  "tournament.overview": "Resumen del torneo", "tournament.progressAria": "Progreso del torneo", "tournament.roundLabel": "Ronda {round}", "tournament.nextRoundLabel": "La siguiente es la ronda {round}", "tournament.firstRoundReady": "Listo para la primera ronda", "tournament.matchesFinished": "{finished}/{total} partidos terminados", "tournament.matchesFinishedShort": "{finished}/{total} terminados", "tournament.playersReady": "{players} jugadores listos · {courts} pistas", "tournament.lobbyHeadline": "Comparte el código y completa la lista de jugadores.", "tournament.noPlayers": "Aún no hay jugadores. Comparte el código {code} o añade jugadores manualmente.", "tournament.noRound": "La ronda aparecerá aquí cuando se generen los partidos.", "tournament.noMatches": "Aún no hay partidos. Genera la primera ronda.", "tournament.noPlayerMatches": "Aún no tienes partidos.", "tournament.choosePlayerForMatches": "Elige un perfil para ver tus partidos.", "tournament.noLiveMatches": "Aún no hay partidos en juego.", "tournament.noMatchesPlaying": "Ahora no hay partidos en juego.", "tournament.standingsEmpty": "La clasificación aparecerá cuando se añadan jugadores.", "tournament.courtComing": "Pista pendiente", "tournament.noCourtAssigned": "Sin pista asignada", "tournament.thisRound": "Esta ronda", "tournament.noCourt": "Sin pista", "tournament.allGenerated": "Todo el torneo está generado", "tournament.finished": "El torneo ha terminado.", "tournament.cupFinished": "Copa terminada", "tournament.cupFinishedReason": "La copa ha terminado.",
  "messages.inviteCopied": "Código de invitación copiado.", "messages.joinLinkCopied": "Enlace copiado.", "messages.spectatorLinkCopied": "Enlace de espectador copiado.", "messages.remoteStateUpdated": "Torneo en directo actualizado.", "messages.markAwayConfirm": "¿Marcar a {name} como ausente? No se incluirá en nuevas rondas, pero se conservarán sus partidos históricos.", "messages.returnToTournamentConfirm": "¿Hacer que {name} vuelva a estar disponible para nuevas rondas?", "messages.availabilityUpdateFailed": "No se pudo actualizar el estado del jugador. Inténtalo cuando vuelva la conexión.",
  "avatar.smash": "Smash", "avatar.serve": "Saque", "avatar.wall": "Pared", "avatar.lob": "Globo",
  "footer.developedBy": "Desarrollado por Sigurd Steen Grodem", "footer.copyrightPrefix": "Copyright", "footer.rights": "Todos los derechos reservados.", "footer.privacy": "Privacidad", "guide.link": "Guía rápida",
});

Object.assign(padelstarTranslations.en, {
  "avatar.smash": "Smash", "avatar.serve": "Serve", "avatar.wall": "Wall", "avatar.lob": "Lob",
  "footer.developedBy": "Developed by Sigurd Steen Grodem", "footer.copyrightPrefix": "Copyright", "footer.rights": "All rights reserved.", "footer.privacy": "Privacy", "guide.link": "Quick guide",
});

Object.assign(padelstarTranslations.nn, {
  "role.admin": "Admin", "role.player": "Spelar", "role.spectator": "Tilskodar",
  "avatar.smash": "Smash", "avatar.serve": "Serve", "avatar.wall": "Vegg", "avatar.lob": "Lobb",
  "share.spectatorLink": "Tilskodarlenkje", "actions.copySpectatorLink": "Kopier tilskodarlenkje", "actions.markAway": "Meld deg ute", "actions.returnToTournament": "Bli med igjen", "actions.viewAsSpectator": "Sjå som tilskodar", "actions.choosePlayer": "Vel spelar", "actions.joinAgain": "Bli med på nytt",
  "player.away": "Ute/reist", "player.leftDevice": "Har forlatt eining", "messages.spectatorLinkCopied": "Tilskodarlenkja er kopiert.", "messages.remoteStateUpdated": "Live-turneringa er oppdatert.", "messages.markAwayConfirm": "Markere {name} som ute/reist? Spelaren blir ikkje sett opp i nye rundar, men historiske kampar blir tekne vare på.", "messages.returnToTournamentConfirm": "Gjere {name} tilgjengeleg for nye rundar igjen?", "messages.availabilityUpdateFailed": "Klarte ikkje å oppdatere spelarstatus live akkurat no.",
  "footer.developedBy": "Utvikla av Sigurd Steen Grodem", "footer.copyrightPrefix": "Copyright", "footer.rights": "Alle rettar reserverte.", "footer.privacy": "Personvern", "guide.link": "Brukarrettleiing",
});

Object.assign(padelstarTranslations.de, {
  "hero.title": "Mehr spielen. Weniger organisieren.",
  "hero.subtitle": "Turnier erstellen, Spieler einladen und Padelstar den Rest erledigen lassen.",
  "role.admin": "Admin", "role.player": "Spieler", "role.spectator": "Zuschauer",
  "nav.homeAria": "Zur Startseite", "nav.modulesAria": "Module", "nav.home": "Startseite", "nav.create": "Erstellen", "nav.join": "Beitreten", "nav.player": "Spieler", "nav.tournament": "Turnier", "nav.frontPageAria": "Startseite", "nav.openMenu": "Menü öffnen", "nav.closeMenu": "Menü schließen", "nav.startChoicesAria": "Startoptionen", "nav.viewAria": "Ansicht", "nav.leaveSpectator": "Zuschaueransicht verlassen",
  "setup.createEyebrow": "Erstellen", "setup.joinEyebrow": "Beitreten", "setup.newTournament": "Neues Turnier", "setup.tournamentName": "Turniername", "setup.playersOptional": "Spieler, optional", "setup.playersOptionalPlaceholder": "Spieler manuell hinzufügen, wenn jemand kein eigenes Gerät hat.", "setup.adminParticipation": "Admin-Teilnahme", "setup.adminPlays": "Admin spielt mit", "setup.adminPlaysHint": "Wähle dies, wenn der Turnierersteller auch ein Spielerprofil haben soll.", "setup.adminPlayerName": "Spielername des Admins", "setup.courtCount": "Anzahl der Plätze", "setup.playerNamePlaceholder": "Deinen Namen eingeben", "setup.yourAvatar": "Dein Avatar", "setup.yourName": "Dein Name", "setup.chooseAvatar": "Avatar wählen",
  "share.inviteCode": "Einladungscode", "share.qrCode": "QR-Code", "share.qrCodeAlt": "QR-Code zur Anmeldung", "share.joinLink": "Beitrittslink", "share.spectatorLink": "Zuschauerlink", "share.title": "Turnier teilen", "share.joinHint": "QR-Code scannen oder den Link verwenden, um dem Turnier beizutreten.",
  "common.name": "Name", "common.matches": "Spiele", "common.sets": "Sätze", "common.games": "Games", "common.standings": "Tabelle", "common.rules": "Regeln", "common.match": "Spiel", "common.round": "Runde", "common.status": "Status", "common.points": "Punkte", "common.court": "Platz", "common.waiting": "Wartet", "common.finished": "Fertig", "common.playing": "Läuft", "common.next": "Nächste", "common.player": "Spieler", "common.single": "Einzel", "common.double": "Doppel", "common.lobby": "Lobby",
  "actions.createTournament": "Turnier erstellen", "actions.joinTournament": "Turnier beitreten", "actions.adminAddedMe": "Admin hat mich hinzugefügt", "actions.update": "Aktualisieren", "actions.saveRules": "Regeln speichern", "actions.copyCode": "Code kopieren", "actions.copyLink": "Link kopieren", "actions.copySpectatorLink": "Zuschauerlink kopieren", "actions.add": "Hinzufügen", "actions.save": "Speichern", "actions.remove": "Entfernen", "actions.startTournament": "Turnier starten", "actions.completeTournament": "Turnier beenden", "actions.leaveTournament": "Turnier verlassen", "actions.markAway": "Als abwesend markieren", "actions.returnToTournament": "Zum Turnier zurückkehren", "actions.viewAsSpectator": "Als Zuschauer ansehen", "actions.choosePlayer": "Spieler wählen", "actions.joinAgain": "Erneut beitreten",
  "player.nextMatch": "Dein nächstes Spiel", "player.chooseProfile": "Spielerprofil wählen", "player.chooseProfileHint": "Die App zeigt deinen Platz, Partner und Gegner.", "player.yourMatches": "Deine Spiele", "player.yourStatus": "Dein Status", "player.currentPlayer": "Aktueller Spieler", "player.teammate": "Partner", "player.opponents": "Gegner", "player.playingNow": "Du spielst jetzt", "player.away": "Abwesend", "player.leftDevice": "Gerät verlassen",
  "tournament.overview": "Turnierübersicht", "tournament.progressAria": "Turnierfortschritt", "tournament.roundLabel": "Runde {round}", "tournament.matchesFinished": "{finished}/{total} Spiele fertig", "tournament.noPlayers": "Noch keine Spieler. Code {code} teilen oder Spieler manuell hinzufügen.", "tournament.noMatches": "Noch keine Spiele. Erste Runde erstellen.", "tournament.courtComing": "Platz folgt", "tournament.noCourtAssigned": "Kein Platz zugewiesen", "tournament.finished": "Das Turnier ist beendet.",
  "avatar.smash": "Smash", "avatar.serve": "Aufschlag", "avatar.wall": "Wand", "avatar.lob": "Lob", "footer.developedBy": "Entwickelt von Sigurd Steen Grodem", "footer.copyrightPrefix": "Copyright", "footer.rights": "Alle Rechte vorbehalten.", "footer.privacy": "Datenschutz", "guide.link": "Kurzanleitung",
});

Object.assign(padelstarTranslations.fr, {
  "hero.title": "Jouez plus. Organisez moins.",
  "hero.subtitle": "Créez le tournoi, invitez les joueurs et laissez Padelstar s’occuper du reste.",
  "role.admin": "Admin", "role.player": "Joueur", "role.spectator": "Spectateur",
  "nav.homeAria": "Accueil", "nav.modulesAria": "Modules", "nav.home": "Accueil", "nav.create": "Créer", "nav.join": "Rejoindre", "nav.player": "Joueur", "nav.tournament": "Tournoi", "nav.frontPageAria": "Page d’accueil", "nav.openMenu": "Ouvrir le menu", "nav.closeMenu": "Fermer le menu", "nav.startChoicesAria": "Options de démarrage", "nav.viewAria": "Vue", "nav.leaveSpectator": "Quitter la vue spectateur",
  "setup.createEyebrow": "Créer", "setup.joinEyebrow": "Rejoindre", "setup.newTournament": "Nouveau tournoi", "setup.tournamentName": "Nom du tournoi", "setup.playersOptional": "Joueurs, facultatif", "setup.playersOptionalPlaceholder": "Ajoutez les joueurs manuellement si quelqu’un n’a pas son propre appareil.", "setup.adminParticipation": "Participation de l’admin", "setup.adminPlays": "L’admin joue", "setup.adminPlaysHint": "Choisissez cette option si le créateur du tournoi aura aussi un profil joueur.", "setup.adminPlayerName": "Nom du joueur admin", "setup.courtCount": "Nombre de terrains", "setup.playerNamePlaceholder": "Saisissez votre nom", "setup.yourAvatar": "Votre avatar", "setup.yourName": "Votre nom", "setup.chooseAvatar": "Choisir un avatar",
  "share.inviteCode": "Code d’invitation", "share.qrCode": "Code QR", "share.qrCodeAlt": "Code QR pour l’inscription", "share.joinLink": "Lien d’inscription", "share.spectatorLink": "Lien spectateur", "share.title": "Partager le tournoi", "share.joinHint": "Scannez le code QR ou utilisez le lien pour rejoindre le tournoi.",
  "common.name": "Nom", "common.matches": "Matchs", "common.sets": "Sets", "common.games": "Jeux", "common.standings": "Classement", "common.rules": "Règles", "common.match": "Match", "common.round": "Manche", "common.status": "Statut", "common.points": "Points", "common.court": "Terrain", "common.waiting": "En attente", "common.finished": "Terminé", "common.playing": "En cours", "common.next": "Suivant", "common.player": "Joueur", "common.single": "Simple", "common.double": "Double", "common.lobby": "Lobby",
  "actions.createTournament": "Créer le tournoi", "actions.joinTournament": "Rejoindre le tournoi", "actions.adminAddedMe": "L’admin m’a ajouté", "actions.update": "Mettre à jour", "actions.saveRules": "Enregistrer les règles", "actions.copyCode": "Copier le code", "actions.copyLink": "Copier le lien", "actions.copySpectatorLink": "Copier le lien spectateur", "actions.add": "Ajouter", "actions.save": "Enregistrer", "actions.remove": "Supprimer", "actions.startTournament": "Démarrer le tournoi", "actions.completeTournament": "Terminer le tournoi", "actions.leaveTournament": "Quitter le tournoi", "actions.markAway": "Me déclarer absent", "actions.returnToTournament": "Revenir au tournoi", "actions.viewAsSpectator": "Voir en spectateur", "actions.choosePlayer": "Choisir un joueur", "actions.joinAgain": "Rejoindre à nouveau",
  "player.nextMatch": "Votre prochain match", "player.chooseProfile": "Choisir un profil joueur", "player.chooseProfileHint": "L’application affichera votre terrain, partenaire et adversaires.", "player.yourMatches": "Vos matchs", "player.yourStatus": "Votre statut", "player.currentPlayer": "Joueur actuel", "player.teammate": "Partenaire", "player.opponents": "Adversaires", "player.playingNow": "Vous jouez maintenant", "player.away": "Absent", "player.leftDevice": "A quitté l’appareil",
  "tournament.overview": "Vue du tournoi", "tournament.progressAria": "Progression du tournoi", "tournament.roundLabel": "Manche {round}", "tournament.matchesFinished": "{finished}/{total} matchs terminés", "tournament.noPlayers": "Aucun joueur pour l’instant. Partagez le code {code} ou ajoutez des joueurs manuellement.", "tournament.noMatches": "Aucun match pour l’instant. Générez la première manche.", "tournament.courtComing": "Terrain à venir", "tournament.noCourtAssigned": "Aucun terrain attribué", "tournament.finished": "Le tournoi est terminé.",
  "avatar.smash": "Smash", "avatar.serve": "Service", "avatar.wall": "Mur", "avatar.lob": "Lob", "footer.developedBy": "Développé par Sigurd Steen Grodem", "footer.copyrightPrefix": "Copyright", "footer.rights": "Tous droits réservés.", "footer.privacy": "Confidentialité", "guide.link": "Guide rapide",
});

Object.assign(padelstarTranslations.nn, {
  "score.matchup": "{teamOne} mot {teamTwo}",
  "score.pointsLabel": "Poeng {team}",
  "score.courtForMatch": "Bane for {teamOne} mot {teamTwo}",
  "score.finishedPrefix": "Ferdig: {sets}",
  "score.setsPrefix": "Sett: {sets}",
  "score.currentSummary": "Sett: {sets} · Game: {game}",
  "matches.restingPlayers": "Pause: {players}",
});

Object.assign(padelstarTranslations.en, {
  "score.matchup": "{teamOne} vs {teamTwo}",
  "score.pointsLabel": "Points {team}",
  "score.courtForMatch": "Court for {teamOne} vs {teamTwo}",
  "score.finishedPrefix": "Finished: {sets}",
  "score.setsPrefix": "Sets: {sets}",
  "score.currentSummary": "Sets: {sets} · Game: {game}",
  "matches.restingPlayers": "Break: {players}",
});

Object.assign(padelstarTranslations.es, {
  "score.matchup": "{teamOne} contra {teamTwo}",
  "score.pointsLabel": "Puntos {team}",
  "score.courtForMatch": "Pista para {teamOne} contra {teamTwo}",
  "score.finishedPrefix": "Finalizado: {sets}",
  "score.setsPrefix": "Sets: {sets}",
  "score.currentSummary": "Sets: {sets} · Juego: {game}",
  "matches.restingPlayers": "Descanso: {players}",
});

Object.assign(padelstarTranslations.de, {
  "score.matchup": "{teamOne} gegen {teamTwo}",
  "score.pointsLabel": "Punkte {team}",
  "score.courtForMatch": "Platz für {teamOne} gegen {teamTwo}",
  "score.finishedPrefix": "Fertig: {sets}",
  "score.setsPrefix": "Sätze: {sets}",
  "score.currentSummary": "Sätze: {sets} · Spiel: {game}",
  "matches.restingPlayers": "Pause: {players}",
});

Object.assign(padelstarTranslations.fr, {
  "score.matchup": "{teamOne} contre {teamTwo}",
  "score.pointsLabel": "Points {team}",
  "score.courtForMatch": "Terrain pour {teamOne} contre {teamTwo}",
  "score.finishedPrefix": "Terminé : {sets}",
  "score.setsPrefix": "Sets : {sets}",
  "score.currentSummary": "Sets : {sets} · Jeu : {game}",
  "matches.restingPlayers": "Pause : {players}",
});

Object.assign(padelstarTranslations.nb, {
  "profile.eyebrow": "Min spiller",
  "profile.title": "Spillerprofil",
  "profile.name": "Visningsnavn",
  "profile.namePlaceholder": "Navnet ditt",
  "profile.avatar": "Avatar",
  "profile.save": "Lagre profil",
  "profile.delete": "Slett profil",
  "profile.cancelDelete": "Angre sletting",
  "profile.deleteConfirm": "Be om sletting av profilen? Profilen og historikken blir beholdt i 30 dager, og kan gjenopprettes før fristen.",
  "profile.deletePending": "Slettes {date}",
  "profile.tournaments": "Turneringer",
  "profile.matches": "Kamper",
  "profile.wins": "Seire",
  "profile.points": "Poeng",
  "profile.empty": "Opprett en profil for å samle din egen historikk på denne enheten.",
  "profile.noHistory": "Avsluttede turneringer du deltar i blir vist her.",
  "profile.historyTitle": "Tidligere turneringer",
  "profile.historyDetail": "{placement}. plass · {points} poeng · {wins} seire av {matches} kamper",
  "profile.filter": "Vis historikk",
  "profile.filterAll": "Alle",
  "profile.filterYear": "Siste år",
  "profile.filterMonth": "Siste 30 dager",
});

Object.assign(padelstarTranslations.nn, {
  "profile.eyebrow": "Min spelar", "profile.title": "Spelarprofil", "profile.name": "Visingsnamn", "profile.namePlaceholder": "Namnet ditt", "profile.avatar": "Avatar", "profile.save": "Lagre profil", "profile.delete": "Slett profil", "profile.cancelDelete": "Angre sletting", "profile.deleteConfirm": "Be om sletting av profilen? Profilen og historikken blir halden i 30 dagar og kan gjenopprettast før fristen.", "profile.deletePending": "Slettast {date}", "profile.tournaments": "Turneringar", "profile.matches": "Kampar", "profile.wins": "Sigrar", "profile.points": "Poeng", "profile.empty": "Opprett ein profil for å samle di eiga historikk på denne eininga.", "profile.noHistory": "Avslutta turneringar du deltek i blir viste her.", "profile.historyTitle": "Tidlegare turneringar", "profile.historyDetail": "{placement}. plass · {points} poeng · {wins} sigrar av {matches} kampar", "profile.filter": "Vis historikk", "profile.filterAll": "Alle", "profile.filterYear": "Siste år", "profile.filterMonth": "Siste 30 dagar",
});

Object.assign(padelstarTranslations.en, {
  "profile.eyebrow": "My player", "profile.title": "Player profile", "profile.name": "Display name", "profile.namePlaceholder": "Your name", "profile.avatar": "Avatar", "profile.save": "Save profile", "profile.delete": "Delete profile", "profile.cancelDelete": "Undo deletion", "profile.deleteConfirm": "Request profile deletion? Your profile and history will be kept for 30 days and can be restored before the deadline.", "profile.deletePending": "Deletes {date}", "profile.tournaments": "Tournaments", "profile.matches": "Matches", "profile.wins": "Wins", "profile.points": "Points", "profile.empty": "Create a profile to keep your own history on this device.", "profile.noHistory": "Completed tournaments you play in will appear here.", "profile.historyTitle": "Previous tournaments", "profile.historyDetail": "{placement} place · {points} points · {wins} wins from {matches} matches", "profile.filter": "Show history", "profile.filterAll": "All", "profile.filterYear": "Last year", "profile.filterMonth": "Last 30 days",
});

Object.assign(padelstarTranslations.es, {
  "profile.eyebrow": "Mi jugador", "profile.title": "Perfil de jugador", "profile.name": "Nombre visible", "profile.namePlaceholder": "Tu nombre", "profile.avatar": "Avatar", "profile.save": "Guardar perfil", "profile.delete": "Borrar perfil", "profile.cancelDelete": "Deshacer borrado", "profile.deleteConfirm": "¿Solicitar el borrado del perfil? El perfil y el historial se conservarán durante 30 días y podrán restaurarse antes de la fecha límite.", "profile.deletePending": "Se borra el {date}", "profile.tournaments": "Torneos", "profile.matches": "Partidos", "profile.wins": "Victorias", "profile.points": "Puntos", "profile.empty": "Crea un perfil para conservar tu historial en este dispositivo.", "profile.noHistory": "Aquí aparecerán los torneos terminados en los que participes.", "profile.historyTitle": "Torneos anteriores", "profile.historyDetail": "{placement}. puesto · {points} puntos · {wins} victorias de {matches} partidos", "profile.filter": "Ver historial", "profile.filterAll": "Todos", "profile.filterYear": "Último año", "profile.filterMonth": "Últimos 30 días",
});

Object.assign(padelstarTranslations.de, {
  "profile.eyebrow": "Mein Spieler", "profile.title": "Spielerprofil", "profile.name": "Anzeigename", "profile.namePlaceholder": "Dein Name", "profile.avatar": "Avatar", "profile.save": "Profil speichern", "profile.delete": "Profil löschen", "profile.cancelDelete": "Löschung rückgängig", "profile.deleteConfirm": "Profil löschen? Profil und Verlauf bleiben 30 Tage erhalten und können vorher wiederhergestellt werden.", "profile.deletePending": "Löschung am {date}", "profile.tournaments": "Turniere", "profile.matches": "Spiele", "profile.wins": "Siege", "profile.points": "Punkte", "profile.empty": "Erstelle ein Profil, um deinen Verlauf auf diesem Gerät zu speichern.", "profile.noHistory": "Abgeschlossene Turniere, an denen du teilnimmst, erscheinen hier.", "profile.historyTitle": "Frühere Turniere", "profile.historyDetail": "Platz {placement} · {points} Punkte · {wins} Siege aus {matches} Spielen", "profile.filter": "Verlauf anzeigen", "profile.filterAll": "Alle", "profile.filterYear": "Letztes Jahr", "profile.filterMonth": "Letzte 30 Tage",
});

Object.assign(padelstarTranslations.fr, {
  "profile.eyebrow": "Mon joueur", "profile.title": "Profil joueur", "profile.name": "Nom affiché", "profile.namePlaceholder": "Votre nom", "profile.avatar": "Avatar", "profile.save": "Enregistrer le profil", "profile.delete": "Supprimer le profil", "profile.cancelDelete": "Annuler la suppression", "profile.deleteConfirm": "Demander la suppression du profil ? Le profil et l’historique seront conservés 30 jours et pourront être restaurés avant la date limite.", "profile.deletePending": "Suppression le {date}", "profile.tournaments": "Tournois", "profile.matches": "Matchs", "profile.wins": "Victoires", "profile.points": "Points", "profile.empty": "Créez un profil pour conserver votre historique sur cet appareil.", "profile.noHistory": "Les tournois terminés auxquels vous participez apparaîtront ici.", "profile.historyTitle": "Tournois précédents", "profile.historyDetail": "{placement}e place · {points} points · {wins} victoires sur {matches} matchs", "profile.filter": "Afficher l’historique", "profile.filterAll": "Tous", "profile.filterYear": "Dernière année", "profile.filterMonth": "30 derniers jours",
});

Object.assign(padelstarTranslations.es, {
  "notifications.matchReadyTitle": "Tu partido está listo", "notifications.matchReadyBody": "Tu próximo partido está listo.", "notifications.matchPlayingBody": "Tu partido está en curso.",
});
Object.assign(padelstarTranslations.de, {
  "notifications.matchReadyTitle": "Dein Spiel ist bereit", "notifications.matchReadyBody": "Dein nächstes Spiel ist bereit.", "notifications.matchPlayingBody": "Dein Spiel läuft jetzt.",
});
Object.assign(padelstarTranslations.fr, {
  "notifications.matchReadyTitle": "Votre match est prêt", "notifications.matchReadyBody": "Votre prochain match est prêt.", "notifications.matchPlayingBody": "Votre match est en cours.",
});

for (const [language, value] of Object.entries({
  nb: "Hopp til innhold",
  nn: "Hopp til innhald",
  en: "Skip to content",
  es: "Saltar al contenido",
  de: "Zum Inhalt springen",
  fr: "Aller au contenu",
})) {
  padelstarTranslations[language]["nav.skipToContent"] = value;
}

for (const [language, value] of Object.entries({
  nb: "Logg inn med konto",
  nn: "Logg inn med konto",
  en: "Log in with account",
  es: "Iniciar sesión con cuenta",
  de: "Mit Konto anmelden",
  fr: "Se connecter avec un compte",
  sv: "Logga in med konto",
  da: "Log ind med konto",
})) {
  padelstarTranslations[language]["account.openLogin"] = value;
}

for (const [language, value] of Object.entries({
  nb: "Profil",
  nn: "Profil",
  en: "Profile",
  es: "Perfil",
  de: "Profil",
  fr: "Profil",
  sv: "Profil",
  da: "Profil",
})) {
  padelstarTranslations[language]["nav.account"] = value;
}

for (const [language, values] of Object.entries({
  nb: { "account.newPassword": "Nytt passord", "account.confirmPassword": "Bekreft passord", "account.newPasswordPlaceholder": "La stå tomt for å beholde passordet", "account.confirmPasswordPlaceholder": "Skriv passordet på nytt", "account.saveChanges": "Lagre endringer", "account.memberSince": "Medlem siden {date}", "account.emailConfirmed": "E-post bekreftet", "account.emailNotConfirmed": "E-post ikke bekreftet", "account.authUpdated": "Kontoinformasjonen er oppdatert.", "account.authEmailChangePending": "Sjekk den nye e-posten for å bekrefte adresseendringen.", "account.authUpdateFailed": "Kontoinformasjonen kunne ikke oppdateres.", "account.passwordMismatch": "Passordene er ikke like.", "account.noChanges": "Ingen endringer å lagre." },
  nn: { "account.newPassword": "Nytt passord", "account.confirmPassword": "Stadfest passord", "account.newPasswordPlaceholder": "La stå tomt for å behalde passordet", "account.confirmPasswordPlaceholder": "Skriv passordet på nytt", "account.saveChanges": "Lagre endringar", "account.memberSince": "Medlem sidan {date}", "account.emailConfirmed": "E-post stadfesta", "account.emailNotConfirmed": "E-post ikkje stadfesta", "account.authUpdated": "Kontoinformasjonen er oppdatert.", "account.authEmailChangePending": "Sjekk den nye e-posten for å stadfeste adresseendringa.", "account.authUpdateFailed": "Kontoinformasjonen kunne ikkje oppdaterast.", "account.passwordMismatch": "Passorda er ikkje like.", "account.noChanges": "Ingen endringar å lagre." },
  en: { "account.newPassword": "New password", "account.confirmPassword": "Confirm password", "account.newPasswordPlaceholder": "Leave blank to keep your current password", "account.confirmPasswordPlaceholder": "Enter the password again", "account.saveChanges": "Save changes", "account.memberSince": "Member since {date}", "account.emailConfirmed": "Email confirmed", "account.emailNotConfirmed": "Email not confirmed", "account.authUpdated": "Account information updated.", "account.authEmailChangePending": "Check the new email to confirm the address change.", "account.authUpdateFailed": "Account information could not be updated.", "account.passwordMismatch": "The passwords do not match.", "account.noChanges": "There are no changes to save." },
  es: { "account.newPassword": "Nueva contraseña", "account.confirmPassword": "Confirmar contraseña", "account.newPasswordPlaceholder": "Déjalo vacío para conservar tu contraseña", "account.confirmPasswordPlaceholder": "Escribe la contraseña de nuevo", "account.saveChanges": "Guardar cambios", "account.memberSince": "Miembro desde {date}", "account.emailConfirmed": "Correo confirmado", "account.emailNotConfirmed": "Correo no confirmado", "account.authUpdated": "La información de la cuenta se ha actualizado.", "account.authEmailChangePending": "Revisa el nuevo correo para confirmar el cambio de dirección.", "account.authUpdateFailed": "No se pudo actualizar la información de la cuenta.", "account.passwordMismatch": "Las contraseñas no coinciden.", "account.noChanges": "No hay cambios que guardar." },
  de: { "account.newPassword": "Neues Passwort", "account.confirmPassword": "Passwort bestätigen", "account.newPasswordPlaceholder": "Leer lassen, um das aktuelle Passwort zu behalten", "account.confirmPasswordPlaceholder": "Passwort erneut eingeben", "account.saveChanges": "Änderungen speichern", "account.memberSince": "Mitglied seit {date}", "account.emailConfirmed": "E-Mail bestätigt", "account.emailNotConfirmed": "E-Mail nicht bestätigt", "account.authUpdated": "Kontoinformationen aktualisiert.", "account.authEmailChangePending": "Prüfe die neue E-Mail, um die Änderung zu bestätigen.", "account.authUpdateFailed": "Kontoinformationen konnten nicht aktualisiert werden.", "account.passwordMismatch": "Die Passwörter stimmen nicht überein.", "account.noChanges": "Keine Änderungen zu speichern." },
  fr: { "account.newPassword": "Nouveau mot de passe", "account.confirmPassword": "Confirmer le mot de passe", "account.newPasswordPlaceholder": "Laissez vide pour conserver le mot de passe actuel", "account.confirmPasswordPlaceholder": "Saisissez à nouveau le mot de passe", "account.saveChanges": "Enregistrer les modifications", "account.memberSince": "Membre depuis {date}", "account.emailConfirmed": "E-mail confirmé", "account.emailNotConfirmed": "E-mail non confirmé", "account.authUpdated": "Les informations du compte ont été mises à jour.", "account.authEmailChangePending": "Consultez le nouvel e-mail pour confirmer le changement d’adresse.", "account.authUpdateFailed": "Les informations du compte n’ont pas pu être mises à jour.", "account.passwordMismatch": "Les mots de passe ne correspondent pas.", "account.noChanges": "Aucune modification à enregistrer." },
  sv: { "account.newPassword": "Nytt lösenord", "account.confirmPassword": "Bekräfta lösenord", "account.newPasswordPlaceholder": "Lämna tomt för att behålla nuvarande lösenord", "account.confirmPasswordPlaceholder": "Skriv lösenordet igen", "account.saveChanges": "Spara ändringar", "account.memberSince": "Medlem sedan {date}", "account.emailConfirmed": "E-post bekräftad", "account.emailNotConfirmed": "E-post inte bekräftad", "account.authUpdated": "Kontoinformationen har uppdaterats.", "account.authEmailChangePending": "Kontrollera den nya e-posten för att bekräfta adressändringen.", "account.authUpdateFailed": "Kontoinformationen kunde inte uppdateras.", "account.passwordMismatch": "Lösenorden matchar inte.", "account.noChanges": "Det finns inga ändringar att spara." },
  da: { "account.newPassword": "Ny adgangskode", "account.confirmPassword": "Bekræft adgangskode", "account.newPasswordPlaceholder": "Lad feltet stå tomt for at beholde din adgangskode", "account.confirmPasswordPlaceholder": "Skriv adgangskoden igen", "account.saveChanges": "Gem ændringer", "account.memberSince": "Medlem siden {date}", "account.emailConfirmed": "E-mail bekræftet", "account.emailNotConfirmed": "E-mail ikke bekræftet", "account.authUpdated": "Kontooplysningerne er opdateret.", "account.authEmailChangePending": "Tjek den nye e-mail for at bekræfte adresseændringen.", "account.authUpdateFailed": "Kontooplysningerne kunne ikke opdateres.", "account.passwordMismatch": "Adgangskoderne er ikke ens.", "account.noChanges": "Der er ingen ændringer at gemme." },
})) {
  Object.assign(padelstarTranslations[language], values);
}

for (const [language, values] of Object.entries({
  nb: { "queue.title": "Banekø", "queue.courts": "{count} baner", "score.playAllMatchesFirst": "Fullfør kampene" },
  nn: { "queue.title": "Banekø", "queue.courts": "{count} banar", "score.playAllMatchesFirst": "Fullfør kampane" },
  en: { "queue.title": "Court queue", "queue.courts": "{count} courts", "score.playAllMatchesFirst": "Finish the matches" },
  es: { "queue.title": "Cola de pistas", "queue.courts": "{count} pistas", "score.playAllMatchesFirst": "Termina los partidos" },
  de: { "queue.title": "Platz-Warteschlange", "queue.courts": "{count} Plätze", "score.playAllMatchesFirst": "Spiele beenden" },
  fr: { "queue.title": "File des terrains", "queue.courts": "{count} terrains", "score.playAllMatchesFirst": "Terminez les matchs" },
  sv: { "queue.title": "Bokö", "queue.courts": "{count} banor", "score.playAllMatchesFirst": "Slutför matcherna" },
  da: { "queue.title": "Bane kø", "queue.courts": "{count} baner", "score.playAllMatchesFirst": "Færdiggør kampene" },
})) {
  Object.assign(padelstarTranslations[language], values);
}

for (const [language, values] of Object.entries({
  nn: { "account.eyebrow": "Personleg konto", "account.title": "Konto", "account.hint": "Opprett eller oppdater spelarprofilen din for å ta vare på eiga statistikk og historikk.", "account.authEyebrow": "Innlogging", "account.authTitle": "Konto med passord", "account.email": "E-post", "account.password": "Passord", "account.signIn": "Logg inn", "account.signUp": "Opprett konto", "account.signOut": "Logg ut", "account.authSignedInAs": "Innlogga som: {name}", "account.accountUser": "konto", "account.authSignedIn": "Du er no logga inn.", "account.authSignedOut": "Du er logga ut.", "account.authConfirmEmail": "Sjekk e-posten for å stadfeste kontoen før du loggar inn.", "account.authUnavailable": "Konto-innlogging er ikkje tilgjengeleg akkurat no.", "account.authFailed": "Innlogginga kunne ikkje fullførast. Kontroller e-post og passord.", "account.openLogin": "Logg inn med konto" },
  en: { "account.eyebrow": "Personal account", "account.title": "Account", "account.hint": "Create or update your player profile to keep your own statistics and history.", "account.authEyebrow": "Sign in", "account.authTitle": "Account with password", "account.email": "Email", "account.password": "Password", "account.signIn": "Sign in", "account.signUp": "Create account", "account.signOut": "Sign out", "account.authSignedInAs": "Signed in as: {name}", "account.accountUser": "account", "account.authSignedIn": "You are now signed in.", "account.authSignedOut": "You are signed out.", "account.authConfirmEmail": "Check your email to confirm the account before signing in.", "account.authUnavailable": "Account sign-in is not available right now.", "account.authFailed": "Sign-in could not be completed. Check your email and password.", "account.openLogin": "Sign in with account" },
  es: { "account.eyebrow": "Cuenta personal", "account.title": "Cuenta", "account.hint": "Crea o actualiza tu perfil de jugador para conservar tus estadísticas e historial.", "account.authEyebrow": "Acceso", "account.authTitle": "Cuenta con contraseña", "account.email": "Correo electrónico", "account.password": "Contraseña", "account.signIn": "Iniciar sesión", "account.signUp": "Crear cuenta", "account.signOut": "Cerrar sesión", "account.authSignedInAs": "Sesión iniciada como: {name}", "account.accountUser": "cuenta", "account.authSignedIn": "Has iniciado sesión.", "account.authSignedOut": "Has cerrado sesión.", "account.authConfirmEmail": "Revisa tu correo para confirmar la cuenta antes de iniciar sesión.", "account.authUnavailable": "El acceso a la cuenta no está disponible ahora.", "account.authFailed": "No se pudo completar el acceso. Comprueba tu correo y contraseña.", "account.openLogin": "Iniciar sesión con cuenta" },
  de: { "account.eyebrow": "Persönliches Konto", "account.title": "Konto", "account.hint": "Erstelle oder aktualisiere dein Spielerprofil, um deine Statistiken und deinen Verlauf zu speichern.", "account.authEyebrow": "Anmeldung", "account.authTitle": "Konto mit Passwort", "account.email": "E-Mail", "account.password": "Passwort", "account.signIn": "Anmelden", "account.signUp": "Konto erstellen", "account.signOut": "Abmelden", "account.authSignedInAs": "Angemeldet als: {name}", "account.accountUser": "Konto", "account.authSignedIn": "Du bist jetzt angemeldet.", "account.authSignedOut": "Du bist abgemeldet.", "account.authConfirmEmail": "Prüfe deine E-Mail, um das Konto vor der Anmeldung zu bestätigen.", "account.authUnavailable": "Die Kontoanmeldung ist derzeit nicht verfügbar.", "account.authFailed": "Die Anmeldung konnte nicht abgeschlossen werden. Prüfe E-Mail und Passwort.", "account.openLogin": "Mit Konto anmelden" },
  fr: { "account.eyebrow": "Compte personnel", "account.title": "Compte", "account.hint": "Créez ou mettez à jour votre profil joueur pour conserver vos statistiques et votre historique.", "account.authEyebrow": "Connexion", "account.authTitle": "Compte avec mot de passe", "account.email": "E-mail", "account.password": "Mot de passe", "account.signIn": "Se connecter", "account.signUp": "Créer un compte", "account.signOut": "Se déconnecter", "account.authSignedInAs": "Connecté en tant que : {name}", "account.accountUser": "compte", "account.authSignedIn": "Vous êtes connecté.", "account.authSignedOut": "Vous êtes déconnecté.", "account.authConfirmEmail": "Consultez votre e-mail pour confirmer le compte avant de vous connecter.", "account.authUnavailable": "La connexion au compte n’est pas disponible actuellement.", "account.authFailed": "La connexion n’a pas pu être terminée. Vérifiez votre e-mail et votre mot de passe.", "account.openLogin": "Se connecter avec un compte" },
  sv: { "account.eyebrow": "Personligt konto", "account.title": "Konto", "account.hint": "Skapa eller uppdatera din spelarprofil för att spara din egen statistik och historik.", "account.authEyebrow": "Logga in", "account.authTitle": "Konto med lösenord", "account.email": "E-post", "account.password": "Lösenord", "account.signIn": "Logga in", "account.signUp": "Skapa konto", "account.signOut": "Logga ut", "account.authSignedInAs": "Inloggad som: {name}", "account.accountUser": "konto", "account.authSignedIn": "Du är nu inloggad.", "account.authSignedOut": "Du är utloggad.", "account.authConfirmEmail": "Kontrollera din e-post för att bekräfta kontot innan du loggar in.", "account.authUnavailable": "Konto-inloggning är inte tillgänglig just nu.", "account.authFailed": "Det gick inte att logga in. Kontrollera e-post och lösenord.", "account.openLogin": "Logga in med konto" },
  da: { "account.eyebrow": "Personlig konto", "account.title": "Konto", "account.hint": "Opret eller opdater din spillerprofil for at gemme din egen statistik og historik.", "account.authEyebrow": "Log ind", "account.authTitle": "Konto med adgangskode", "account.email": "E-mail", "account.password": "Adgangskode", "account.signIn": "Log ind", "account.signUp": "Opret konto", "account.signOut": "Log ud", "account.authSignedInAs": "Logget ind som: {name}", "account.accountUser": "konto", "account.authSignedIn": "Du er nu logget ind.", "account.authSignedOut": "Du er logget ud.", "account.authConfirmEmail": "Tjek din e-mail for at bekræfte kontoen, før du logger ind.", "account.authUnavailable": "Konto-login er ikke tilgængeligt lige nu.", "account.authFailed": "Login kunne ikke gennemføres. Kontrollér e-mail og adgangskode.", "account.openLogin": "Log ind med konto" },
})) {
  Object.assign(padelstarTranslations[language], values);
}

for (const [language, values] of Object.entries({
  nb: {
    "matches.matchNumber": "Kamp {match}", "matches.restingCount": "{count} pause",
    "score.playerSubmitTitle": "Registrer kampresultat", "score.playerSubmitMatch": "Kamp", "score.teamOneGames": "Lag 1", "score.teamTwoGames": "Lag 2", "score.playerSubmitHint": "Begge lag kan sende inn. Ulike resultater må avklares av admin.", "actions.submitResult": "Send resultat",
    "rules.tennisPointsTitle": "Tennispoeng", "rules.tennisPointsText": "Poeng føres som 0, 15, 30, 40 og A. Ved 40-40 må laget vinne to poeng på rad.", "rules.setsTitle": "Sett", "rules.setsText": "Kampen spilles best av {sets} sett. Et sett vinnes normalt til {games} games med to games margin.", "rules.rankingTitle": "Rangering", "rules.rankingMatches": "Tabellen gir 3 poeng for kampseier.", "rules.rankingSets": "Tabellen gir poeng for vunnet sett.", "rules.rankingGames": "Tabellen teller hvert vunnet game.", "rules.rankingFallback": "Tabellpoeng følger valgt regelsett.", "rules.rankingText": "{pointModeText} Ved likhet sorteres spillerne på kampseire, sett og navn.", "rules.restTitle": "Pause", "rules.restText": "Ved oddetall eller for mange lag til antall baner får noen pause i runden og kommer tilbake i neste rotasjon.",
  },
  nn: {
    "matches.matchNumber": "Kamp {match}", "matches.restingCount": "{count} pause", "score.playerSubmitTitle": "Registrer kampresultat", "score.playerSubmitMatch": "Kamp", "score.teamOneGames": "Lag 1", "score.teamTwoGames": "Lag 2", "score.playerSubmitHint": "Begge laga kan sende inn. Ulike resultat må avklarast av admin.", "actions.submitResult": "Send resultat", "rules.tennisPointsTitle": "Tennispoeng", "rules.tennisPointsText": "Poeng blir førte som 0, 15, 30, 40 og A. Ved 40-40 må laget vinne to poeng på rad.", "rules.setsTitle": "Sett", "rules.setsText": "Kampen blir spela best av {sets} sett. Eit sett blir normalt vunne til {games} games med to games margin.", "rules.rankingTitle": "Rangering", "rules.rankingMatches": "Tabellen gir 3 poeng for kampseier.", "rules.rankingSets": "Tabellen gir poeng for vunne sett.", "rules.rankingGames": "Tabellen tel kvart vunne game.", "rules.rankingFallback": "Tabellpoeng følgjer valt regelsett.", "rules.rankingText": "{pointModeText} Ved likskap blir spelarane sorterte på kampseier, sett og namn.", "rules.restTitle": "Pause", "rules.restText": "Ved oddetal eller for mange lag i høve til talet på banar får nokon pause i runden og kjem tilbake i neste rotasjon.",
  },
  en: {
    "matches.matchNumber": "Match {match}", "matches.restingCount": "{count} resting", "score.playerSubmitTitle": "Submit match result", "score.playerSubmitMatch": "Match", "score.teamOneGames": "Team 1", "score.teamTwoGames": "Team 2", "score.playerSubmitHint": "Both teams can submit. Different results must be resolved by the admin.", "actions.submitResult": "Submit result", "rules.tennisPointsTitle": "Tennis points", "rules.tennisPointsText": "Points are scored as 0, 15, 30, 40 and A. At 40-40, the team must win two points in a row.", "rules.setsTitle": "Sets", "rules.setsText": "The match is best of {sets} sets. A set is normally won at {games} games with a two-game margin.", "rules.rankingTitle": "Ranking", "rules.rankingMatches": "The table awards 3 points for a match win.", "rules.rankingSets": "The table awards points for a set win.", "rules.rankingGames": "The table counts every game won.", "rules.rankingFallback": "Table points follow the selected ruleset.", "rules.rankingText": "{pointModeText} In a tie, players are sorted by match wins, sets and name.", "rules.restTitle": "Rest", "rules.restText": "With an odd number of players or too many teams for the available courts, some players rest for the round and return in the next rotation.",
  },
  es: {
    "matches.matchNumber": "Partido {match}", "matches.restingCount": "{count} descanso", "score.playerSubmitTitle": "Registrar resultado", "score.playerSubmitMatch": "Partido", "score.teamOneGames": "Equipo 1", "score.teamTwoGames": "Equipo 2", "score.playerSubmitHint": "Ambos equipos pueden enviar el resultado. El admin debe resolver las diferencias.", "actions.submitResult": "Enviar resultado", "rules.tennisPointsTitle": "Puntos de tenis", "rules.tennisPointsText": "Los puntos se cuentan como 0, 15, 30, 40 y A. Con 40-40, el equipo debe ganar dos puntos seguidos.", "rules.setsTitle": "Sets", "rules.setsText": "El partido se juega al mejor de {sets} sets. Normalmente se gana un set con {games} juegos y dos de ventaja.", "rules.rankingTitle": "Clasificación", "rules.rankingMatches": "La tabla otorga 3 puntos por ganar un partido.", "rules.rankingSets": "La tabla otorga puntos por ganar un set.", "rules.rankingGames": "La tabla cuenta cada juego ganado.", "rules.rankingFallback": "Los puntos siguen las reglas seleccionadas.", "rules.rankingText": "{pointModeText} En caso de empate, los jugadores se ordenan por victorias, sets y nombre.", "rules.restTitle": "Descanso", "rules.restText": "Con un número impar de jugadores o demasiados equipos para las pistas disponibles, algunos descansan y vuelven en la siguiente rotación.",
  },
  de: {
    "matches.matchNumber": "Spiel {match}", "matches.restingCount": "{count} Pause", "score.playerSubmitTitle": "Spielergebnis eintragen", "score.playerSubmitMatch": "Spiel", "score.teamOneGames": "Team 1", "score.teamTwoGames": "Team 2", "score.playerSubmitHint": "Beide Teams können ein Ergebnis senden. Unterschiede muss der Admin klären.", "actions.submitResult": "Ergebnis senden", "rules.tennisPointsTitle": "Tennis-Punkte", "rules.tennisPointsText": "Punkte werden als 0, 15, 30, 40 und A gezählt. Bei 40-40 muss das Team zwei Punkte in Folge gewinnen.", "rules.setsTitle": "Sätze", "rules.setsText": "Das Spiel geht über maximal {sets} Sätze. Ein Satz wird normalerweise mit {games} Spielen und zwei Spielen Vorsprung gewonnen.", "rules.rankingTitle": "Tabelle", "rules.rankingMatches": "Die Tabelle vergibt 3 Punkte für einen Spielsieg.", "rules.rankingSets": "Die Tabelle vergibt Punkte für einen Satzsieg.", "rules.rankingGames": "Die Tabelle zählt jedes gewonnene Spiel.", "rules.rankingFallback": "Die Tabellenpunkte folgen dem gewählten Regelset.", "rules.rankingText": "{pointModeText} Bei Gleichstand entscheidet die Reihenfolge nach Siegen, Sätzen und Namen.", "rules.restTitle": "Pause", "rules.restText": "Bei einer ungeraden Spielerzahl oder zu vielen Teams für die verfügbaren Plätze pausieren einige Spieler und kehren in der nächsten Rotation zurück.",
  },
  fr: {
    "matches.matchNumber": "Match {match}", "matches.restingCount": "{count} repos", "score.playerSubmitTitle": "Saisir le résultat", "score.playerSubmitMatch": "Match", "score.teamOneGames": "Équipe 1", "score.teamTwoGames": "Équipe 2", "score.playerSubmitHint": "Les deux équipes peuvent envoyer un résultat. L’admin doit résoudre les différences.", "actions.submitResult": "Envoyer le résultat", "rules.tennisPointsTitle": "Points de tennis", "rules.tennisPointsText": "Les points sont comptés 0, 15, 30, 40 et A. À 40-40, l’équipe doit gagner deux points d’affilée.", "rules.setsTitle": "Sets", "rules.setsText": "Le match se joue au meilleur de {sets} sets. Un set se gagne normalement à {games} jeux avec deux jeux d’écart.", "rules.rankingTitle": "Classement", "rules.rankingMatches": "Le classement attribue 3 points pour une victoire.", "rules.rankingSets": "Le classement attribue des points pour un set gagné.", "rules.rankingGames": "Le classement compte chaque jeu gagné.", "rules.rankingFallback": "Les points suivent les règles sélectionnées.", "rules.rankingText": "{pointModeText} En cas d’égalité, les joueurs sont triés par victoires, sets et nom.", "rules.restTitle": "Repos", "rules.restText": "Avec un nombre impair de joueurs ou trop d’équipes pour les terrains disponibles, certains se reposent et reviennent à la rotation suivante.",
  },
  sv: {
    "matches.matchNumber": "Match {match}", "matches.restingCount": "{count} vila", "score.playerSubmitTitle": "Registrera matchresultat", "score.playerSubmitMatch": "Match", "score.teamOneGames": "Lag 1", "score.teamTwoGames": "Lag 2", "score.playerSubmitHint": "Båda lagen kan skicka in resultat. Admin måste lösa olika resultat.", "actions.submitResult": "Skicka resultat", "rules.tennisPointsTitle": "Tennispoäng", "rules.tennisPointsText": "Poäng räknas som 0, 15, 30, 40 och A. Vid 40–40 måste laget vinna två poäng i rad.", "rules.setsTitle": "Set", "rules.setsText": "Matchen spelas bäst av {sets} set. Ett set vinns normalt till {games} game med två games marginal.", "rules.rankingTitle": "Ranking", "rules.rankingMatches": "Tabellen ger 3 poäng för en matchvinst.", "rules.rankingSets": "Tabellen ger poäng för vunna set.", "rules.rankingGames": "Tabellen räknar varje vunnet game.", "rules.rankingFallback": "Tabellpoängen följer valt regelverk.", "rules.rankingText": "{pointModeText} Vid lika resultat sorteras spelarna efter vinster, set och namn.", "rules.restTitle": "Vila", "rules.restText": "Vid udda antal spelare eller för många lag för tillgängliga banor vilar några i omgången och återkommer i nästa rotation.",
  },
  da: {
    "matches.matchNumber": "Kamp {match}", "matches.restingCount": "{count} pause", "score.playerSubmitTitle": "Registrer kampresultat", "score.playerSubmitMatch": "Kamp", "score.teamOneGames": "Hold 1", "score.teamTwoGames": "Hold 2", "score.playerSubmitHint": "Begge hold kan indsende et resultat. Forskelle skal afklares af admin.", "actions.submitResult": "Send resultat", "rules.tennisPointsTitle": "Tennispoint", "rules.tennisPointsText": "Point tælles som 0, 15, 30, 40 og A. Ved 40-40 skal holdet vinde to point i træk.", "rules.setsTitle": "Sæt", "rules.setsText": "Kampen spilles bedst af {sets} sæt. Et sæt vindes normalt til {games} games med to games forskel.", "rules.rankingTitle": "Rangliste", "rules.rankingMatches": "Tabellen giver 3 point for en kampsejr.", "rules.rankingSets": "Tabellen giver point for et vundet sæt.", "rules.rankingGames": "Tabellen tæller hvert vundet game.", "rules.rankingFallback": "Tabelpoint følger det valgte regelsæt.", "rules.rankingText": "{pointModeText} Ved lige resultat sorteres spillerne efter sejre, sæt og navn.", "rules.restTitle": "Pause", "rules.restText": "Ved et ulige antal spillere eller for mange hold til de tilgængelige baner holder nogle pause og vender tilbage i næste rotation.",
  },
})) {
  Object.assign(padelstarTranslations[language], values);
}

for (const [language, values] of Object.entries({
  nb: { "pwa.install": "Installer Padelstar på din enhet", "pwa.installTitle": "Installer Padelstar", "account.eyebrow": "Personlig konto", "account.title": "Konto", "account.hint": "Opprett eller oppdater spillerprofilen din for å ta vare på egen statistikk og historikk.", "setup.avatarAssigned": "Tildeles automatisk når du blir registrert.", "admin.identityRequired": "Admin må være innlogget før en live-turnering kan opprettes.", "admin.identitySignInRequired": "Logg inn med admin-kontoen før du oppretter en live-turnering.", "admin.identityEmailRequired": "Skriv inn admin-e-postadressen først." },
  nn: { "pwa.install": "Installer Padelstar", "pwa.installTitle": "Installer Padelstar", "setup.avatarAssigned": "Blir tildelt automatisk når du blir registrert.", "admin.identityRequired": "Admin må vere innlogga før ein live-turnering kan opprettast.", "admin.identitySignInRequired": "Logg inn med admin-kontoen før du opprettar ei live-turnering." },
  en: { "pwa.install": "Install Padelstar", "pwa.installTitle": "Install Padelstar", "setup.avatarAssigned": "Assigned automatically when you join.", "admin.identityRequired": "The admin must be signed in before a live tournament can be created.", "admin.identitySignInRequired": "Sign in with the admin account before creating a live tournament." },
  es: { "pwa.install": "Instalar Padelstar", "pwa.installTitle": "Instalar Padelstar", "setup.avatarAssigned": "Se asigna un avatar automáticamente al unirte.", "admin.identityRequired": "El administrador debe iniciar sesión antes de crear un torneo en vivo.", "admin.identitySignInRequired": "Inicia sesión con la cuenta de administrador antes de crear un torneo en vivo." },
  de: { "pwa.install": "Padelstar installieren", "pwa.installTitle": "Padelstar installieren", "setup.avatarAssigned": "Beim Beitritt wird automatisch ein Avatar zugewiesen.", "admin.identityRequired": "Der Admin muss angemeldet sein, bevor ein Live-Turnier erstellt werden kann.", "admin.identitySignInRequired": "Melde dich mit dem Admin-Konto an, bevor du ein Live-Turnier erstellst." },
  fr: { "pwa.install": "Installer Padelstar", "pwa.installTitle": "Installer Padelstar", "setup.avatarAssigned": "Un avatar est attribué automatiquement lors de votre inscription.", "admin.identityRequired": "L’administrateur doit être connecté avant de créer un tournoi en direct.", "admin.identitySignInRequired": "Connectez-vous avec le compte admin avant de créer un tournoi en direct." },
})) {
  Object.assign(padelstarTranslations[language], values);
}

for (const [language, values] of Object.entries({
  nb: {
    "actions.shareTournament": "Del turnering", "actions.enableNotifications": "Slå på varsler", "actions.disableNotifications": "Slå av varsler", "actions.sendAdminLink": "Send innloggingslenke", "actions.claimTournament": "Knytt til min konto", "share.shareText": "Bli med i {code}", "share.shared": "Turneringen er delt", "share.shareFallback": "Lenken er kopiert", "messages.notificationsDenied": "Varsler er ikke tillatt i nettleseren", "notifications.enabledTitle": "Padelstar-varsler er på", "notifications.enabledBody": "Du får varsler for denne spillerøkten på denne enheten.", "notifications.matchReadyTitle": "Kampen din er klar", "notifications.matchReadyBody": "Din neste kamp er klar.", "notifications.matchPlayingBody": "Kampen din pågår nå.", "admin.identityTitle": "Admin-tilgang", "admin.identityHint": "Knytt turneringen til en konto for enklere gjenoppretting.", "admin.identityEmailPlaceholder": "E-postadresse", "admin.identityUnavailable": "Konto-innlogging er ikke tilgjengelig akkurat nå.", "admin.identityFailed": "Innlogging kunne ikke fullføres.", "admin.identityLinkSent": "Sjekk e-posten for innloggingslenken.", "admin.identitySignInFirst": "Logg inn før du knytter turneringen til kontoen.", "admin.identityClaimed": "Turneringen er knyttet til kontoen din.", "admin.identityClaimedShort": "Knyttet til konto", "admin.identitySignedIn": "Innlogget", "admin.identityToken": "Lokal admin-nøkkel",
  },
  nn: {
    "actions.shareTournament": "Del turnering", "actions.enableNotifications": "Slå på varslingar", "actions.disableNotifications": "Slå av varslingar", "actions.sendAdminLink": "Send innloggingslenke", "actions.claimTournament": "Knytt til kontoen min", "share.shareText": "Bli med i {code}", "share.shared": "Turneringa er delt", "share.shareFallback": "Lenka er kopiert", "messages.notificationsDenied": "Varslingar er ikkje tillatne i nettlesaren", "notifications.enabledTitle": "Padelstar-varslingar er på", "notifications.enabledBody": "Du får varslingar for denne spelarøkta på denne eininga.", "notifications.matchReadyTitle": "Kampen din er klar", "notifications.matchReadyBody": "Neste kamp er klar.", "notifications.matchPlayingBody": "Kampen din går no.", "admin.identityTitle": "Admin-tilgang", "admin.identityHint": "Knytt turneringa til ein konto for enklare gjenoppretting.", "admin.identityEmailPlaceholder": "E-postadresse", "admin.identityUnavailable": "Konto-innlogging er ikkje tilgjengeleg akkurat no.", "admin.identityFailed": "Innlogginga kunne ikkje fullførast.", "admin.identityLinkSent": "Sjekk e-posten for innloggingslenka.", "admin.identitySignInFirst": "Logg inn før du knyter turneringa til kontoen.", "admin.identityClaimed": "Turneringa er knytt til kontoen din.", "admin.identityClaimedShort": "Knytt til konto", "admin.identitySignedIn": "Innlogga", "admin.identityToken": "Lokal admin-nøkkel",
  },
  en: {
    "actions.shareTournament": "Share tournament", "actions.enableNotifications": "Enable notifications", "actions.disableNotifications": "Disable notifications", "actions.sendAdminLink": "Send sign-in link", "actions.claimTournament": "Link to my account", "share.shareText": "Join {code}", "share.shared": "Tournament shared", "share.shareFallback": "Link copied", "messages.notificationsDenied": "Notifications are not allowed in this browser", "notifications.enabledTitle": "Padelstar notifications are on", "notifications.enabledBody": "You will receive notifications for this player session on this device.", "notifications.matchReadyTitle": "Your match is ready", "notifications.matchReadyBody": "Your next match is ready.", "notifications.matchPlayingBody": "Your match is now in progress.", "admin.identityTitle": "Admin access", "admin.identityHint": "Link the tournament to an account for easier recovery.", "admin.identityEmailPlaceholder": "Email address", "admin.identityUnavailable": "Account sign-in is not available right now.", "admin.identityFailed": "Sign-in could not be completed.", "admin.identityLinkSent": "Check your email for the sign-in link.", "admin.identitySignInFirst": "Sign in before linking the tournament to your account.", "admin.identityClaimed": "The tournament is linked to your account.", "admin.identityClaimedShort": "Linked to account", "admin.identitySignedIn": "Signed in", "admin.identityToken": "Local admin key",
  },
  es: {
    "actions.shareTournament": "Compartir torneo", "actions.enableNotifications": "Activar notificaciones", "actions.disableNotifications": "Desactivar notificaciones", "actions.sendAdminLink": "Enviar enlace de acceso", "actions.claimTournament": "Vincular a mi cuenta", "share.shareText": "Únete a {code}", "share.shared": "Torneo compartido", "share.shareFallback": "Enlace copiado", "messages.notificationsDenied": "Las notificaciones no están permitidas en este navegador", "notifications.enabledTitle": "Notificaciones de Padelstar activadas", "notifications.enabledBody": "Recibirás notificaciones para esta sesión de jugador en este dispositivo.", "admin.identityTitle": "Acceso de admin", "admin.identityHint": "Vincula el torneo a una cuenta para recuperarlo más fácilmente.", "admin.identityEmailPlaceholder": "Correo electrónico", "admin.identityUnavailable": "El acceso de cuenta no está disponible ahora.", "admin.identityFailed": "No se pudo completar el acceso.", "admin.identityLinkSent": "Revisa tu correo para abrir el enlace de acceso.", "admin.identitySignInFirst": "Inicia sesión antes de vincular el torneo.", "admin.identityClaimed": "El torneo está vinculado a tu cuenta.", "admin.identityClaimedShort": "Vinculado a la cuenta", "admin.identitySignedIn": "Sesión iniciada", "admin.identityToken": "Clave de admin local",
  },
  de: {
    "actions.shareTournament": "Turnier teilen", "actions.enableNotifications": "Benachrichtigungen aktivieren", "actions.disableNotifications": "Benachrichtigungen deaktivieren", "actions.sendAdminLink": "Anmeldelink senden", "actions.claimTournament": "Mit meinem Konto verknüpfen", "share.shareText": "{code} beitreten", "share.shared": "Turnier geteilt", "share.shareFallback": "Link kopiert", "messages.notificationsDenied": "Benachrichtigungen sind in diesem Browser nicht erlaubt", "notifications.enabledTitle": "Padelstar-Benachrichtigungen sind aktiv", "notifications.enabledBody": "Du erhältst Benachrichtigungen für diese Spielersitzung auf diesem Gerät.", "admin.identityTitle": "Admin-Zugriff", "admin.identityHint": "Verknüpfe das Turnier mit einem Konto, um es leichter wiederherzustellen.", "admin.identityEmailPlaceholder": "E-Mail-Adresse", "admin.identityUnavailable": "Die Kontoanmeldung ist derzeit nicht verfügbar.", "admin.identityFailed": "Die Anmeldung konnte nicht abgeschlossen werden.", "admin.identityLinkSent": "Prüfe deine E-Mail für den Anmeldelink.", "admin.identitySignInFirst": "Melde dich an, bevor du das Turnier verknüpfst.", "admin.identityClaimed": "Das Turnier ist mit deinem Konto verknüpft.", "admin.identityClaimedShort": "Mit Konto verknüpft", "admin.identitySignedIn": "Angemeldet", "admin.identityToken": "Lokaler Admin-Schlüssel",
  },
  fr: {
    "actions.shareTournament": "Partager le tournoi", "actions.enableNotifications": "Activer les notifications", "actions.disableNotifications": "Désactiver les notifications", "actions.sendAdminLink": "Envoyer le lien de connexion", "actions.claimTournament": "Lier à mon compte", "share.shareText": "Rejoindre {code}", "share.shared": "Tournoi partagé", "share.shareFallback": "Lien copié", "messages.notificationsDenied": "Les notifications ne sont pas autorisées dans ce navigateur", "notifications.enabledTitle": "Notifications Padelstar activées", "notifications.enabledBody": "Vous recevrez les notifications de cette session joueur sur cet appareil.", "admin.identityTitle": "Accès admin", "admin.identityHint": "Liez le tournoi à un compte pour faciliter sa récupération.", "admin.identityEmailPlaceholder": "Adresse e-mail", "admin.identityUnavailable": "La connexion au compte n’est pas disponible actuellement.", "admin.identityFailed": "La connexion n’a pas pu être terminée.", "admin.identityLinkSent": "Consultez votre e-mail pour le lien de connexion.", "admin.identitySignInFirst": "Connectez-vous avant de lier le tournoi.", "admin.identityClaimed": "Le tournoi est lié à votre compte.", "admin.identityClaimedShort": "Lié au compte", "admin.identitySignedIn": "Connecté", "admin.identityToken": "Clé admin locale",
  },
})) {
  Object.assign(padelstarTranslations[language], values);
}

Object.assign(padelstarTranslations.nb, {
  "setup.defaultTournamentName": "Padelstar-turnering",
  "pwa.iosTitle": "iPhone / iPad", "pwa.iosStep1": "Åpne Padelstar i Safari.", "pwa.iosStep2": "Trykk på Del-knappen.", "pwa.iosStep3": "Velg «Legg til på Hjem-skjerm».", "pwa.iosStep4": "Trykk «Legg til».",
  "pwa.androidTitle": "Android", "pwa.androidStep1": "Åpne Padelstar i Chrome.", "pwa.androidStep2": "Åpne menyen ⋮.", "pwa.androidStep3": "Velg «Installer app» eller «Legg til på startskjermen».", "pwa.androidStep4": "Bekreft installasjonen.",
  "pwa.windowsTitle": "Windows", "pwa.windowsStep1": "Åpne Padelstar i Edge eller Chrome.", "pwa.windowsStep2": "Åpne nettlesermenyen.", "pwa.windowsStep3": "Velg «Installer app» eller tilsvarende.", "pwa.windowsStep4": "Bekreft installasjonen.",
  "pwa.macosTitle": "Mac", "pwa.macosStep1": "Åpne Padelstar i Safari.", "pwa.macosStep2": "Velg Del.", "pwa.macosStep3": "Velg «Legg til i Dock».", "pwa.macosStep4": "Bekreft installasjonen.",
  "pwa.chromeosTitle": "Chromebook", "pwa.chromeosStep1": "Åpne Padelstar i Chrome.", "pwa.chromeosStep2": "Åpne menyen ⋮.", "pwa.chromeosStep3": "Velg «Installer app».", "pwa.chromeosStep4": "Bekreft installasjonen.",
  "pwa.genericTitle": "Installer Padelstar", "pwa.genericStep1": "Åpne nettlesermenyen.", "pwa.genericStep2": "Se etter «Installer app» eller «Legg til på startskjermen».", "pwa.genericStep3": "Bekreft installasjonen.",
  "cup.byeCount": "{count} bye",
  "assistant.title": "Turneringsassistent",
  "admin.americanoFormat": "Americano",
  "admin.teamAmericanoFormat": "Team-Americano",
  "admin.mexicanoFormat": "Mexicano",
  "admin.teamMexicanoFormat": "Team-Mexicano",
  "admin.kingOfCourtFormat": "King of Court",
  "admin.groupsPlayoffsFormat": "Grupper + sluttspill",
});

Object.assign(padelstarTranslations.en, {
  "setup.defaultTournamentName": "Padelstar tournament",
  "pwa.iosTitle": "iPhone / iPad", "pwa.iosStep1": "Open Padelstar in Safari.", "pwa.iosStep2": "Tap the Share button.", "pwa.iosStep3": "Choose “Add to Home Screen”.", "pwa.iosStep4": "Tap “Add”.",
  "pwa.androidTitle": "Android", "pwa.androidStep1": "Open Padelstar in Chrome.", "pwa.androidStep2": "Open the menu ⋮.", "pwa.androidStep3": "Choose “Install app” or “Add to home screen”.", "pwa.androidStep4": "Confirm the installation.",
  "pwa.windowsTitle": "Windows", "pwa.windowsStep1": "Open Padelstar in Edge or Chrome.", "pwa.windowsStep2": "Open the browser menu.", "pwa.windowsStep3": "Choose “Install app” or the equivalent option.", "pwa.windowsStep4": "Confirm the installation.",
  "pwa.macosTitle": "Mac", "pwa.macosStep1": "Open Padelstar in Safari.", "pwa.macosStep2": "Choose Share.", "pwa.macosStep3": "Choose “Add to Dock”.", "pwa.macosStep4": "Confirm the installation.",
  "pwa.chromeosTitle": "Chromebook", "pwa.chromeosStep1": "Open Padelstar in Chrome.", "pwa.chromeosStep2": "Open the menu ⋮.", "pwa.chromeosStep3": "Choose “Install app”.", "pwa.chromeosStep4": "Confirm the installation.",
  "pwa.genericTitle": "Install Padelstar", "pwa.genericStep1": "Open the browser menu.", "pwa.genericStep2": "Look for “Install app” or “Add to home screen”.", "pwa.genericStep3": "Confirm the installation.",
  "cup.byeCount": "{count} bye(s)",
  "assistant.title": "Tournament assistant",
  "admin.americanoFormat": "Americano",
  "admin.teamAmericanoFormat": "Team Americano",
  "admin.mexicanoFormat": "Mexicano",
  "admin.teamMexicanoFormat": "Team Mexicano",
  "admin.kingOfCourtFormat": "King of Court",
  "admin.groupsPlayoffsFormat": "Groups + playoffs",
  "messages.invalidScoreInteger": "Scores must be whole numbers.",
  "messages.invalidScoreNegative": "Scores cannot be negative.",
  "messages.invalidScoreDraw": "Scores cannot be tied.",
  "messages.invalidScoreShape": "A set must be won {gamesToWinSet}-x with a two-game margin, or {tieBreakOne}-{tieBreakTwo} / {tieBreakOne}-{gamesToWinSet}.",
});

const missingTranslationKeys = new Set();

function languageFor(language) {
  const normalized = String(language ?? "").toLowerCase().replace(/_/g, "-");
  return padelstarLanguageMeta.find((entry) => entry.code === normalized)
    ?? padelstarLanguageMeta.find((entry) => normalized.startsWith(`${entry.code}-`))
    ?? padelstarLanguageMeta.find((entry) => entry.code === fallbackLanguage);
}

function fallbackLanguageFor(language) {
  return languageFor(language).fallback ?? fallbackLanguage;
}

function dictionaryFor(language) {
  return padelstarTranslations[fallbackLanguageFor(language)] ?? padelstarTranslations[fallbackLanguage];
}

function lookupValue(dictionary, key) {
  if (!dictionary || !key) return undefined;
  if (Object.prototype.hasOwnProperty.call(dictionary, key)) return dictionary[key];
  return String(key).split(".").reduce((value, part) => {
    if (!value || typeof value !== "object") return undefined;
    return value[part];
  }, dictionary);
}

function interpolate(template, values = {}) {
  return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) return match;
    return values[name] == null ? "" : String(values[name]);
  });
}

window.PadelstarLanguages = padelstarLanguageMeta;
window.PadelstarTranslations = padelstarTranslations;
window.PadelstarI18n = {
  fallbackLanguage,
  supportedLanguages() {
    return padelstarLanguageMeta.map((entry) => ({ ...entry }));
  },
  normalizeLanguage(language) {
    return languageFor(language).code;
  },
  htmlLang(language) {
    return languageFor(language).htmlLang;
  },
  translate(language, key, values = {}) {
    const resolvedLanguage = languageFor(language).code;
    const fallback = fallbackLanguageFor(resolvedLanguage);
    const candidates = [...new Set([resolvedLanguage, fallback, fallbackLanguage])];
    const value = candidates.map((candidate) => lookupValue(padelstarTranslations[candidate], key)).find((entry) => entry != null);
    if (value == null) {
      missingTranslationKeys.add(`${resolvedLanguage}:${key}`);
      return key;
    }
    return interpolate(value, values);
  },
  has(language, key) {
    const resolvedLanguage = languageFor(language).code;
    return [...new Set([resolvedLanguage, fallbackLanguageFor(resolvedLanguage), fallbackLanguage])]
      .some((candidate) => lookupValue(padelstarTranslations[candidate], key) != null);
  },
  missingKeys() {
    return Array.from(missingTranslationKeys);
  },
  clearMissingKeys() {
    missingTranslationKeys.clear();
  },
};
