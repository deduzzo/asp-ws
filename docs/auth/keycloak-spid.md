# Integrazione Keycloak SPID/CIE/LDAP - Documento di Progetto

## Obiettivo

Aggiungere un nuovo endpoint di autenticazione che accetti un token JWT emesso da Keycloak (dopo autenticazione SPID, CIE, LDAP o locale) e rilasci lo **stesso authtoken** del sistema attuale, con gli stessi permessi (scopi, ambito, livello).

Il sistema esistente non cambia. Si aggiunge un nuovo punto di ingresso.

Keycloak gira su `login.asp.messina.it`, gia configurato per CIE e LDAP, SPID in fase di conclusione.

## Stato attuale

### Flusso login esistente

```
POST /api/v1/login/get-token
{ login, password, scopi, ambito, otp?, domain? }

1. Cerca utente per username + ambito
2. Verifica password (locale argon2 OPPURE domain-login AD/LDAP)
3. Carica scopi dell'utente, verifica che li abbia
4. Genera JWT con: { username, scopi[], ambito, livello, id_ambito }
5. Ritorna { token, expireDate }
```

### Cosa c'e gia di compatibile

| Componente | Stato | Note |
|------------|-------|------|
| `JwtService.generateToken()` | Pronto | Genera il token, riusabile as-is |
| `JwtService.verificaPermessi()` | Pronto | Ri-valida contro il DB ad ogni richiesta |
| `is-token-verified` policy | Pronta | Non cambia, valida i nostri JWT |
| `Auth_Utenti` model | Da estendere | Serve campo per CF |
| Scope system | Pronto | Wildcard matching gia supportato |
| OTP system | Coesiste | SPID/CIE ha gia il suo 2FA, non serve il nostro |
| Utenti LDAP | Gia registrati | Username gia salvato come `user@dominio` nel DB |

## Architettura

### Claims JWT Keycloak

Il JWT emesso da Keycloak contiene claims standard e custom. I claim custom sono configurati come mapper hardcoded per ogni client su Keycloak — sono **firmati crittograficamente** e non manomettibili.

| Claim | Sorgente | Valori | Descrizione |
|-------|----------|--------|-------------|
| `identity_provider` | Automatico Keycloak | `"spid"`, `"cie-id"`, null | Presente solo per IdP esterni |
| `access_type` | Hardcoded per client | `"public"`, `"registered"` | Determina se serve utente nel DB |
| `app_name` | Hardcoded per client | `"cambio-medico"`, `"portale-operatori"`, ... | Identifica l'applicazione |
| `domain` | Hardcoded per federazione LDAP | `"asp.messina.it"`, ... | Dominio per match utenti LDAP |
| `codice_fiscale` | Mapper da SPID/CIE | CF dell'utente | Presente solo per SPID/CIE |
| `preferred_username` | Automatico Keycloak | Username LDAP o locale | Identificativo utente |
| `given_name` | Automatico | Nome | Da SPID/CIE/LDAP |
| `family_name` | Automatico | Cognome | Da SPID/CIE/LDAP |

### Flusso generale

```
POST /api/v1/login/get-token-spid
{ keycloak_token, scopi, ambito }

                         │
                         ▼
              Verifica JWT Keycloak
              (firma RS256, iss, aud, exp)
                         │
                         ▼
              Leggi claims dal token:
              - identity_provider
              - access_type
              - app_name
              - domain
              - codice_fiscale
              - preferred_username
                         │
                         ▼
                   access_type?
                         │
          ┌──────────────┴───────────────┐
          │                              │
    "registered"                    "public"
          │                              │
          ▼                              ▼
    identity_provider?             Utente di servizio
          │                        "spid-{app_name}"
    ┌─────┼──────┐                 + ambito
    │     │      │                 CF nel token per audit
    │     │      │
"spid" "cie-id" null
    │     │      │
    └──┬──┘      │
       │         │
       ▼         ▼
  Cerca per    domain presente?
  CF + ambito       │
                ┌───┴────┐
                │        │
               SI       NO
                │        │
                ▼        ▼
           LDAP       Locale
```

