# Konto-, database- og turneringsflyt

## Overordnet prinsipp

Databasen skal alltid brukes når en turnering skal kunne deles og synkroniseres mellom flere spillere og flere enheter.

Det må skilles mellom tre typer data:

1. **Aktiv/midlertidig turneringsdata**
   - Turneringsoppsett
   - Deltakere
   - Lag
   - Kamper
   - Poeng/resultater
   - Aktiv turneringsstatus
   - Data som kreves for synkronisering mellom enheter

2. **Permanent turneringshistorikk**
   - Skal kun beholdes dersom brukeren som opprettet turneringen har en konto.
   - Turneringen knyttes permanent til admin/oppretterens bruker-ID.

3. **Personlig spillerstatistikk**
   - Skal lagres permanent på hver enkelt innlogget brukers konto.
   - Spillere uten konto får ikke permanent statistikk.
   - Statistikken må kunne beholdes selv om selve turneringen senere slettes.

---

# Viktig regel

En konto skal **ikke være nødvendig for å delta i eller opprette en turnering**.

Men uten konto finnes det ingen permanent eier av dataene.

Derfor:

- Innlogget admin → turneringen kan lagres permanent.
- Admin uten konto → turneringen eksisterer kun så lenge den er aktiv.
- Innlogget spiller → personlig statistikk lagres permanent.
- Spiller uten konto → kan delta normalt, men personlig historikk/statistikk lagres ikke permanent.

---

# Admin-flyt

```text
Opprett turnering
        ↓
Sjekk om admin er innlogget
        ↓
┌──────────────────────────────┐
│ Er admin innlogget?          │
└──────────────────────────────┘
       ↓ JA              ↓ NEI
Turneringen          Vis valg:
knyttes til          - Logg inn
brukerkonto          - Opprett konto
                     - Fortsett uten konto
                         ↓
                  Fortsett uten konto
                         ↓
               Opprett midlertidig
               turnering i databasen
        ↓
Turneringsoppsett
        ↓
Deltakere / lag / baner / kamper
        ↓
Turneringsspill
        ↓
Løpende synkronisering via databasen
        ↓
Turneringen avsluttes eller avbrytes
        ↓
Beregn sluttresultat og spillerstatistikk
        ↓
Lagre statistikk på alle deltakere
som har innlogget brukerkonto
        ↓
┌──────────────────────────────┐
│ Har turneringens admin konto?│
└──────────────────────────────┘
       ↓ JA              ↓ NEI
Behold             Slett turneringens
turneringen        midlertidige data
permanent          etter at statistikk
på adminens        for registrerte
konto              brukere er lagret
```

## Admin med konto

Dersom admin er innlogget når turneringen opprettes:

- turneringen får en permanent `owner_user_id`
- turneringen lagres på adminens konto
- turneringen kan vises senere i turneringshistorikk
- sluttresultat og relevant turneringsinformasjon beholdes
- statistikk lagres separat på de enkelte innloggede spillerne

Turneringen skal altså ikke være avhengig av spillerstatistikken for å eksistere.

---

## Admin uten konto

Dersom admin velger å opprette turneringen uten konto:

- turneringen må fortsatt opprettes i databasen slik at flere enheter kan delta
- turneringen skal markeres som midlertidig/guest-owned
- den har ingen permanent `owner_user_id`
- den fungerer ellers som en vanlig turnering mens den pågår

Når turneringen avsluttes eller avbrytes:

1. Beregn sluttresultat.
2. Beregn statistikk for alle deltakere.
3. Lagre permanent statistikk på alle spillere som har konto.
4. Spillere uten konto får ingen permanent statistikk.
5. Når nødvendig brukerstatistikk er lagret, slettes den midlertidige turneringen og dens midlertidige data.

---

# Spillerflyt

