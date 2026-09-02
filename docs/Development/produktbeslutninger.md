# Produktbeslutninger og endringsvern

Sist oppdatert: 2026-09-03

Dette dokumentet beskriver valg som er godkjent for Padelstar. Nye faser, redesign og refaktorering skal behandle valgene som produktkrav. De skal ikke endres, fjernes eller omtolkes uten uttrykkelig godkjenning fra Sigurd Steen Grødem.

## Godkjente valg

- Hovedmenyen skal ha denne rekkefølgen: Hjem, Bli med, Opprett, Admin, Spiller, Konto/Profil, TV Mode og Språk. Menyen skal oppføre seg likt på alle visninger, med samme størrelse, spacing, logo-posisjon og responsiv oppførsel.
- Appen skal bruke den mørkeblå Padelstar-bakgrunnen og et felles visuelt uttrykk på tvers av hjemme-, oppsett-, admin-, spiller- og konto-visninger. Unødvendige ekstra bakgrunnspaneler og overskriftsflater skal ikke introduseres.
- Admin- og spillervisning skal være enkle og oversiktlige. Adminfunksjoner som deling og spillere skal ligge samlet under Styring når dette er relevant, og det skal finnes redigerbare banenavn/-numre i admin.
- En admin skal kunne lagre flere turneringer, åpne dem igjen senere og administrere én aktiv turnering om gangen. En lagret turnering skal ikke overskrives av en annen turnering.
- Brukerprofilen skal være en reell konto-/profilsiden med e-post, visningsnavn og annen relevant informasjon som kan endres. E-post og passord håndteres av Supabase Auth; passord skal aldri lagres i appens egne tabeller.
- En innlogget brukers profilnavn skal følge brukeren inn i påmelding og admin-oppretting. Navnet skal ikke kreves skrevet inn på nytt hver gang.
- Padelstar skiller mellom adminspiller, spiller med profil og gjestespiller. En spiller med profil kan få historikk på profilen; en gjest trenger ikke konto og skal behandles etter gjestepolicy.
- Spillerprofiler skal ikke slettes automatisk på grunn av alder. Sletting gjennomføres først 30 dager etter en uttrykkelig slettingsforespørsel. Turneringsdata skal ikke slettes før registrert spillerstatistikk er overført til profilhistorikken.
- Alle aktive språk skal dekke synlig brukerflate, regler, admin-/spillerkort, auth-tekster, personvern og bruksanvisning. Nye tekster skal ikke introduseres som permanent norsk fallback i andre språk.
- Hjemmesiden skal lenke til den korte, flerspråklige bruksanvisningen i `guide.html`. Guiden skal beskrive admin, profilspiller, gjestespiller og tilskuer.
- Tilkoblingsstatus skal vise grønn Online og grå Offline. Live-handlinger skal ikke late som de er synkronisert når forbindelsen mangler.

## Endringsport

Før en ny fase kan endre et punkt over, skal den:

1. beskrive hvilket produktvalg som berøres og hvorfor endringen er nødvendig
2. vise hvilke brukerflyter, data- og språkregler som påvirkes
3. foreslå oppdatert beslutningstekst og migrerings-/tilbakerullingsplan ved behov
4. få uttrykkelig godkjenning fra eieren før kode, database eller aktiv dokumentasjon endres

Tekniske forbedringer er tillatt så lenge de bevarer den observerbare brukeropplevelsen og dataprinsippene over. Testene skal utvides når en beslutning får en ny regressjonsrisiko.

## Verifikasjon

Ved avslutning av hver fase skal `npm test`, syntakssjekk og `git diff --check` kjøres. Dokumentasjonen skal oppdateres med endring, beslutningspåvirkning, testresultat og publiseringsstatus.
