# Padelstar - Dataretensjon

Sist oppdatert: 2026-09-03

Status: beta-utkast, eierbeslutninger mottatt 2026-08-27

## Formål

Padelstar skal lagre minst mulig persondata og bare bruke opplysningene til å administrere og følge en konkret padelturnering.

## Data som behandles

- Turneringsnavn, invitasjonskode, status, regler, baner og kampoppsett.
- Spillernavn, avatarvalg, rolle/identitet og om spilleren er aktiv.
- Kampresultater, walkover, undo-snapshot og tekniske revisjoner.
- Admin-token og spillertoken for skrivebeskyttelse. Admin-token skal ikke inngå i delt state eller backup.
- Supabase Auth-kontoens e-postadresse, tekniske bruker-ID og passordstatus. Padelstar lagrer ikke selve passordet.
- Privat `profiles`-profil med visningsnavn, avatarvalg, foretrukket språk og tidsstempler.
- Privat profilhistorikk med turneringsnavn, dato, plassering, poeng, kamper, seire, sett og games.
- Lokal nettleserstate, siste-kjente-gode recovery-kopi, IndexedDB-speiling og sync-kø.
- Vercel Analytics beholdes foreløpig for aggregert trafikkmåling.

## Foreslått retensjon

Følgende retensjon er godkjent som foreløpig beta-policy:

- Anonyme live-turneringer: kan slettes tidligst 30 dager etter at admin avslutter turneringen, og først når statistikk for registrerte spillere er overført til `player_profile_history`.
- Spillerøkter/token-hasher: slettes sammen med turneringen.
- Rate-limit-rader: slettes løpende eller holdes kortvarig nok til misbruksvern.
- Lokale data: beholdes på brukerens enhet til turneringen nullstilles eller nettleserdata tømmes.
- Backup-filer: styres av den som laster dem ned.
- Gjestedeltakere: kan brukes i live-turneringen, men gjestens identitet, statistikk og kamp-/annen historikk fjernes fra lagret turneringsstate når admin avslutter. Registrerte spillere med profilkobling og admin-deltakeren kan beholde historikk.

Registrerte brukerprofiler og profilhistorikk slettes ikke på grunn av alder eller manglende aktivitet. De beholdes så lenge kontoen/profilen består og opplysningene er nødvendige for funksjonen. Først når brukeren eksplisitt ber om sletting, merkes profilen for sletting og fjernes 30 dager etter forespørselen. Profilens token lagres kun som en
SHA-256-hash i den private profiltabellen og legges aldri i turneringsstate, historikk eller backup.

Den implementerte interne cleanup-funksjonen sletter turneringer som admin eksplisitt har satt til `Avsluttet`, tidligst etter `retention_expires_at`, og bare når hver registrerte spiller med `profileId` har en tilhørende rad i `player_profile_history`. Den sletter også rate-limit-rader eldre enn 24 timer. Profil-cleanup sletter profil og profilhistorikk først når en eksplisitt slettingsforespørsel har passert 30 dager. Begge funksjonene kjøres av den betrodde `pg_cron`-jobben `padelstar-retention-cleanup`.

## Sletteprosedyre

1. Bekreft turneringens invitasjonskode eller id.
2. Kontroller at slettingen gjelder riktig turnering.
3. Slett live turnering via godkjent RPC/adminflyt eller dokumentert Supabase-operasjon.
4. Bekreft at tilhørende spillerøkter og rate-limit-data er borte dersom de er knyttet til turneringen.
5. Be brukeren nullstille lokal turnering i appen eller tømme nettleserdata for å fjerne lokal kopi.

## Profilhistorikk er implementert

- Profilmodellen definerer at profil-ID eier profilhistorikk med turneringsnavn, dato, plassering, poeng, kamper, seire, sett og games.
- Profilhistorikk beholdes lenger mens profilen består.
- Ved eksplisitt profilsletting merkes profilen for sletting og tilknyttet historikk fjernes 30 dager etter forespørselen.
- `cleanup_expired_player_profiles()` sletter profil og tilhørende historikk etter slettingsfristen.
- `padelstar-retention-cleanup` er fast automatisk trigger i Supabase-drift.
