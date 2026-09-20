# Padelstar - Personvern og dataretensjon

Sist oppdatert: 2026-09-19 (versjon 0.7.0 + gren `v0.8`)

Status: beta. Dette dokumentet beskriver hva som faktisk skjer i koden og databasen. Personverntekstene i appen (`privacy.html`, `app/privacy-i18n.js`) skal si det samme.

## Formål

Padelstar lagrer minst mulig persondata og bruker det bare til å administrere og følge en konkret padelturnering.

## Data som behandles

- Turneringsnavn, invitasjonskode, status, regler, baner og kampoppsett.
- Spillernavn, avatar og farge, rolle/identitet og om spilleren er aktiv, har trukket seg eller er erstattet.
- Kampresultater, walkover, resultatgodkjenning, korrigeringshistorikk og tekniske revisjoner.
- Admin-token og spillertoken (lagres kun som SHA-256-hash i databasen). Admin-token inngår aldri i delt state eller backup.
- Konto (Supabase Auth): e-postadresse, teknisk bruker-ID og passordstatus. Selve passordet lagres ikke av Padelstar.
- Privat profil: visningsnavn, avatar, farge, foretrukket språk og tidsstempler. Profilhistorikk: turneringsnavn, dato, plassering, poeng, kamper, seire, sett og games.
- Varslingsabonnement (push) og lokale innstillinger i nettleseren (localStorage, IndexedDB, sync-kø, siste-kjente-gode kopi).
- Tilbakemeldinger sendt fra appen: tekst, valgfri e-post og tekniske opplysninger, sendt som e-post via Vercel og Resend. Meldingen lagres ikke i appen.
- Vercel Analytics for aggregert trafikkmåling.
- Systemlogg (`system_log`, kun for systemeieren): nye kontoer, turneringer opprettet/avsluttet/slettet og eierens egne handlinger (blokkering, sletting). Bare id-er og grove fakta, aldri navn, e-postadresser eller turneringsinnhold. Oppbevares i **90 dager** (jobben `padelstar-log-cleanup`).
- Invitasjoner: e-postadressen til den inviterte lagres i `tournament_invitations` til turneringen slettes, og sendes gjennom Resend. Robotkontrollen (Cloudflare Turnstile) ser IP-adresse og nettleser ved registrering og innlogging.
- Kontoer der e-postadressen ikke er bekreftet innen 7 dager slettes automatisk (`cleanup_unverified_users()`, jobben `padelstar-unverified-users`, daglig 03:20). Kontoer som fantes 2026-09-20 slettes tidligst 2026-09-28. Systemeieren og kontoer som eier en turnering slettes aldri. Sletting av en konto fjerner profilrad, statistikk og turneringskoblinger (turneringer den eide blir stående uten eier og følger gjestelivssyklusen).
- Tredjeparter som er nevnt i personvernsiden: Supabase (EU, Irland), Vercel, Resend, jsDelivr, flagcdn.com, Cloudflare Turnstile og quickchart.io (påmeldingslenken sendes dit for å tegne QR-koden).

## Retensjon (gjeldende oppførsel)

- **Midlertidige live-turneringer uten profilert oppretter (gjest):** når turneringen avsluttes eller avbrytes beholdes den skrivebeskyttet i **24 timer** (slik at resultatet kan vises på TV-modus og andre enheter), og slettes deretter av `cleanup_expired_tournaments()`. Statistikk for registrerte spillere og kvitteringen for avslutningen skrives før noe slettes.
- **Turneringer uten aktivitet:** utløper etter **30 dager** og slettes permanent etter ytterligere **7 dager** hvis admin ikke gjenopptar dem.
- **Turneringer med profilert oppretter:** kan beholdes. Statistikk lagres individuelt bare for spillere med profil; gjestespillere får ikke permanent historikk, og gjestens identitet fjernes fra lagret turneringsstate ved avslutning.
- **Spillerøkter/token-hasher:** slettes sammen med turneringen.
- **Rate-limit-rader:** slettes når de ikke er oppdatert på 24 timer.
- **Lokale data:** beholdes på brukerens enhet til turneringen nullstilles eller nettleserdata tømmes.
- **Backup-filer:** styres av den som laster dem ned.
- **Registrerte brukerprofiler og profilhistorikk:** slettes ikke på grunn av alder. Når brukeren ber om sletting, merkes profilen og fjernes **30 dager** etter forespørselen (`cleanup_expired_player_profiles()`). Profilen og historikken til andre spillere påvirkes ikke når en eier sletter sin egen turneringshistorikk.
- **Vercel Analytics:** aggregert trafikkmåling, ingen turneringsdata eller tokens.

Opprydding kjøres av `pg_cron`-jobben `padelstar-retention-cleanup` (hver time), aldri fra klienten. Resultatgodkjenning eskaleres/auto-godkjennes av jobben `padelstar-result-approvals` (hvert minutt).

## Sletteprosedyre

1. Bekreft turneringens invitasjonskode eller id.
2. Kontroller at slettingen gjelder riktig turnering.
3. Slett via godkjent RPC/adminflyt eller dokumentert Supabase-operasjon.
4. Bekreft at spillerøkter og rate-limit-data for turneringen er borte.
5. Be brukeren nullstille lokal turnering i appen eller tømme nettleserdata.

## Regler for endringer

Endre ikke fristene over uten å oppdatere personverntekstene og dette dokumentet i samme endring, og uten godkjenning fra eier.