### Match utente nel DB — 4 scenari

#### Scenario 1: SPID/CIE — utente registrato

```javascript
Auth_Utenti.findOne({
  codice_fiscale: payload.codice_fiscale.toUpperCase(),
  ambito: ambito.id
}).populate('scopi').populate('ambito')

// + verifica: attivo, scopi richiesti
```

Esempio: operatore sanitario o utente con account specifico che accede via SPID.

#### Scenario 2: LDAP — utente registrato

```javascript
// Keycloak restituisce preferred_username: "mrossi" (senza dominio)
// Keycloak restituisce domain: "asp.messina.it" (claim custom)
// Nel DB lo username e salvato come "mrossi@asp.messina.it"

const fullUsername = payload.preferred_username + '@' + payload.domain;

Auth_Utenti.findOne({
  username: fullUsername,            // "mrossi@asp.messina.it"
  allow_domain_login: true,
  domain: payload.domain,            // "asp.messina.it"
  ambito: ambito.id
}).populate('scopi').populate('ambito')

// + verifica: attivo, scopi richiesti
```

Esempio: operatore ASP che accede con le credenziali Active Directory.

#### Scenario 3: Utente locale Keycloak — registrato

```javascript
// Keycloak restituisce preferred_username: "mrossi" (senza dominio)
// Nessun claim domain

Auth_Utenti.findOne({
  username: payload.preferred_username,  // "mrossi"
  ambito: ambito.id
}).populate('scopi').populate('ambito')

// + verifica: attivo, scopi richiesti
```

Esempio: utente creato direttamente su Keycloak e registrato anche nel nostro DB.

#### Scenario 4: SPID/CIE — servizio pubblico

```javascript
// access_type: "public" — non serve utente registrato per persona
// Si usa un utente di servizio per l'app

Auth_Utenti.findOne({
  username: 'spid-' + payload.app_name,  // "spid-cambio-medico"
  ambito: ambito.id
}).populate('scopi').populate('ambito')

// + verifica: attivo, scopi richiesti
// + CF nel token SOLO per audit/log
```

Esempio: cittadino che fa il cambio medico via SPID/CIE. Non e registrato nel DB, usa l'utente di servizio.

### Matrice scenari

| Scenario | IdP | access_type | Match nel DB | Scopi | CF audit |
|----------|-----|-------------|-------------|-------|----------|
| SPID/CIE registrato | spid/cie-id | registered | CF + ambito | Personali dal DB | Si |
| LDAP registrato | null (+domain) | registered | user@dominio + allow_domain_login + domain + ambito | Personali dal DB | No |
| Locale registrato | null (no domain) | registered | username + ambito | Personali dal DB | No |
| Servizio pubblico | spid/cie-id | public | spid-{app_name} + ambito | Fissi del servizio | Si |

### Come si distinguono LDAP e locale

Non serve nessun claim aggiuntivo. La regola e semplice:

- **Claim `domain` presente** nel JWT → LDAP → match con `username@domain` + `allow_domain_login` + `domain`
- **Claim `domain` assente** → locale → match con solo `username`

Il claim `domain` e configurato come mapper hardcoded sulla federazione LDAP in Keycloak. Gli utenti locali non lo hanno.

## Verifica JWT Keycloak

Il JWT di Keycloak e firmato crittograficamente (RS256). La verifica si basa su:

1. **Firma valida** — verificata con la chiave pubblica dal JWKS endpoint di Keycloak
2. **Issuer corretto** — `iss` deve essere `https://login.asp.messina.it/realms/{realm}`
3. **Audience corretta** — `aud` deve essere nella lista dei client autorizzati
4. **Non scaduto** — `exp` nel futuro
5. **Claims obbligatori** — `access_type` e `app_name` devono essere presenti

Se tutti i controlli passano, c'e **certezza crittografica** che il token e autentico. Non e possibile falsificarlo ne manomettere i claims senza la chiave privata del Keycloak.

