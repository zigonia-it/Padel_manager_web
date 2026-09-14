# Padelstar – Plan mot v1.0.0

> **Formål:** Kartlegge eksisterende kodebase, identifisere gap mot produktbeslutningene D01–D228 og ferdigstille Padelstar til en stabil v1.0.0.
>
> **Viktig prinsipp:** Eksisterende funksjonalitet skal først kartlegges og verifiseres. Ingen funksjon skal bygges på nytt eller slettes uten at det er nødvendig.
>
> **Designfasit:** Nåværende faktisk implementert UI i kodebasen.
>
> **Turneringsmoduser i v1.0.0:** Round Robin, Cup og Liga.
>
> **Andre allerede implementerte turneringsmoduser:** Skal beholdes i kodebasen, men skjules/release-gates frem til de aktiveres i senere versjoner.
>
> **Versjon 2.0.0:** Venneliste og øvrig sosial funksjonalitet.

---

## Statusmarkører

- [ ] Ikke startet
- [x] Ferdig
- [ ] 🔎 Må kartlegges
- [ ] 🧪 Må testes/verifiseres
- [ ] 🟡 Må justeres
- [ ] ❌ Mangler
- [ ] 🔒 Skal beholdes, men skjules til senere versjon
- [ ] ⏭️ Flyttet til senere versjon

---

# FASE A – Grunnkartlegging av kodebasen

## A1. Repository og struktur

- [ ] Kartlegg hele repository-strukturen.
- [ ] Identifiser hoved-HTML-sider.
- [ ] Identifiser alle JavaScript-moduler.
- [ ] Identifiser CSS-/designfiler.
- [ ] Identifiser Supabase-relaterte filer.
- [ ] Identifiser auth-relaterte filer.
- [ ] Identifiser PWA/service worker/manifest.
- [ ] Identifiser i18n-/språkfiler.
- [ ] Identifiser turneringsmotor og regelmotor.
- [ ] Identifiser scoringmotor.
- [ ] Identifiser TV Mode.
- [ ] Identifiser admin-funksjoner.
- [ ] Identifiser spillerfunksjoner.
- [ ] Identifiser profil/konto/statistikk.
- [ ] Identifiser varslinger.
- [ ] Identifiser eksisterende tester.
- [ ] Identifiser alle aktive dokumenter.
- [ ] Identifiser gamle/arkiverte planer som ikke lenger skal være styrende.

## A2. Faktisk nåværende versjon

- [ ] Finn versjonsnummer brukt i UI.
- [ ] Finn versjonsnummer brukt i kode/config.
- [ ] Finn eventuelle versjonskonflikter i dokumentasjon.
- [ ] Definer én autoritativ versjonskilde.
- [ ] Verifiser at nåværende versjon ikke endres før ferdig verifisert batch.

## A3. Dokumentasjonsautoritet

- [ ] Kartlegg hvilke dokumenter som hevder å være masterplan/source of truth.
- [ ] Marker konflikter mellom eldre planer og D01–D228.
- [ ] Definer `AGENTS.md` som instruksjons- og autoritetsregelverk.
- [ ] Definer produktbeslutningene som høyeste produktfasit.
- [ ] Definer faktisk implementert UI som designfasit.
- [ ] Arkiver gamle designregler som motsier faktisk UI.
- [ ] Arkiver gamle funksjonsplaner som er erstattet.

---

# FASE B – Release scope og feature gating

## B1. v1.0.0 scope

Følgende skal være ferdig, testet og produksjonsklart i v1.0.0:

- [ ] Turneringsmotor – kjerne.
- [ ] Scoring og kampregler.
- [ ] Round Robin.
- [ ] Cup.
- [ ] Liga.
- [ ] Admin – turneringskontroll.
- [ ] Live delt turnering/database.
- [ ] Spillerdeltakelse.
- [ ] Live scoring fra spiller.
- [ ] Resultatgodkjenning.
- [ ] Resultatkorrigering og konsekvensmotor.
- [ ] Spillerbytte/withdrawal.
- [ ] Tidsbegrensede kamper.
- [ ] Generisk kampklokke.
- [ ] Konto og autentisering.
- [ ] Permanent turneringshistorikk.
- [ ] Personlig statistikk.
- [ ] Databevaring og cleanup.
- [ ] Spillerinvitasjon/player claiming uten venneliste.
- [ ] Varslingssystem.
- [ ] TV Mode.
- [ ] PWA/installasjon.
- [ ] Språk/i18n.
- [ ] Hjelp/personvern/informasjon.
- [ ] Systemeier/eierbruker – nødvendig grunnimplementasjon.

## B2. Turneringsmoduser

### Synlige i v1.0.0

- [ ] Round Robin.
- [ ] Cup.
- [ ] Liga.

### Andre eksisterende moduser