```text
Bli med i turnering
        ↓
Finn turnering via invitasjon/kode/QR
        ↓
Sjekk om spilleren er innlogget
        ↓
┌──────────────────────────────┐
│ Er spilleren innlogget?      │
└──────────────────────────────┘
       ↓ JA              ↓ NEI
Knytt              Vis valg:
deltakeren til     - Logg inn
brukerkonto        - Opprett konto
                   - Fortsett uten konto
                         ↓
                  Opprett midlertidig
                  gjestedeltaker
        ↓
Turneringsspill
        ↓
Resultater registreres og synkroniseres
        ↓
Turneringen avsluttes
        ↓
┌──────────────────────────────┐
│ Har spilleren konto?         │
└──────────────────────────────┘
       ↓ JA              ↓ NEI
Lagre permanent    Ingen permanent
personlig          personlig statistikk
statistikk
```

---

# Viktige databaseregler

## 1. Aktiv turnering må ligge i databasen

En turnering kan ikke bare eksistere lokalt på adminens enhet dersom flere enheter skal kunne delta.

Databasen skal være **source of truth** for aktive turneringer.

Eksempel:

```text
Admin-enhet
     ↓
Database
 ↙   ↓   ↘
Spiller A
Spiller B
Spiller C
```

Alle klienter leser og skriver mot samme aktive turneringsdata.

---

## 2. Guest betyr ikke lokal-only

En bruker uten konto skal fortsatt kunne:

- opprette turnering
- bli med i turnering
- spille kamper
- registrere poeng dersom rollen tillater dette
- motta sanntidsoppdateringer
- se resultater

Forskjellen er kun **permanent lagring etter turneringen**.

---

## 3. Statistikken må være uavhengig av turneringsobjektet

Personlig statistikk som skal beholdes må kopieres/lagres på brukerens permanente statistikk før en midlertidig turnering slettes.

Eksempel:

```text
Temporary Tournament
       ↓
Match Results
       ↓
Calculate Player Statistics
       ↓
┌─────────────────────────────────┐
│ Logged-in players               │
│ → save permanent statistics     │
└─────────────────────────────────┘
       ↓
Delete temporary tournament
```

En senere sletting av turneringen skal derfor **ikke slette allerede lagret spillerstatistikk**.

---

# Eksempel

Admin **Ola** oppretter en turnering uten konto.

Fire spillere deltar:

- Anna – innlogget
- Per – innlogget
- Jonas – gjest
- Mari – gjest

Turneringen lagres midlertidig i databasen mens den pågår.

Etter turneringen:

```text
Anna → statistikk lagres på Annas konto
Per   → statistikk lagres på Pers konto
Jonas → ingen permanent statistikk
Mari  → ingen permanent statistikk
```

Fordi Ola ikke har konto:

```text
Turneringshistorikk → slettes
Midlertidige kamper → slettes
Midlertidige deltakere → slettes
```

Anna og Per beholder likevel sin personlige statistikk.

---

# Eksempel med innlogget admin

Admin **Ola** er innlogget.

Spillere:

- Anna – innlogget
- Per – innlogget
- Jonas – gjest
- Mari – gjest

Etter turneringen:

```text
Ola
└── Tournament history
    └── Tournament #123

Anna
└── Player statistics

Per
└── Player statistics

Jonas
└── No permanent statistics

Mari
└── No permanent statistics
```

Turneringen beholdes permanent fordi den har en registrert eier.

---

# Teknisk krav

Datamodellen må derfor støtte minimum følgende konsepter:

```text
users

tournaments
- id
- owner_user_id (nullable)
- ownership_type: account | guest
- lifecycle_status: active | completed | cancelled
- persistence_type: permanent | temporary

tournament_players
- tournament_id
- user_id (nullable)
- guest/session identity
- display_name

matches
- tournament_id
- players/teams
- score
- result

user_statistics
- user_id
- permanent aggregated/historical statistics
- source tournament/match metadata where relevant
```

Eksakt databasestruktur kan tilpasses eksisterende schema, men denne funksjonelle logikken skal beholdes.

---

# Viktig implementeringsregel

**Ikke bland autentisering med retten til å bruke turneringsfunksjonen.**

Autentisering bestemmer først og fremst:

- permanent eierskap
- permanent historikk
- personlig statistikk
- mulighet til å hente data igjen senere

Det skal ikke avgjøre om brukeren får opprette eller delta i en turnering.

Kort sagt:

> **Database kreves for multiplayer. Konto kreves for permanent eierskap og personlig historikk – ikke for å spille.**