Per SPID/CIE c'e un controllo aggiuntivo: `identity_provider` deve valere `"spid"` o `"cie-id"`, confermando che l'autenticazione e passata dall'IdP esterno.

## Modifiche al database

### Nuovo campo su `Auth_Utenti`

```sql
-- database: auth
ALTER TABLE utenti
  ADD COLUMN codice_fiscale VARCHAR(16) NULL,
  ADD COLUMN keycloak_sub VARCHAR(255) NULL,
  ADD UNIQUE INDEX uq_utenti_cf (codice_fiscale);
```

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| codice_fiscale | VARCHAR(16) UNIQUE NULL | CF dell'utente, usato per match con SPID/CIE |
| keycloak_sub | VARCHAR(255) NULL | Subject ID Keycloak (opzionale, per match diretto futuro) |

MySQL permette valori NULL multipli su indici UNIQUE, quindi utenti senza CF non creano conflitti.

### Utenti di servizio per accesso pubblico

Per ogni servizio pubblico, creare un utente di servizio nel DB:

```sql
-- database: auth
-- Esempio: servizio cambio medico pubblico
INSERT INTO utenti (username, attivo, livello, ambito)
VALUES ('spid-cambio-medico', 1, /* livello user */, /* id ambito spid-pubblico */);

-- Assegnare gli scopi necessari
INSERT INTO utenti_scopi (utente, scopo)
VALUES (/* id utente */, /* id scope cambio-medico */);
```

Ogni utente di servizio ha **solo** gli scopi del servizio che rappresenta. Per aggiungere un nuovo servizio pubblico: creare client su Keycloak + utente `spid-{app_name}` nel DB. Zero codice.

### Nuovo ambito

Creare ambito `spid-pubblico` per i servizi ad accesso pubblico:

```sql
INSERT INTO ambiti (ambito, is_dominio) VALUES ('spid-pubblico', 0);
```

## Configurazione

### Variabili d'ambiente

```bash
KEYCLOAK_REALM_URL=https://login.asp.messina.it/realms/asp
KEYCLOAK_ALLOWED_CLIENTS=cambio-medico,portale-operatori,prenotazioni-cup
```

### `config/custom.js`

```javascript
keycloak: {
  realmUrl: process.env.KEYCLOAK_REALM_URL,
  jwksUri: process.env.KEYCLOAK_REALM_URL + '/protocol/openid-connect/certs',
  allowedClients: (process.env.KEYCLOAK_ALLOWED_CLIENTS || '').split(','),
  allowedIdps: ['spid', 'cie-id'],
},
```

## Componenti da implementare

### 1. Helper: `api/helpers/verify-keycloak-token.js`

Verifica il JWT di Keycloak usando le chiavi pubbliche JWKS.

```
Input:
  token (string) — JWT Keycloak dal frontend

Output (oggetto):
  valid (boolean)
  payload (object) — claims decodificati
  error (string|null)

Algoritmo:
  1. Decode header per ottenere `kid`
  2. Fetch chiave pubblica da JWKS endpoint (con cache 10 min)
  3. Verifica firma RS256
  4. Verifica iss === keycloak realm URL
  5. Verifica aud in allowedClients
  6. Verifica exp > now
  7. Verifica access_type e app_name presenti
  8. Se access_type == "registered" e identity_provider in ["spid","cie-id"]:
     verifica codice_fiscale presente
  9. Ritorna payload verificato
```

**Dipendenza**: `jwks-rsa` (npm) per fetch/cache delle chiavi pubbliche JWKS.

**Cache JWKS**: le chiavi pubbliche vengono cachate per 10 minuti. Keycloak le ruota raramente, ma il TTL evita problemi in caso di rotazione.

### 2. Controller: `api/controllers/login/get-token-spid.js`

Endpoint unico che gestisce tutti e 4 gli scenari.