- [ ] Kartlegg alle øvrige turneringsmoduser som allerede finnes.
- [ ] Verifiser at de ikke slettes.
- [ ] Verifiser at de ikke brytes av v1.0-endringer.
- [ ] Skjul dem fra vanlig brukergrensesnitt i v1.0.0.
- [ ] Bruk feature-/mode-gating fremfor tilfeldig CSS-skjuling.
- [ ] Behold mulighet for utvikling/testing internt.
- [ ] Dokumenter hvilken senere versjon hver modus kan aktiveres i.
- [ ] Ikke marker en skjult modus som produksjonsklar uten egen test/verifisering.

---

# FASE C – Turneringsmotor

## C1. Opprette turnering

- [ ] Opprette turnering uten konto.
- [ ] Opprette turnering med konto.
- [ ] Korrekt midlertidig eierskap for gjest.
- [ ] Korrekt permanent eierskap for innlogget bruker.
- [ ] Turnerings-ID genereres korrekt.
- [ ] Turneringsdata lagres i Supabase ved multi-device/shared state.
- [ ] Ingen konto nødvendig for grunnleggende bruk.

## C2. Deltakere

- [ ] Legge til spiller manuelt.
- [ ] Redigere spiller.
- [ ] Fjerne spiller før start.
- [ ] Unikt displaynavn per turnering.
- [ ] Samme navn kan brukes i forskjellige turneringer.
- [ ] Gjestespillere støttes.
- [ ] Innloggede spillere støttes.
- [ ] Spiller-ID og slot-ID holdes separat der nødvendig.

## C3. Baner

- [ ] Legge til baner.
- [ ] Endre banenavn.
- [ ] Banenavn vises korrekt på kampkort.
- [ ] Baner brukes korrekt ved kampgenerering.
- [ ] Banetilgjengelighet oppdateres når fysisk kamp avsluttes.

## C4. Generering og progresjon

- [ ] Generere kampoppsett.
- [ ] Starte første runde.
- [ ] Starte senere runder.
- [ ] Korrekt progresjon basert på resultater.
- [ ] Ingen fremtidige kamper genereres på ugyldig resultatgrunnlag.
- [ ] Uavklarte resultater blokkerer kun det som faktisk avhenger av resultatet.
- [ ] Uavhengige kamper kan fortsette.

---

# FASE D – Round Robin

- [ ] Lag består av to spillere.
- [ ] Alle relevante lag møter alle før reshuffle.
- [ ] Senere runder unngår samme partner der mulig.
- [ ] Slot-historikk brukes korrekt.
- [ ] Partnerhistorikk følger slot ved spillerbytte.
- [ ] Motstanderhistorikk følger slot ved spillerbytte.
- [ ] Faktiske personlige stats følger faktisk spiller.
- [ ] Tabellen beregnes korrekt.
- [ ] Ranking beregnes korrekt.
- [ ] Ulike antall kamper etter spillerbytte håndteres.
- [ ] Reset/restartet kamp teller ikke som fullført møte før gyldig fullføring.

---

# FASE E – Cup

- [ ] Bracket genereres korrekt.
- [ ] Vinner avanserer korrekt.
- [ ] Tapende lag elimineres korrekt.
- [ ] Finale håndteres korrekt.
- [ ] Resultatkorrigering kan påvirke bracket.
- [ ] Konsekvensanalyse viser hvem som påvirkes.
- [ ] Fremtidige uspilt kamper kan recalculeres etter adminvalg.
- [ ] Allerede spilte senere kamper endres ikke automatisk.
- [ ] Admin kan beholde eksisterende path.
- [ ] Admin kan velge ny path.
- [ ] Admin kan ved behov annullere/replay berørte cupkamper.
- [ ] Annullert kamp beholdes historisk.
- [ ] Annullert kamp mister turneringseffekt.
- [ ] Faktiske personlige stats beholdes etter reglene i D58–D59.

---

# FASE F – Liga

- [ ] Liga kan opprettes.
- [ ] Ligaoppsett genereres korrekt.
- [ ] Kampresultater påvirker tabell korrekt.
- [ ] Rankingregler fungerer.
- [ ] Resultatkorrigering recalculerer tabell.
- [ ] Ferdig liga får korrekt sluttstilling.
- [ ] Liga fungerer med gjesteturnering.
- [ ] Liga fungerer med kontoeid turnering.

---

# FASE G – Scoringmotor

## G1. Generisk poengmotor

- [ ] Minimum antall poeng støttes.
- [ ] Krav til vinnermargin støttes.
- [ ] Klassisk padel/tennis 0/15/30/40 fungerer.
- [ ] Numeric scoring fungerer der det brukes.
- [ ] Deuce/Advantage fungerer.
- [ ] Golden Point/No-ad fungerer.
- [ ] Tiebreak fungerer.
- [ ] Tiebreak krever riktig margin.
- [ ] Regelprofil snapshots per kamp.

## G2. Kampregler

- [ ] Regler kan settes før turneringsstart.
- [ ] Irrelevante regler skjules i UI.
- [ ] Regler låses når første kamp starter.
- [ ] Låste regler vises som read-only oversikt.
- [ ] Kampregler kan åpnes av admin.
- [ ] Kampregler kan åpnes av kampens spillere.
- [ ] Regler kan sees før, under og etter kamp.

