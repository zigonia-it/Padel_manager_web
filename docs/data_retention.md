# Padelstar - Dataretensjon

Sist oppdatert: 2026-08-28

Status: beta-utkast, eierbeslutninger mottatt 2026-08-27

## Formål

Padelstar skal lagre minst mulig persondata og bare bruke opplysningene til å administrere og følge en konkret padelturnering.

## Data som behandles

- Turneringsnavn, invitasjonskode, status, regler, baner og kampoppsett.
- Spillernavn, avatarvalg, rolle/identitet og om spilleren er aktiv.
- Kampresultater, walkover, undo-snapshot og tekniske revisjoner.
- Admin-token og spillertoken for skrivebeskyttelse. Admin-token skal ikke inngå i delt state eller backup.
- Lokal nettleserstate, siste-kjente-gode recovery-kopi, IndexedDB-speiling og sync-kø.
- Vercel Analytics beholdes foreløpig for aggregert trafikkmåling.

## Foreslått retensjon

Følgende retensjon er godkjent som foreløpig beta-policy:

- Anonyme live-turneringer: slettes innen 30 dager etter at admin avslutter turneringen.
- Spillerøkter/token-hasher: slettes sammen med turneringen.
- Rate-limit-rader: slettes løpende eller holdes kortvarig nok til misbruksvern.
- Lokale data: beholdes på brukerens enhet til turneringen nullstilles eller nettleserdata tømmes.
- Backup-filer: styres av den som laster dem ned.

Når brukerprofiler innføres, kan profil-eide turneringer og statistikk beholdes lenger som brukerens historikk. Ved sletting av
profilen skal tilknyttede resterende data slettes etter 30 dager. Cleanup-jobben må da utvides med profilkobling før profiler
kan lanseres. Fase 9 har nå en profil-light lokalt og private Supabase-tabeller for profilhistorikk; profilen bruker en lokalt
lagret token som aldri legges i turneringsstate, historikk eller backup.

Den implementerte interne cleanup-funksjonen sletter turneringer som admin eksplisitt har satt til `Avsluttet`, og bruker serverfeltene `ended_at` og `retention_expires_at` som tidsgrunnlag. Den sletter også rate-limit-rader eldre enn 24 timer. Profil-cleanup sletter profil og profilhistorikk når slettingsfristen er passert. Begge funksjonene kjøres av den betrodde `pg_cron`-jobben `padelstar-retention-cleanup`.

## Sletteprosedyre

1. Bekreft turneringens invitasjonskode eller id.
2. Kontroller at slettingen gjelder riktig turnering.
3. Slett live turnering via godkjent RPC/adminflyt eller dokumentert Supabase-operasjon.
4. Bekreft at tilhørende spillerøkter og rate-limit-data er borte dersom de er knyttet til turneringen.
5. Be brukeren nullstille lokal turnering i appen eller tømme nettleserdata for å fjerne lokal kopi.

## Profilhistorikk er implementert

- Profilmodellen definerer at profil-ID eier profilhistorikk med turneringsnavn, dato, plassering, poeng, kamper, seire, sett og games.
- Profilhistorikk beholdes lenger mens profilen består.
- Ved profilsletting merkes profilen for sletting og tilknyttet historikk fjernes innen 30 dager.
- `cleanup_expired_player_profiles()` sletter profil og tilhørende historikk etter slettingsfristen.
- `padelstar-retention-cleanup` er fast automatisk trigger i Supabase-drift.