```
Input:
  keycloak_token (string, required) — JWT Keycloak
  scopi (string, required) — scope richiesti (space-separated)
  ambito (string, optional, default "generale")

Flusso:

  1. Verifica JWT Keycloak → payload
  
  2. Verifica client autorizzato (payload.aud in allowedClients)
  
  3. Risolvi ambito: Auth_Ambiti.findOne({ambito: inputs.ambito})
  
  4. Trova utente in base a access_type e identity_provider:
  
     SE access_type == "public":
       → Auth_Utenti.findOne({
           username: "spid-" + payload.app_name,
           ambito: ambito.id
         })
       → auditCf = payload.codice_fiscale
  
     SE access_type == "registered":
       SE identity_provider in ["spid", "cie-id"]:
         → Auth_Utenti.findOne({
             codice_fiscale: payload.codice_fiscale.toUpperCase(),
             ambito: ambito.id
           })
         → auditCf = payload.codice_fiscale
  
       SE domain presente nel token:
         → fullUsername = payload.preferred_username + "@" + payload.domain
         → Auth_Utenti.findOne({
             username: fullUsername,
             allow_domain_login: true,
             domain: payload.domain,
             ambito: ambito.id
           })
  
       SE domain assente:
         → Auth_Utenti.findOne({
             username: payload.preferred_username,
             ambito: ambito.id
           })
  
  5. Verifiche standard:
     - Utente trovato (altrimenti 403)
     - Utente attivo (altrimenti 403)
     - Data disattivazione non superata
     - Scopi richiesti presenti nell'utente (stessa logica di get-token.js)
  
  6. Genera token:
     JwtService.generateToken({
       username: utente.username,
       scopi: scopiValidati,
       ambito: ambito.ambito,
       livello: utente.livello,
       id_ambito: ambito.id,
       // Campi audit aggiuntivi
       codice_fiscale: auditCf || null,
       auth_method: payload.identity_provider || (payload.domain ? 'ldap' : 'local'),
       nome: payload.given_name,
       cognome: payload.family_name,
       app_name: payload.app_name
     })
  
  7. Log con tag LOGIN_KEYCLOAK
  
  8. Ritorna { token, expireDate }

Errori:
  - Token Keycloak non valido       → 401 TOKEN_NON_VALIDO
  - Client non autorizzato           → 401 CLIENT_NON_AUTORIZZATO
  - Ambito non valido                → 400 AMBITO_NON_VALIDO
  - CF mancante (SPID/CIE)          → 400 CF_MANCANTE
  - Utente non trovato               → 403 UTENTE_NON_TROVATO
  - Utente non attivo                → 403 UTENTE_NON_ATTIVO
  - Scopi non autorizzati            → 403 SCOPO_NON_AUTORIZZATO
  - Servizio pubblico non abilitato  → 403 SERVIZIO_NON_ABILITATO
```

### 3. Rotta in `config/routes.js`

```javascript
'POST /api/v1/login/get-token-spid': {
  action: 'login/get-token-spid'
}
```

Nessuna policy `is-token-verified` (e un endpoint di autenticazione).

### 4. Swagger tag

```javascript
/**
 * @swagger
 *
 * /get-token-spid:
 *   tags:
 *     - Auth
 */
```

### 5. Modifica al modello `Auth_Utenti`

Aggiunta attributi:

```javascript
codice_fiscale: { type: 'string', maxLength: 16, allowNull: true },
keycloak_sub:   { type: 'string', maxLength: 255, allowNull: true },
```

### 6. Migrazione SQL

```sql
-- database: auth

ALTER TABLE utenti
  ADD COLUMN codice_fiscale VARCHAR(16) NULL,
  ADD COLUMN keycloak_sub VARCHAR(255) NULL,
  ADD UNIQUE INDEX uq_utenti_cf (codice_fiscale);
```

### 7. Pannello Admin

Aggiungere nella gestione utenti (`views/pages/admin/index.ejs` + `assets/js/admin.js`):
- Campo `codice_fiscale` visibile nella lista utenti
- Editabile nel form di creazione/modifica utente
- Ricercabile

### 8. Log tag

Aggiungere tag `LOGIN_KEYCLOAK` in `api/models/Log.js` per distinguere tutti i login via Keycloak.