---

# FASE H – Live scoring

## H1. Aktiv scorer

- [ ] Én aktiv scorer om gangen.
- [ ] Aktiv scorer vises til andre.
- [ ] Andre deltakere ser live score.
- [ ] Scorer kan overføre scorerrolle.
- [ ] Andre spillere kan be om scorerrolle.
- [ ] Admin kan overstyre scorerrolle.
- [ ] Server avgjør samtidig takeover.

## H2. Offline scorer

- [ ] Offline status detekteres korrekt.
- [ ] Etter 2 minutter kan annen deltaker ta over.
- [ ] Første gyldige server-request vinner.
- [ ] Gammel scorer får ikke rollen tilbake automatisk.
- [ ] Byttet logges.

## H3. Undo/Redo

- [ ] Undo av siste poeng.
- [ ] Undo kan reversere game.
- [ ] Undo kan reversere set.
- [ ] Undo kan gå tilbake til kampstart.
- [ ] Reverserte events beholdes i eventhistorikk.
- [ ] Redo fungerer.
- [ ] Ny scoring etter Undo bryter redo-grenen.
- [ ] Undo/Redo avsluttes når resultat sendes til godkjenning.

---

# FASE I – Resultatgodkjenning

- [ ] Scorer må eksplisitt sende sluttresultat til godkjenning.
- [ ] Endelig resultatsammendrag vises før sending.
- [ ] Submitter teller som godkjent for eget lag.
- [ ] Minst én spiller per lag må godkjenne.
- [ ] Admin-opprettede spillere uten egen device auto-godkjennes.
- [ ] Feil resultat kan markeres.
- [ ] Korrigert forslag nullstiller tidligere godkjenninger.
- [ ] Maks to spillerkorrigeringer før admin må involveres.
- [ ] 10-minuttersregel fungerer.
- [ ] Admin varsles etter 10 min.
- [ ] 30-minutters auto-godkjenning fungerer.
- [ ] Auto-godkjenning stoppes ved dispute/feilmarkering.
- [ ] Timer restartes ved korrigert forslag.
- [ ] Fysisk bane frigis selv om resultat venter på godkjenning.

---

# FASE J – Resultatkorrigering og konsekvensmotor

- [ ] Kun admin kan endre finalisert resultat.
- [ ] Nytt resultat registreres uten å overskrive historikken.
- [ ] Gammelt resultat beholdes som audit event.
- [ ] Nytt resultat blir autoritativt.
- [ ] Personlig statistikk recalculeres.
- [ ] Games/sets recalculeres.
- [ ] Ranking/tabell recalculeres.
- [ ] Turneringspoeng recalculeres.
- [ ] Qualification/placement recalculeres.
- [ ] Systemet simulerer konsekvens før commit.
- [ ] Ingen data endres under simulering.
- [ ] Konsekvensnivå vises med tekst og farge.
- [ ] Green/Yellow/Orange/Red benyttes med tilgjengelig tekst.
- [ ] Admin får konkrete konsekvenser.
- [ ] Admin kan avbryte før final confirmation.
- [ ] Commit skjer atomisk.
- [ ] Full rollback ved feil.
- [ ] Varsler sendes først etter vellykket commit.
- [ ] Ongoing kamper stoppes ikke automatisk.
- [ ] Actual teams i pågående kamp beholdes.
- [ ] Pending consequence vises tydelig.
- [ ] Reason er obligatorisk.
- [ ] `Annet` krever kommentar.
- [ ] Standard reasons implementert.
- [ ] Flere korrigeringer støttes.
- [ ] Gjenoppretting av gammelt resultat opprettes som ny korrigering.

---

# FASE K – Spillerbytte og withdrawal

- [ ] Admin kan erstatte spiller.
- [ ] Ferdige kamper beholder faktisk opprinnelig spiller.
- [ ] Replacement gjelder fra byttetidspunkt.
- [ ] Personlige stats følger faktisk person.
- [ ] Replacement starter egne personlige stats fra 0.
- [ ] Structural slot beholdes.
- [ ] Partner-/opponent-historikk følger structural slot.
- [ ] Original spiller kan settes tilbake.
- [ ] Samme fysiske person kan ikke fylle flere aktive slots samtidig.
- [ ] Fremtidig schedule følger slot.
- [ ] Historikk viser faktisk spiller per kamp.
- [ ] Replacement events lagres.
- [ ] Aktiv kamp restartes ved replacement.
- [ ] Pågående score annulleres ved restart.
- [ ] Restart starter 0–0.
- [ ] Restart vises med advarsel og bekreftelse.
- [ ] Awaiting-confirmation blokkerer replacement.
- [ ] Disputed result blokkerer replacement.
- [ ] Selv admin kan ikke bypass uten først å løse/annullere resultatet.

---

# FASE L – Tidsbegrensede kamper og klokke

## L1. Timed match

