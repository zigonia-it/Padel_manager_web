# Implementasjonsstatus mot masterplan

Dette er en kort sporbar status for arbeidet som er kontrollert mot [Padelstar-komplett-utviklingsplan.md](Padelstar-komplett-utviklingsplan.md). Masterplanen gjelder ved motstrid.

## Kontrollert og implementert

- Admin-oppretting krever passordbasert Supabase-innlogging når Supabase er aktiv.
- Konto kan opprettes, logges inn og logges ut med e-post og passord. Den gamle magiske lenke-flaten er skjult.
- Registrerte kontoer har en 1:1 `public.profiles`-rad med RLS. Gjestespillere kan fortsatt bli med uten konto.
- En innlogget spiller knyttes til `user_id` ved påmelding; konto er fortsatt ikke obligatorisk for spillere.
- Fase 2–6-modulene, turneringsformater, statistikk, historikk, hendelser, ratingberegning, varsler og PWA-grunnlag er koblet inn i appen og dekkes av testene.
- TV Mode ligger på egen `tv.html` med separat CSS/runtime, responsiv layout, offline-status, roterende meldinger og historikkvennlig tilbakeknapp.
- Aktive assets ligger under `assets/` sortert i `logos/`, `backgrounds/`, `icons/`, `ui/` og `fonts/`. Arkivmateriale ligger under `assets/archive/` og brukes ikke av runtime.
- Ikke-forside-modulene bruker nå et felles UI-lag med TV Mode som visuell referanse: mørk marineblå flate, kjølige blå borders, 12–14 px radius, felles typografihierarki og dempet modul-animasjon. Forsiden har fortsatt eget uttrykk, men bruker ikke lenger fotografisk bakgrunn.
- Språkfallback følger region: Bokmål, Nynorsk, svensk og dansk faller tilbake til Bokmål, mens engelsk, spansk, tysk og fransk faller tilbake til English før global Bokmål-fallback ved manglende nøkkel.
- Admin kan lagre flere turneringer lokalt, åpne dem igjen fra hjemmesiden og holde aktiv turneringsstate adskilt mellom turneringene.
- Konto-/profilflyten bruker Supabase Auth for e-post/passord og kan gjenbruke innlogget profilnavn ved admin-oppretting og spillerpåmelding. Passord lagres ikke i applikasjonstabeller.
- Retensjon er oppdatert: profiler slettes ikke automatisk, sletting skjer 30 dager etter uttrykkelig forespørsel, og avsluttede turneringer beholdes til registrert spillerstatistikk er overført til profilhistorikk.
- Hjemmesiden lenker til den flerspråklige [korte bruksanvisningen](../../guide.html), som dekker admin, profilspiller, gjestespiller og tilskuer.

## Produktvalg som ikke skal endres uten godkjenning

De avtalte meny-, layout-, rolle-, profil-, språk- og retensjonsvalgene er samlet i [produktbeslutninger og endringsvern](produktbeslutninger.md). Nye faser kan forbedre implementasjonen, men skal ikke endre disse observerbare valgene uten uttrykkelig tillatelse.

## Bevisst senere arbeid fra masterplanen

Masterplanen markerer ratingdatabase/liga, gjest-til-konto-konvertering og enkelte avanserte offline-/analyseutvidelser som senere arbeid. Disse er ikke behandlet som mangler i denne leveransen.

TV Mode skal senere kunne følge språket til brukeren som aktiverer visningen. Metoden velges ved implementering ut fra den da gjeldende navigasjons- og synkroniseringsløsningen, slik at språkverdien overføres robust uten å gjøre TV-siden avhengig av intern app-state.