## Flusso dettagliato

### Login SPID/CIE — utente registrato (Scenario 1)

```
Utente             Frontend           Keycloak              SPID/CIE IdP          Sails
  │                   │                  │                      │                    │
  │ click "Accedi"    │                  │                      │                    │
  ├──────────────────►│                  │                      │                    │
  │                   │ redirect ───────►│                      │                    │
  │                   │                  │ redirect ───────────►│                    │
  │ ◄──────────────────────────────────────────────────────────┤                    │
  │   pagina login SPID/CIE             │                      │                    │
  │                   │                  │                      │                    │
  │ autenticazione    │                  │                      │                    │
  ├──────────────────────────────────────────────────────────►│                    │
  │                   │                  │ ◄── SAML assertion ──┤                    │
  │                   │ ◄── JWT KC ──────┤                      │                    │
  │                   │   { CF, idp,     │                      │                    │
  │                   │     access_type: │                      │                    │
  │                   │     "registered",│                      │                    │
  │                   │     app_name }   │                      │                    │
  │                   │                  │                      │                    │
  │                   │ POST /login/get-token-spid             │                    │
  │                   │ { keycloak_token, scopi, ambito }      │                    │
  │                   ├───────────────────────────────────────►│                    │
  │                   │                                        │ Verifica JWT       │
  │                   │                                        │ Cerca CF + ambito  │
  │                   │                                        │ Verifica scopi     │
  │                   │                                        │ Genera authtoken   │
  │                   │ ◄──────────────────────────────────────┤                    │
  │                   │ { token, expireDate }                  │                    │
  │ ◄────────────────┤                                        │                    │
  │   usa il token normalmente                                │                    │
```

### Login LDAP via Keycloak (Scenario 2)

```
Utente             Frontend           Keycloak              AD/LDAP               Sails
  │                   │                  │                      │                    │
  │ click "Accedi"    │                  │                      │                    │
  ├──────────────────►│                  │                      │                    │
  │                   │ redirect ───────►│                      │                    │
  │ ◄────────────────────────────────────┤                      │                    │
  │   pagina login Keycloak              │                      │                    │
  │                   │                  │                      │                    │
  │ user + pass       │                  │                      │                    │
  ├──────────────────────────────────────►                      │                    │
  │                   │                  │ verifica LDAP ──────►│                    │
  │                   │                  │ ◄── OK ──────────────┤                    │
  │                   │ ◄── JWT KC ──────┤                      │                    │
  │                   │   { username:    │                      │                    │
  │                   │     "mrossi",    │                      │                    │
  │                   │     domain:      │                      │                    │
  │                   │     "asp.messina.it",                   │                    │
  │                   │     access_type: │                      │                    │
  │                   │     "registered"}│                      │                    │
  │                   │                  │                      │                    │
  │                   │ POST /login/get-token-spid             │                    │
  │                   │ { keycloak_token, scopi, ambito }      │                    │
  │                   ├───────────────────────────────────────►│                    │
  │                   │                                        │ Verifica JWT       │
  │                   │                                        │ username + "@" +   │
  │                   │                                        │   domain =         │
  │                   │                                        │ "mrossi@asp..."    │
  │                   │                                        │ + allow_domain     │
  │                   │                                        │ + domain match     │
  │                   │                                        │ + ambito           │
  │                   │                                        │ Verifica scopi     │
  │                   │                                        │ Genera authtoken   │
  │                   │ ◄──────────────────────────────────────┤                    │
  │                   │ { token, expireDate }                  │                    │
```

### Servizio pubblico SPID/CIE (Scenario 4)