- [ ] Normal kamp uten tidsbegrensning.
- [ ] Kamp med X minutter.
- [ ] Timer starter ved faktisk kampstart.
- [ ] Timer vises korrekt.
- [ ] 1 minutt igjen markeres visuelt.
- [ ] 00:00 markeres tydelig.
- [ ] Timer går aldri negativt.
- [ ] Pågående game fullføres etter 00:00.
- [ ] `Tid utløpt` brukes som sluttårsak.

## L2. Tie etter tid

- [ ] Uavgjort tillatt der mode støtter det.
- [ ] Deciding game støttes.
- [ ] Deciding tiebreak støttes.
- [ ] Kun relevante valg vises.

## L3. Cup-rundetid

- [ ] Default kampvarighet.
- [ ] Per-round override.
- [ ] En runde kan settes uten tidsgrense.
- [ ] Kun eksisterende runder vises.
- [ ] Rundevarighet låses ved første kampstart.

## L4. Generisk clock engine

- [ ] Authoritative start timestamp.
- [ ] Client derivation.
- [ ] Refresh håndteres.
- [ ] Offline håndteres.
- [ ] Scorerbytte håndteres.
- [ ] Resync fungerer.
- [ ] Countdown støttes.
- [ ] Count-up støttes.
- [ ] Pause-data støttes arkitektonisk.
- [ ] Perioder/halves/quarters støttes arkitektonisk.
- [ ] Per-period duration støttes.
- [ ] Added time/overtime støttes arkitektonisk.
- [ ] Padelstar viser kun relevante funksjoner.

---

# FASE M – Konto og autentisering

- [ ] Opprett konto.
- [ ] Logg inn.
- [ ] Logg ut.
- [ ] Innloggingsfeil gir tydelig feedback.
- [ ] Opprett konto og Logg inn er separate flows.
- [ ] Profilside viser korrekt auth-status.
- [ ] Login-knapp fra profil fungerer.
- [ ] Permanent bruker-ID.
- [ ] Konto kreves ikke for turneringsdeltakelse.
- [ ] Konto kreves ikke for å opprette midlertidig turnering.
- [ ] Konto kobles til permanent historikk.
- [ ] Konto kobles til personlig statistikk.
- [ ] Konto kan slettes.
- [ ] 30 dagers slettingsperiode implementeres.
- [ ] Personlig aggregate stats slettes med konto.
- [ ] Historiske resultater kan beholde unlinket displaynavn/resultat.

---

# FASE N – Systemeier / eierbruker

## N1. Minimum for tidlig v1.x

- [ ] Én beskyttet Systemeier finnes.
- [ ] Systemeier er separat fra vanlig bruker.
- [ ] Nøyaktig én aktiv systemeier.
- [ ] Systemeier har alle systemrettigheter.
- [ ] Systemeiers rettigheter kan ikke fjernes.
- [ ] Ingen vanlig superbruker kan endre/fjerne systemeier.
- [ ] Systemeier-informasjon lagres server-side.
- [ ] Frontend alene kan ikke gi systemtilgang.

## N2. Videre systemadmin

- [ ] Systemadmin-side eksisterer eller planlegges.
- [ ] Ikke-autorisert bruker redirectes Home.
- [ ] Toast vises ved manglende tilgang.
- [ ] Admin-data lastes ikke før authorization.
- [ ] Systemadministrasjon skjules uten permissions.
- [ ] Modulvisning styres av permissions.

## N3. Senere permission-system

- [ ] Granulære permissions.
- [ ] Permission sets.
- [ ] Delegation scope.
- [ ] Superuser invitation.
- [ ] MFA for superuser.
- [ ] Step-up auth.
- [ ] Owner recovery codes.
- [ ] Ownership transfer.
- [ ] Full permanent security audit log flyttes eksplisitt post-1.0.

---

# FASE O – Permanent historikk og personlig statistikk

## O1. Turneringseier

- [ ] Kontoeid fullført turnering beholdes permanent.
- [ ] Live/temporary technical data ryddes.
- [ ] Eier kan se turneringshistorikk.
- [ ] Eier kan slette turnering fra egen historikk.
- [ ] Sletting av eierhistorikk sletter ikke andre spilleres permanente stats.

## O2. Spillere

- [ ] Personlige stats lagres på korrekt konto.
- [ ] W/L følger faktisk spilt kamp.
- [ ] Korrigert faktisk resultat oppdaterer personlige stats.
- [ ] Tournament-effect og personal match stats separeres.
- [ ] Annulled tournament-effect fjerner ikke automatisk faktisk personlig matchstatistikk.
- [ ] Gjestespiller får ikke permanent historikk.
- [ ] Ingen retroaktiv claiming av gamle guest stats i v1.

---

# FASE P – Databevaring og cleanup

## P1. Guest tournament etter avslutning

