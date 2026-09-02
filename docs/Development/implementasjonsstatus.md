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

## Bevisst senere arbeid fra masterplanen

Masterplanen markerer ratingdatabase/liga, gjest-til-konto-konvertering og enkelte avanserte offline-/analyseutvidelser som senere arbeid. Disse er ikke behandlet som mangler i denne leveransen.