```
Cittadino          Frontend           Keycloak              SPID IdP              Sails
  │                   │                  │                      │                    │
  │ "Cambio medico"   │                  │                      │                    │
  ├──────────────────►│                  │                      │                    │
  │                   │ redirect ───────►│ (client: cambio-medico)                  │
  │   ... autenticazione SPID ...        │                      │                    │
  │                   │ ◄── JWT KC ──────┤                      │                    │
  │                   │   { CF,          │                      │                    │
  │                   │     idp: "spid", │                      │                    │
  │                   │     access_type: │                      │                    │
  │                   │     "public",    │                      │                    │
  │                   │     app_name:    │                      │                    │
  │                   │     "cambio-medico" }                   │                    │
  │                   │                  │                      │                    │
  │                   │ POST /login/get-token-spid             │                    │
  │                   │ { keycloak_token,                      │                    │
  │                   │   scopi: "cambio-medico",              │                    │
  │                   │   ambito: "spid-pubblico" }            │                    │
  │                   ├───────────────────────────────────────►│                    │
  │                   │                                        │ Verifica JWT       │
  │                   │                                        │ access_type=public │
  │                   │                                        │ Cerca utente       │
  │                   │                                        │ "spid-cambio-medico"
  │                   │                                        │ + ambito           │
  │                   │                                        │ Verifica scopi     │
  │                   │                                        │ Token con CF audit │
  │                   │ ◄──────────────────────────────────────┤                    │
  │                   │ { token, expireDate }                  │                    │
  │ ◄────────────────┤                                        │                    │
  │                   │                                        │                    │
  │   Ogni azione del cittadino viene loggata con il suo CF    │                    │
  │   reale, anche se il token e intestato a                   │                    │
  │   "spid-cambio-medico"                                     │                    │
```

## Confronto login classico vs Keycloak

```
                     Login classico              Login Keycloak
                     ──────────────              ──────────────
Input                user + pass + scopi + amb.  keycloak_token + scopi + ambito
Verifica identita    argon2 / AD-LDAP            firma JWT Keycloak (RS256)
Match SPID/CIE       N/A                         codice_fiscale + ambito
Match LDAP           username + domain + ambito  user@domain + allow_domain_login
                                                 + domain + ambito
Match locale         username + ambito           username + ambito
Match pubblico       N/A                         spid-{app_name} + ambito
Scopi                populate + verifica         populate + verifica [identico]
Token output         { username, scopi, ambito,  { username, scopi, ambito,
                       livello, id_ambito }        livello, id_ambito } [identico]
                                                 + codice_fiscale, auth_method,
                                                   nome, cognome, app_name (audit)
OTP                  Gestito internamente        Non serve (SPID/CIE ha 2FA)
Policy successive    is-token-verified           is-token-verified [identica]
```

**Dopo il login, il sistema non distingue** il metodo di autenticazione. Il token e compatibile con tutto il sistema esistente.

## Configurazione Keycloak (lato `login.asp.messina.it`)

Questa sezione descrive cosa configurare su Keycloak. Non e codice del nostro progetto.

### Realm

Usare il realm esistente (o crearne uno dedicato).

### Client per ogni applicazione

Ogni applicazione che usa il nostro backend ha un client Keycloak dedicato con mapper hardcoded.

#### Esempio: client "cambio-medico" (pubblico)

| Parametro | Valore |
|-----------|--------|
| Client ID | `cambio-medico` |
| Protocol | openid-connect |
| Access Type | public |
| Valid Redirect URIs | `https://cambiomedico.asp.messina.it/callback` |

Mapper hardcoded:

| Mapper | Type | Valore |
|--------|------|--------|
| app_name | Hardcoded claim | `"cambio-medico"` |
| access_type | Hardcoded claim | `"public"` |

#### Esempio: client "portale-operatori" (registrato)

| Parametro | Valore |
|-----------|--------|
| Client ID | `portale-operatori` |
| Protocol | openid-connect |
| Access Type | confidential |

Mapper hardcoded:

| Mapper | Type | Valore |
|--------|------|--------|
| app_name | Hardcoded claim | `"portale-operatori"` |
| access_type | Hardcoded claim | `"registered"` |

### Identity Provider SPID

Plugin `italia/keycloak-spid-provider`:
- Aggiunge SPID come Identity Provider SAML2
- Mappa automaticamente attributi SPID (fiscalNumber, name, familyName)

### Identity Provider CIE