- [ ] Avsluttet/avbrutt guest-owned turnering beholdes 24 timer.
- [ ] Permanente stats lagres først.
- [ ] Cleanup utsettes dersom stats transfer feiler.
- [ ] Turneringen er read-only i 24 timer.
- [ ] Final standings kan vises.
- [ ] Kamper kan vises.
- [ ] Stats kan vises.
- [ ] Ingen nye resultater kan registreres.
- [ ] Data slettes etter 24 timer.

## P2. Inaktive guest tournaments

- [ ] 30 dager uten reell aktivitet → `expired`.
- [ ] Reell aktivitet inkluderer kampstart.
- [ ] Reell aktivitet inkluderer kampslutt.
- [ ] Reell aktivitet inkluderer setup-endring.
- [ ] Refresh/view/TV resetter ikke inactivity.
- [ ] `expired` varer i 7 dager.
- [ ] Admin kan reaktivere.
- [ ] Reactivation gjenoppretter full state.
- [ ] 30-dagers timer resettes.
- [ ] Etter 7 dager slettes permanent.

---

# FASE Q – Player claiming og invitasjoner i v1

## Q1. Claim eksisterende spiller

- [ ] Innlogget spiller kan finne turneringen.
- [ ] Spilleren kan finne egen pre-added slot.
- [ ] Slot kan bare linkes dersom ikke allerede linket.
- [ ] Linking krever eksplisitt brukerhandling.
- [ ] Permanent stats følger linket konto.
- [ ] Player permissions følger linket konto.

## Q2. Invitasjoner uten venneliste

- [ ] Invitasjon kan sendes til identifisert bruker uten friend-system.
- [ ] Invitasjon opptar ikke player slot før aksept.
- [ ] Aksept oppretter/linker participant.
- [ ] Avslag oppretter ingen participant.
- [ ] Pending invitations teller ikke mot minimum participant count.
- [ ] Invitasjonen gjelder frem til første runde starter.
- [ ] Pending invitations kasseres ved first-round start.
- [ ] Aksept før start kan trigge consequence warning.
- [ ] Admin godkjenner nødvendig regeneration/setup-endring.
- [ ] Akseptert, men ikke innarbeidet spiller kasseres ved cutoff.
- [ ] Etter cutoff brukes replacement-flow.

## Q3. Guest sessions

- [ ] Guest får temporary session ID.
- [ ] Session binder device til player slot.
- [ ] Session gir riktige scoring rights.
- [ ] Session kan lagres lokalt for refresh/restart.
- [ ] Session er ikke permanent identitet.
- [ ] Session kan ikke konverteres til konto.
- [ ] Usikker name-only device takeover implementeres ikke.
- [ ] Secure takeover via code/QR/admin confirmation flyttes til senere versjon.

---

# FASE R – Varslingssystem

## R1. Grunnmodell

- [ ] In-app varsler.
- [ ] Push/PWA varsler.
- [ ] Nødvendige turneringsvarsler.
- [ ] Valgfrie varsler.
- [ ] Bare valgfrie varsler kan deaktiveres i appen.
- [ ] OS/device kan fortsatt blokkere push/sound.

## R2. Varslingssenter

- [ ] Varslingssenter implementert.
- [ ] Lest-status per varsel.
- [ ] Ulest-status per varsel.
- [ ] Å åpne senter markerer ikke alt lest.
- [ ] Et varsel markeres først lest når det åpnes.
- [ ] Ulest-teller oppdateres korrekt.

## R3. Retention

- [ ] Turneringsvarsler fjernes når turneringen er ferdig.
- [ ] Eventuelt sluttresultat kan beholdes.
- [ ] Andre varsler beholdes ulest til brukeren har sett dem.
- [ ] Relevante håndterte varsler kan ryddes etter definert policy.

## R4. Lyd

- [ ] Første versjon bruker systemlyder.
- [ ] Appen respekterer silent/system volume.
- [ ] Egne Padelstar-lyder flyttes til senere versjon.
- [ ] Arkitekturen bør ikke blokkere fremtidige egne lyder.

---

# FASE S – TV Mode

- [ ] TV Mode erstatter spectator view.
- [ ] Kan åpnes uten konto.
- [ ] Egen read-only lenke eller QR.
- [ ] Ingen admin permissions.
- [ ] Ingen player permissions.
- [ ] Live score vises.
- [ ] Game/set/status vises.
- [ ] Official result vises.
- [ ] Personlig/private data vises ikke.
- [ ] Etter siste kamp vises sluttresultat/sluttstilling.
- [ ] Ved annen gyldig avslutning vises tilgjengelig sluttresultat.
- [ ] Ved reset/nullstilling vises at turneringen er avsluttet/nullstilt.
- [ ] TV Mode følger turneringens retention.
- [ ] Fra 1:00 igjen vises tydelig time warning.
- [ ] Ingen TV-sound/vibration på timer.

---

# FASE T – PWA og installasjon

