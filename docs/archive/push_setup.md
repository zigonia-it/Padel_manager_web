# Padelstar Web Push-oppsett

Fase 15 bruker Supabase Edge Function `push-send` som betrodd sender. Klienten skal aldri inneholde privat VAPID-nøkkel eller service-role-nøkkel.

## Produksjonsoppsett

Sett disse hemmelighetene i Supabase Functions:

```text
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT=mailto:sigurd.grodem@live.no
```

Sett samme `VAPID_PUBLIC_KEY` i `supabase-config.js`. Den private nøkkelen skal bare ligge som Supabase Function secret.

Deploy funksjonen fra prosjektroten:

```bash
supabase functions deploy push-send --no-verify-jwt
```

Funksjonen validerer admin-token mot turneringen med service role, sender bare korte generiske varsler og fjerner abonnementer som svarer 404/410. Den logger ikke tokens, navn eller turneringsinnhold.