Gia configurato su `login.asp.messina.it`.

### Federazione LDAP

Gia configurata. Aggiungere un mapper per il claim `domain`:

| Mapper | Type | Valore |
|--------|------|--------|
| domain | Hardcoded claim | `"asp.messina.it"` |

### Mapper codice_fiscale (per SPID/CIE)

Nel Client → Mappers:

| Parametro | Valore |
|-----------|--------|
| Name | codice_fiscale |
| Mapper Type | User Attribute |
| User Attribute | fiscalNumber |
| Token Claim Name | codice_fiscale |
| Claim JSON Type | String |
| Add to ID token | ON |
| Add to access token | ON |

## Audit e tracciabilita

### Log unificato

Ogni login via Keycloak viene loggato con tag `LOGIN_KEYCLOAK`:

```
Tag: LOGIN_KEYCLOAK
Azione: "Login spid via cambio-medico"
Utente: "RSSMRA80A01F158K"          ← CF per SPID/CIE
        "mrossi@asp.messina.it"      ← username per LDAP
        "mrossi"                      ← username per locale
IP: 151.42.xxx.xxx
Contesto: {
  identity_provider: "spid",
  app_name: "cambio-medico",
  access_type: "public",
  scopi: "cambio-medico"
}
```

### Servizi pubblici

Per i servizi pubblici, il CF del cittadino e incluso nel token JWT emesso da Sails:

```javascript
{
  username: "spid-cambio-medico",          // utente di servizio
  codice_fiscale: "RSSMRA80A01F158K",      // cittadino reale
  auth_method: "spid",
  app_name: "cambio-medico"
}
```

Ogni controller che logga azioni puo usare `req.tokenData.codice_fiscale` per tracciare il cittadino reale. Il helper `log.js` va aggiornato per preferire il CF quando presente:

```javascript
utente: req.tokenData.codice_fiscale || req.tokenData.username
```

## Dipendenze npm

```json
{
  "jwks-rsa": "^3.x"
}
```

Pacchetto unico necessario. `jsonwebtoken` e gia presente nel progetto.

## File da creare/modificare

### Nuovi file

| File | Descrizione |
|------|-------------|
| `migrations/XXXXXXXX_001_utenti_cf.sql` | Aggiunge codice_fiscale e keycloak_sub a utenti |
| `api/helpers/verify-keycloak-token.js` | Verifica JWT Keycloak via JWKS |
| `api/controllers/login/get-token-spid.js` | Endpoint login Keycloak (tutti gli scenari) |

### File da modificare

| File | Modifica |
|------|----------|
| `config/routes.js` | Aggiunta rotta `POST /api/v1/login/get-token-spid` |
| `config/custom.js` | Aggiunta sezione `keycloak` con env vars |
| `api/models/Auth_Utenti.js` | Aggiunta attributi `codice_fiscale`, `keycloak_sub` |
| `api/models/Log.js` | Aggiunta tag `LOGIN_KEYCLOAK` |
| `api/helpers/log.js` | Preferire CF quando presente in tokenData |
| `views/pages/admin/index.ejs` | Campo CF nella gestione utenti |
| `assets/js/admin.js` | Gestione campo CF |
| `package.json` | Aggiunta dipendenza `jwks-rsa` |

## Considerazioni

### Utenti dual-access

Un utente puo avere **sia** username/password **sia** CF configurati. Puo accedere con qualsiasi metodo (login classico, SPID, LDAP via Keycloak). Il token risultante e identico.

### Provisioning

**Utenti registrati**: l'admin deve creare l'utente nel pannello e assegnare CF (per SPID/CIE) o username@dominio (per LDAP). Non c'e auto-creazione.

**Servizi pubblici**: l'admin crea l'utente di servizio `spid-{app_name}` con gli scopi necessari. Per aggiungere un nuovo servizio pubblico basta creare il client su Keycloak + l'utente di servizio nel DB. Zero codice da modificare.

### Aggiunta nuove applicazioni