- [ ] Manifest fungerer.
- [ ] Service worker fungerer.
- [ ] App kan installeres på støttede desktop-plattformer.
- [ ] App kan installeres på støttede mobile plattformer.
- [ ] Standalone detection fungerer.
- [ ] Install-knapp skjules når app allerede kjører standalone.
- [ ] Install-knapp vises bare når relevant.
- [ ] iOS/PWA-spesifikke begrensninger håndteres.
- [ ] Desktop-guide er korrekt.
- [ ] Mobil-guide er korrekt.
- [ ] Oppdatering av PWA cache/version testes.

---

# FASE U – Språk / i18n

- [ ] Norsk hovedspråk.
- [ ] Engelsk komplett.
- [ ] Device language brukes som standard.
- [ ] Manuell override.
- [ ] Manuelt språkvalg lagres.
- [ ] Manuelt valg overstyrer device language.
- [ ] `Følg enhetens språk` finnes.
- [ ] Manglende oversettelser identifiseres.
- [ ] Ingen hardkodet synlig tekst der i18n skal brukes.
- [ ] Admin oversettes.
- [ ] Player UI oversettes.
- [ ] TV Mode oversettes.
- [ ] Varsler oversettes.
- [ ] Hjelp/personvern oversettes.
- [ ] Arkitekturen tillater flere språk senere.

---

# FASE V – Hjelp, personvern og informasjon

- [ ] Bruksanvisning er oppdatert.
- [ ] Personvernside er oppdatert.
- [ ] Dataflyt beskrives korrekt.
- [ ] Guest data beskrives korrekt.
- [ ] Account data beskrives korrekt.
- [ ] Retention beskrives korrekt.
- [ ] Account deletion beskrives korrekt.
- [ ] Permanent stats beskrives korrekt.
- [ ] Push/notifications beskrives korrekt der nødvendig.
- [ ] Back/navigation følger faktisk UI-design.
- [ ] Sider følger eksisterende implementert designsystem.
- [ ] Gamle privacy-tekster som motsier faktisk dataflyt fjernes.

---

# FASE W – Resultatfeil og rapportering

> Kan implementeres før eller etter v1.0 avhengig av faktisk kode-status, men eksisterende implementasjon skal kartlegges.

- [ ] `Rapporter feil resultat`.
- [ ] Bare kampdeltakere kan rapportere relevant kamp.
- [ ] Spiller kan foreslå korrekt resultat.
- [ ] Reason.
- [ ] Optional comment.
- [ ] `Annet` krever comment.
- [ ] Flere rapporter grupperes.
- [ ] Admin ser reporters.
- [ ] Admin ser proposals.
- [ ] Ingen majority auto-rule.
- [ ] Admin: Korrigert.
- [ ] Admin: Avvist.
- [ ] Admin: Ingen endring nødvendig.
- [ ] Reporters varsles.
- [ ] Operational case data ryddes ved tournament end.

---

# FASE X – UI/UX-verifisering

> Nåværende faktiske UI er fasit.

- [ ] Kartlegg eksisterende design tokens.
- [ ] Kartlegg typografi.
- [ ] Kartlegg spacing.
- [ ] Kartlegg cards.
- [ ] Kartlegg buttons.
- [ ] Kartlegg modals.
- [ ] Kartlegg toasts.
- [ ] Kartlegg navigation.
- [ ] Kartlegg mobile breakpoints.
- [ ] Kartlegg desktop behavior.
- [ ] Nye funksjoner bruker eksisterende komponentmønstre.
- [ ] Ingen gamle mockups får overstyre faktisk UI.
- [ ] Irrelevante settings skjules dynamisk.
- [ ] Read-only state ser read-only ut, ikke disabled setup form.
- [ ] Admin får ikke unødvendig kompleks navigasjon.
- [ ] Home + aktiv funksjon + språk følger ønsket enkelhet der relevant.
- [ ] Accessibility: farge brukes aldri alene som betydning.
- [ ] Touch targets verifiseres.
- [ ] Keyboard navigation verifiseres der relevant.
- [ ] Responsive layout verifiseres.

---

# FASE Y – Database og sikkerhet

## Y1. Supabase

- [ ] Database brukes for shared active state.
- [ ] Guest turneringer støttes.
- [ ] Account-owned tournaments støttes.
- [ ] RLS gjennomgås.
- [ ] Sensitive operasjoner beskyttes server-side.
- [ ] Client kan ikke gi seg selv adminrettigheter.
- [ ] Client kan ikke gi seg selv ownerrettigheter.
- [ ] Player kan bare score egen aktive kamp.
- [ ] TV Mode har read-only data access.
- [ ] Guest session rights valideres.
- [ ] Race conditions ved scoring undersøkes.
- [ ] Race conditions ved scorer takeover undersøkes.
- [ ] Race conditions ved final result undersøkes.
- [ ] Atomic correction implementeres server/database-side der nødvendig.

## Y2. Data-integritet

- [ ] IDs brukes fremfor displaynavn for relasjoner.
- [ ] Account ID separert fra tournament player slot.
- [ ] Tournament ID konsekvent.
- [ ] Match ID konsekvent.
- [ ] Court ID konsekvent.
- [ ] Correction history immutable nok til formålet.
- [ ] Derived stats kan regenereres fra autoritative resultater.
- [ ] Cleanup sletter ikke data som fortsatt trengs.

---

# FASE Z – Testing og verifisering

## Z1. Enhetstester / logikktester

- [ ] Round Robin generation.
- [ ] Cup generation.
- [ ] Liga calculation.
- [ ] Ranking.
- [ ] Scoring.
- [ ] Deuce.
- [ ] No-ad.
- [ ] Tiebreak.
- [ ] Timed match.
- [ ] Result confirmation.
- [ ] Correction consequence.
- [ ] Replacement.
- [ ] Personal stats.
- [ ] Retention calculations.
- [ ] Language fallback.

## Z2. Integrasjonstester

- [ ] Admin + spiller på separate devices.
- [ ] To spillere samme kamp.
- [ ] Aktiv scorer + viewer.
- [ ] Scorer handover.
- [ ] Offline scorer.
- [ ] Supabase realtime.
- [ ] Result confirmation multi-device.
- [ ] Admin correction multi-device.
- [ ] Notification delivery.
- [ ] TV Mode realtime.
- [ ] Guest tournament lifecycle.
- [ ] Account tournament lifecycle.

## Z3. Manuell UI-testing

- [ ] Desktop Chrome.
- [ ] Desktop Safari.
- [ ] Relevant Chromium browser.
- [ ] iPhone/Safari/PWA.
- [ ] Android/Chrome/PWA hvis tilgjengelig.
- [ ] Tablet layout.
- [ ] TV/16:9 layout.
- [ ] Small-screen layout.
- [ ] Large-screen layout.

## Z4. Feiltilstander

- [ ] Nettverk faller ut under scoring.
- [ ] Nettverk kommer tilbake.
- [ ] Refresh midt i kamp.
- [ ] Refresh under confirmation.
- [ ] Duplicate submit.
- [ ] To samtidige scorer requests.
- [ ] Admin endrer resultat mens klient har gammel state.
- [ ] Session utløper.
- [ ] Auth utløper.
- [ ] Push permission denied.
- [ ] Database write feiler.
- [ ] Cleanup job feiler.
- [ ] Stats transfer feiler.
- [ ] Appen viser tydelig feil uten datatap der mulig.

---

# FASE AA – Release-gating og senere versjoner

## AA1. v1.1.x og øvrige 1.x

- [ ] Regelmaler.
- [ ] Tidsmaler.
- [ ] Turneringsmaler.
- [ ] Banemaler.
- [ ] Deltakermaler.
- [ ] Offisielle standardmaler.
- [ ] `Bruk sist oppsett`.
- [ ] Favorites.
- [ ] Archive/restore templates.
- [ ] Flere turneringsmoduser aktiveres gradvis.
- [ ] Mer komplett superuser/permission system.
- [ ] Template sharing vurderes.
- [ ] Egne Padelstar-varslingslyder vurderes.

## AA2. v2.0.0 – sosial Padelstar

- [ ] Venneforespørsler.
- [ ] Mutual friends.
- [ ] Privat venneliste.
- [ ] Inviter venn direkte til turnering.
- [ ] Friend status mellom relevante brukere.
- [ ] Eventuell videre sosial profil.
- [ ] Eventuell avatar.
- [ ] Eventuell deling av offentlig statistikk.
- [ ] Eventuell social activity/history etter ny produktbeslutning.

## AA3. Post-1.0 / senere

- [ ] Secure guest session transfer via engangskode/QR/admin.
- [ ] Public/unlisted user templates.
- [ ] Offentlig malbibliotek.
- [ ] Permanent tamper-protected security audit log.
- [ ] Utvidet multi-sport engine som eget produktområde.
- [ ] Flere språk.
- [ ] Flere turneringsmoduser.
- [ ] Avanserte notification sounds.
- [ ] Eventuell retroaktiv guest-stat claiming kun etter ny beslutning.

---

# FASE AB – Dokumentasjonskonsolidering

## AB1. Ny autoritativ struktur

- [ ] `AGENTS.md`
- [ ] `docs/PROJECT.md`
- [ ] `docs/ROADMAP.md`
- [ ] `docs/BUGS.md`
- [ ] `docs/CHANGELOG.md`
- [ ] `docs/technical/app-flow.md`
- [ ] `docs/technical/architecture.md`
- [ ] `docs/technical/database.md`
- [ ] `docs/technical/tournament-logic.md`
- [ ] `docs/technical/privacy-retention.md`
- [ ] `docs/technical/operations.md`
- [ ] `docs/archive/README.md`
- [ ] `docs/archive/plans/`
- [ ] `docs/archive/development-history/`
- [ ] `docs/archive/qa/`

## AB2. Autoritetsrekkefølge