| Passo | Dove | Chi |
|-------|------|-----|
| 1. Crea client Keycloak con mapper | login.asp.messina.it | Admin Keycloak |
| 2. Aggiungi client a `KEYCLOAK_ALLOWED_CLIENTS` | env var server Sails | Admin server |
| 3. (se pubblico) Crea utente `spid-{app_name}` | Pannello admin asp-ws | Admin asp-ws |
| 4. (se pubblico) Assegna scopi all'utente servizio | Pannello admin asp-ws | Admin asp-ws |

Nessuna modifica al codice.

### Ambiente di test SPID

AGID fornisce `spid-testenv2` come IdP di test. Si configura in Keycloak come IdP aggiuntivo. Non serve registrarsi come Service Provider ufficiale per i test.

### Rate limiting

L'endpoint va protetto da rate limiting per prevenire abusi. Stessa policy degli altri endpoint di login.

### Coesistenza con login classico

L'endpoint `POST /api/v1/login/get-token` resta invariato e funzionante. I due endpoint coesistono:

- `/login/get-token` → user + password (+ OTP) — per chi non passa da Keycloak
- `/login/get-token-spid` → JWT Keycloak — per chi passa da Keycloak

Nessuna migrazione forzata. Si possono usare entrambi contemporaneamente.

---

## Flow server-side (questa iterazione)

> **Nota**: il design originario di questo documento e' **frontend-driven** (il browser riceve il JWT Keycloak e lo passa a `POST /get-token-spid`). L'iterazione effettivamente implementata e' invece **backend-driven**: asp-ws gestisce direttamente il flow OIDC con Keycloak (Authorization Code), nessun token Keycloak transita per il browser. Vedere [PROMPT_SPID_LOGIN.md](../PROMPT_SPID_LOGIN.md) per il prompt di implementazione completo.

### Endpoint disponibili

| Endpoint | Descrizione |
|---|---|
| `GET /api/v1/login/spid/start?scopi=...&ambito=...&redirect_uri=...&idp=...` | Avvia il flow: valida la `redirect_uri` (whitelist), costruisce uno state HMAC firmato e redirige il browser sull'authorize endpoint Keycloak |
| `GET /api/v1/login/spid/callback?code=...&state=...` | Callback OIDC: scambia il code, verifica id_token, fa il match utente per CF, emette il JWT proprietario e redirige alla `redirect_uri` con `?asp_token=<JWT>&expireDate=<...>` |
| `GET /api/v1/login/spid/debug` | Endpoint di test che mostra il payload decodificato del JWT ricevuto via querystring. Da rimuovere/restringere in produzione (whitelistato di default). |

### Match utente

`username = codice_fiscale.toUpperCase().trim()`. L'utente deve essere creato manualmente nel pannello admin con il CF in maiuscolo come username, prima del primo login.

### Errori

Quando lo state e' decodificabile, qualunque errore (incluso scope_unauthorized, user_not_found, errori SPID) ritorna un `302` alla `redirect_uri` con `?error=<code>&error_description=<msg>`. Il consumer deve sempre controllare la presenza di `error` PRIMA di `asp_token`. Tabella codici in [PROMPT_SPID_LOGIN.md §3](../PROMPT_SPID_LOGIN.md#3-flow-funzionale-end-to-end).

### Configurazione

File `config/custom/private_spid_login.json` (gitignored), con `kcClientSecret` da incollare manualmente dal pannello Keycloak (client `asp-ws-spid`, tab Credentials). Il `stateSecret` e' un random di almeno 32 caratteri. La whitelist `allowedRedirectUris` accetta solo strict-equal (no wildcards).

### SPID e CIE

Le due modalita' usano lo stesso client Keycloak (`asp-ws-spid`) e gli stessi mapper (scope `spid-cie-attributes` con claim `fiscalNumber` in camelCase). Sono trasparenti dal punto di vista del backend: il flow OIDC e' identico. Il JWT proprietario emesso dal callback contiene `auth_method: 'spid-cie'` — un solo valore copre entrambe le modalita', dato che backend e mapper non differenziano.