- [ ] 1. Eksplisitt aktuell developer instruction.
- [ ] 2. `PROJECT.md`.
- [ ] 3. `BUGS.md`.
- [ ] 4. `ROADMAP.md`.
- [ ] 5. Tekniske dokumenter.
- [ ] 6. Nåværende kode.
- [ ] 7. Arkiv.
- [ ] Produktbeslutninger D01–D228 innarbeides i relevant autoritativ dokumentasjon.
- [ ] Arkivdokumenter kan aldri brukes som aktive implementasjonsinstruksjoner.
- [ ] Konflikt mellom produktregel og kode skal rapporteres, ikke silently redefineres.

---

# FASE AC – Sluttkontroll før v1.0.0

## AC1. Funksjonell godkjenning

- [ ] Alle v1.0-funksjoner klassifisert.
- [ ] Alle v1.0-gaps lukket.
- [ ] Alle kritiske bugs lukket.
- [ ] Alle high priority bugs lukket eller eksplisitt godkjent.
- [ ] Round Robin fullverifisert.
- [ ] Cup fullverifisert.
- [ ] Liga fullverifisert.
- [ ] Andre modes skjult uten å være slettet.
- [ ] Guest flow fullverifisert.
- [ ] Account flow fullverifisert.
- [ ] Player scoring fullverifisert.
- [ ] Admin flow fullverifisert.
- [ ] TV Mode fullverifisert.
- [ ] Notifications fullverifisert.
- [ ] PWA fullverifisert.
- [ ] i18n fullverifisert.
- [ ] Privacy/retention fullverifisert.

## AC2. Data og sikkerhet

- [ ] Supabase RLS verifisert.
- [ ] Owner access verifisert.
- [ ] Admin access verifisert.
- [ ] Player access verifisert.
- [ ] Guest access verifisert.
- [ ] TV read-only verifisert.
- [ ] Cleanup verifisert.
- [ ] Account deletion verifisert.
- [ ] Ingen åpenbare PII-lekkasjer.

## AC3. Release

- [ ] Dokumentasjon oppdatert.
- [ ] Changelog oppdatert.
- [ ] Bugs-dokument oppdatert.
- [ ] Roadmap oppdatert.
- [ ] Alle release-gated features kontrollert.
- [ ] Ingen skjulte later-features utilsiktet eksponert.
- [ ] Produksjonsbuild testet.
- [ ] PWA cache/version testet.
- [ ] Footer/version kontrollert.
- [ ] Developer godkjenner versjonsendring.
- [ ] Versjon settes til `1.0.0`.
- [ ] Release tag opprettes.
- [ ] Deployment gjennomføres.
- [ ] Produksjonsdeployment smoke-testes.
- [ ] v1.0.0 markeres ferdig.

---

# Arbeidsmetode for hver fase

For **hver fase** skal følgende prosess brukes:

- [ ] 1. Inspiser eksisterende kode før endring.
- [ ] 2. Dokumenter hva som allerede finnes.
- [ ] 3. Sammenlign mot relevante D01–D228-beslutninger.
- [ ] 4. Klassifiser hvert punkt:
  - [ ] ✅ Ferdig og korrekt.
  - [ ] 🟡 Finnes, men må justeres.
  - [ ] 🧪 Finnes, men må verifiseres.
  - [ ] ❌ Mangler.
  - [ ] 🔒 Finnes, men skal skjules/release-gates.
  - [ ] ⏭️ Senere versjon.
- [ ] 5. Lag konkret endringsliste.
- [ ] 6. Implementer bare nødvendige endringer.
- [ ] 7. Test lokalt.
- [ ] 8. Test relevante integrasjoner.
- [ ] 9. Test UI.
- [ ] 10. Test regression.
- [ ] 11. Oppdater dokumentasjon.
- [ ] 12. Marker fase ferdig først etter faktisk verifisering.
- [ ] 13. Gå deretter videre til neste fase.

---

# Definition of Done – v1.0.0

Padelstar kan kalles **v1.0.0** først når:

- [ ] Round Robin, Cup og Liga er produksjonsklare.
- [ ] Alle andre turneringsmoduser er korrekt release-gated.
- [ ] Multi-device fungerer stabilt.
- [ ] Guest flow fungerer uten konto.
- [ ] Account flow fungerer.
- [ ] Permanent historikk og statistikk fungerer.
- [ ] Scoring fungerer.
- [ ] Result confirmation fungerer.
- [ ] Admin correction fungerer.
- [ ] Timed matches fungerer.
- [ ] Replacement/withdrawal fungerer.
- [ ] Retention/cleanup fungerer.
- [ ] Player claiming/invitations fungerer uten venneliste.
- [ ] Notification system fungerer.
- [ ] TV Mode fungerer.
- [ ] PWA fungerer.
- [ ] Norsk og engelsk fungerer.
- [ ] Help/privacy samsvarer med faktisk system.
- [ ] Systemeier/eierbruker er sikkert etablert.
- [ ] Kritiske sikkerhetsregler håndheves backend/server-side.
- [ ] Ingen kjente kritiske dataintegritetsfeil gjenstår.
- [ ] Hele v1.0-scope er regresjonstestet.
- [ ] Dokumentasjonen samsvarer med faktisk kode.
- [ ] Developer har godkjent release og versjonsendring.

