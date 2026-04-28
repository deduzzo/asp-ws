# PROMPT — Implementazione login SPID server-side per asp-ws

> Brief completo per istanza Claude (Chrome/CLI) che svilupperà la feature.
> Il prompt è autosufficiente: leggilo per intero prima di iniziare a scrivere codice.

---

## 1. Contesto

`asp-ws` è il backend Sails.js (Node 22) di ASP Messina (`https://github.com/deduzzo/asp-ws`). Espone le API aziendali su `https://ws1.asp.messina.it/api/v1/...` e oggi rilascia un **JWT proprietario** firmato HS256 da `JwtService` (config: `sails.config.custom.jwtSecret`) tramite `POST /api/v1/login/get-token` (login + password + scopi + ambito + OTP opzionale).

Il payload del JWT proprietario è:

```js
{ username, scopi: [...], ambito: "<nome>", id_ambito: <int>, livello: <int>, iat, exp }
```

Tutte le rotte protette in `config/routes.js` dichiarano `scopi`, `ambito` e `minAuthLevel`. La verifica avviene in `JwtService.verificaPermessi()` che ricarica l'utente dal DB ad ogni richiesta.

Oggi gli utenti sono in `Auth_Utenti` (modello: `api/models/Auth_Utenti.js`, datastore `auth`, MySQL) con relazioni many-to-many verso `Auth_Scopi` via `Auth_UtentiScopi`, `belongsTo` verso `Auth_Ambiti` e `Auth_Livelli`. Esiste anche un fallback "domain login" (LDAP) gestito da `api/helpers/domain-login.js`.

Su **Keycloak** `https://login.asp.messina.it` realm `asp` (server `aspme@192.168.250.78`, docker compose in `/home/aspme/keycloak/`) è già configurato il provider `italia/spid-keycloak-provider` con tutti i 14 IdP SPID + CIE. EntityID SAML SP: `https://login.asp.messina.it/realms/asp`. Esiste già un client di test `spid-test-login` (public, OIDC, scope `spid-cie-attributes`) usato dall'app demo `keykloak-test-auth/` — vedi quel codice come riferimento per il flow OIDC con `openid-client`.

**Documento di design preesistente**: `docs/auth/keycloak-spid.md` descrive un'architettura **frontend-driven** (il frontend riceve il JWT Keycloak via OIDC e lo passa a `POST /get-token-spid`). **NON è la strada scelta**: leggi quel doc come contesto generale (in particolare i 4 scenari di match utente, i mapper hardcoded e le considerazioni di sicurezza), ma per questa feature segui le **scelte architetturali** di seguito.

---

## 2. Scelte architetturali (vincolanti)

| Scelta | Valore | Motivazione |
|---|---|---|
| Chi gestisce il flow OIDC | **Backend asp-ws server-side** | Niente token Keycloak nel browser, niente CORS, secret del client al sicuro. |
| Mapping CF → utente | **`username = codice_fiscale.toUpperCase()`** | Niente nuove colonne né migration: si riusa la colonna esistente. Roberto crea manualmente l'utente nel pannello admin con CF come username. |
| Come il client passa scopi/ambito/redirect | **Querystring** su `/api/v1/login/spid/start` | Pattern OAuth-like. State firmato lato server tiene insieme i parametri durante il round-trip SPID. |
| Tipo client Keycloak | **Confidential + client_secret** (Authorization Code, no PKCE) | Backend-only, secret riservato in `config/custom/private_*.json`. |
| Consegna del JWT proprietario al chiamante | **Redirect 302 a `redirect_uri`** con `?asp_token=<JWT>&expireDate=<...>` | Pattern noto al consumer web. La querystring (e non il fragment) la lascia leggere anche al backend del consumer se serve. |
| Whitelisting `redirect_uri` | **Lista in `config/custom/private_spid_login.json`** | Stesse regole strict di OAuth: solo URL pre-approvati. |
| PKCE | **Disabilitato** | Con client confidential + secret è ridondante. Da rivalutare se servirà un client public. |
| Logout SPID | **Fuori scope** | Il consumer scarta il JWT proprietario, asp-ws è stateless. RP-initiated logout / SLO SAML eventualmente in iterazione successiva. |
| Claim extra nel JWT proprietario | **Solo `auth_method: "spid"`** | Il `username` è già il CF, niente duplicati. Niente nome/cognome/email in payload. |
| Metriche | **Counter Prometheus `asp_spid_login_total{outcome}`** | In `MetricsService` esistente, un'etichetta per esito (ok / errori). |

### Cosa NON fare in questa iterazione

- Niente colonna `codice_fiscale`, niente `keycloak_sub`. Niente migration.
- Niente scenari "LDAP via Keycloak", "locale via Keycloak", "spid-pubblico via Keycloak": qui copriamo SOLO il caso **SPID → utente registrato** (`username = CF`). Se servirà, si estenderà dopo seguendo `docs/auth/keycloak-spid.md`.
- Niente sostituzione del flow `/get-token` esistente: il nuovo è un endpoint aggiuntivo, l'esistente resta intatto.
- Niente refresh token Keycloak persistito su DB e niente Single Logout SPID in questa iterazione (logout = invalidazione lato consumer del JWT proprietario, asp-ws è stateless).

---

## 3. Flow funzionale (end-to-end)

```
Client web                       asp-ws                          Keycloak              SPID IdP
  │                               │                                │                     │
  │ GET /api/v1/login/spid/start? │                                │                     │
  │   scopi=anagrafica+geo&       │                                │                     │
  │   ambito=api&                 │                                │                     │
  │   redirect_uri=https://...    │                                │                     │
  ├──────────────────────────────►│                                │                     │
  │                               │ valida redirect_uri            │                     │
  │                               │ genera state firmato (HMAC)    │                     │
  │                               │   payload: scopi/ambito/       │                     │
  │                               │   redirect_uri/nonce/exp       │                     │
  │                               │ build authorize URL (kc_idp_   │                     │
  │                               │   hint opzionale ?idp=...)     │                     │
  │ 302 Location: KC/auth?...     │                                │                     │
  │◄──────────────────────────────┤                                │                     │
  │                                                                │                     │
  │ GET KC/protocol/.../auth?...                                   │                     │
  ├───────────────────────────────────────────────────────────────►│                     │
  │                                                                │ redirect SPID IdP   │
  │                                                                ├────────────────────►│
  │  ... autenticazione SPID (compresi 2FA SPID, attributi) ...                          │
  │                                                                │◄────────────────────┤
  │                                SAML assertion                  │                     │
  │ 302 Location: WS/spid/callback?code=...&state=...              │                     │
  │◄───────────────────────────────────────────────────────────────┤                     │
  │                               │                                │                     │
  │ GET /api/v1/login/spid/callback?code=...&state=...             │                     │
  ├──────────────────────────────►│                                │                     │
  │                               │ verifica state (HMAC + exp)    │                     │
  │                               │ POST KC/token (code+secret) ──►│                     │
  │                               │◄── id_token, access_token ─────┤                     │
  │                               │ verifica id_token (RS256/JWKS) │                     │
  │                               │ estrae fiscal_number → CF      │                     │
  │                               │ Auth_Utenti.findOne(           │                     │
  │                               │   username=CF.toUpperCase(),   │                     │
  │                               │   ambito=requested)            │                     │
  │                               │ verifica attivo + scopi        │                     │
  │                               │ JwtService.generateToken(...)  │                     │
  │ 302 Location: redirect_uri?asp_token=<JWT>&expireDate=...      │                     │
  │◄──────────────────────────────┤                                │                     │
```

### Errori → redirect alla `redirect_uri` con `?error=<code>&error_description=<msg>`

Codici di errore (sempre HTTP 302 verso `redirect_uri`, mai 5xx visibili al cittadino):

| `error` | Significato | HTTP interno log |
|---|---|---|
| `invalid_redirect_uri` | redirect_uri non in whitelist | 400 |
| `invalid_request` | querystring malformata | 400 |
| `state_invalid` | state mancante/scaduto/firma errata | 400 |
| `kc_token_exchange_failed` | scambio code→token con KC fallito | 502 |
| `kc_id_token_invalid` | firma/iss/aud/exp del id_token non valide | 401 |
| `cf_missing` | id_token senza claim `fiscal_number` | 401 |
| `user_not_found` | nessun `Auth_Utenti` con username=CF e ambito | 403 |
| `user_inactive` | utente disattivato | 403 |
| `ambito_invalid` | ambito richiesto non esiste | 400 |
| `scope_unauthorized` | almeno uno degli scopi richiesti non è attivo per l'utente | 403 |
| `spid_<n>` | errore SPID AGID (codici 19-25, 8-18, 26-30) | 4xx |

Quando `redirect_uri` non è validabile (es. errore prima della validazione), rispondere con una **pagina HTML interna** che mostra l'errore (riusare lo stesso stile di `keykloak-test-auth/server.js` `/error`).

---

## 4. Configurazione Keycloak (GIÀ FATTA — solo verifica)

Il client Keycloak è **già stato creato** sul realm `asp` di `https://login.asp.messina.it`. Riassunto della configurazione effettiva (verificare via console admin → Clients → `asp-ws-spid` se serve):

| Parametro | Valore reale |
|---|---|
| Realm | `asp` |
| Client ID | `asp-ws-spid` |
| Name | `ASP Web Services - SPID Login` |
| Description | `Client OIDC confidential per il backend asp-ws: avvia il flow SPID server-side via Keycloak ed emette il JWT proprietario del WS\|server\|Backend\|spid` |
| Protocol | OpenID Connect |
| Client authentication | **ON** (confidential) |
| Authorization | OFF |
| Standard flow | ON (Authorization Code) |
| Direct access grants / Implicit / Service accounts / Device / CIBA | OFF |
| PKCE | non impostato (= disabilitato) |
| Root URL | `https://ws1.asp.messina.it/api/v1` |
| Home URL | vuoto |
| Valid redirect URIs | `https://ws1.asp.messina.it/api/v1/login/spid/callback` |
| Valid post logout redirect URIs | vuoto (logout fuori scope) |
| Web origins | `+` |
| Default Client Scopes | `acr`, `basic`, `email`, `profile`, `roles`, `web-origins`, `**spid-cie-attributes**`, `asp-ws-spid-dedicated` |
| Client secret | **disponibile in tab "Credentials"** — già copiato in `config/custom/private_spid_login.json` da Roberto (placeholder `INCOLLA_QUI_...`). |

### 4.1 Claim disponibili dallo scope `spid-cie-attributes`

Lo scope realm-level `spid-cie-attributes` (già configurato dal team Keycloak per gli altri client) contiene 21 mapper User Attribute che propagano gli attributi SPID/CIE come claim OIDC. **Importante**: i nomi dei claim sono in **camelCase**, non snake_case. Per il login asp-ws ci interessa principalmente:

| User Attribute (Keycloak) | Token Claim Name | Note |
|---|---|---|
| `spid-fiscalNumber` | **`fiscalNumber`** | Codice fiscale (claim usato per il match utente) |
| `given_name` (built-in) | `given_name` | Nome |
| `family_name` (built-in) | `family_name` | Cognome |
| `email` (scope `email`) | `email` | Email (se presente in SPID) |

Tutti i mapper hanno `Add to ID token`, `Add to access token`, `Add to userinfo` = **ON**.

### 4.2 Verifica veloce

Da CLI:
```bash
curl -sS https://login.asp.messina.it/realms/asp/.well-known/openid-configuration \
  | jq '.authorization_endpoint, .token_endpoint, .jwks_uri, .issuer'
```
Output atteso:
```
"https://login.asp.messina.it/realms/asp/protocol/openid-connect/auth"
"https://login.asp.messina.it/realms/asp/protocol/openid-connect/token"
"https://login.asp.messina.it/realms/asp/protocol/openid-connect/certs"
"https://login.asp.messina.it/realms/asp"
```

### 4.2 Verifica che il client funzioni

Da CLI sul tuo Mac:
```bash
curl -sS https://login.asp.messina.it/realms/asp/.well-known/openid-configuration | jq '.authorization_endpoint, .token_endpoint, .jwks_uri, .issuer'
```
Deve restituire:
```
"https://login.asp.messina.it/realms/asp/protocol/openid-connect/auth"
"https://login.asp.messina.it/realms/asp/protocol/openid-connect/token"
"https://login.asp.messina.it/realms/asp/protocol/openid-connect/certs"
"https://login.asp.messina.it/realms/asp"
```

---

## 5. Modifiche al codice asp-ws

### 5.1 Dipendenze npm

Aggiungere a `package.json`:
```json
"openid-client": "^5.7.0",
"jwks-rsa": "^3.1.0"
```

(`openid-client` v5: API stabile, già usata da `keykloak-test-auth`. Non passare a v6 in questa iterazione: l'API cambia.)

### 5.2 Configurazione (GIÀ CREATA)

I file sono già presenti nel repo:

- `config/custom/example_private_spid_login.json` — committabile, contiene placeholder.
- `config/custom/private_spid_login.json` — gitignored (regola `private_*.json` in `.gitignore`), già pre-popolato con tutti i valori tranne `kcClientSecret` (che Roberto incolla manualmente dalla tab Credentials del client Keycloak `asp-ws-spid`).

Schema dei campi:

```json
{
  "kcIssuer": "https://login.asp.messina.it/realms/asp",
  "kcClientId": "asp-ws-spid",
  "kcClientSecret": "<INCOLLA_DAL_PANNELLO_KEYCLOAK>",
  "kcScopes": "openid profile email spid-cie-attributes",
  "wsBaseUrl": "https://ws1.asp.messina.it/api/v1",
  "callbackPath": "/login/spid/callback",
  "stateSecret": "<32+ caratteri random per HMAC dello state>",
  "stateTtlSeconds": 600,
  "allowedRedirectUris": [
    "https://ws1.asp.messina.it/api/v1/login/spid/debug"
  ],
  "defaultAmbito": "api",
  "tokenQueryParamName": "asp_token",
  "fiscalNumberClaim": "fiscalNumber"
}
```

Note:
- `fiscalNumberClaim` è il nome del claim nel token id_token/access_token/userinfo. Il valore corretto per questo realm è **`fiscalNumber`** (camelCase), confermato dal mapper esistente sullo scope `spid-cie-attributes`.
- `allowedRedirectUris` ora contiene solo l'URI di debug usato in fase di test. Aggiungere a mano gli URI di produzione dei consumer quando saranno definiti.

Estendere `config/custom.js` per leggere il file:

```js
let spidLogin = {};
try {
  spidLogin = require('./custom/private_spid_login.json');
} catch (e) {
  sails.log && sails.log.warn('SPID login config non presente — endpoint /login/spid/* disabilitati');
}
module.exports = {
  custom: {
    // ... config esistente ...
    spidLogin
  }
};
```

### 5.3 File nuovi da creare

| File | Scopo |
|---|---|
| `api/services/SpidOidcService.js` | Wrapper attorno a `openid-client`: discovery (lazy + cache), generazione URL `authorize`, scambio code→tokenSet, verifica id_token. |
| `api/services/SpidStateService.js` | Encode/decode dello `state` HMAC-firmato. |
| `api/controllers/login/spid/start.js` | Action Sails: GET di avvio del flow OIDC. |
| `api/controllers/login/spid/callback.js` | Action Sails: GET callback da Keycloak. |
| `api/controllers/login/spid/error-page.js` | (opzionale) HTML di errore quando `redirect_uri` non è risolvibile. |

### 5.4 File da modificare

| File | Modifica |
|---|---|
| `config/routes.js` | Aggiungere `'GET /api/v1/login/spid/start'` e `'GET /api/v1/login/spid/callback'`, **senza** `minAuthLevel` (sono endpoint di autenticazione). |
| `config/custom.js` | Sezione `spidLogin` come da §5.2. |
| `package.json` | `openid-client`, `jwks-rsa`. |
| `docs/auth/keycloak-spid.md` | Aggiungere una sezione "Flow server-side (SPID-only, prima fase)" che linki a questo documento e dichiari che il match utente è `username = CF.toUpperCase()`. |
| `docs/_sidebar.md` | Voce nuova "SPID server-side login" sotto la sezione Auth. |

### 5.5 `SpidStateService` — algoritmo

```
encode({ scopi, ambito, redirect_uri, idp?, nonce })
  payload = base64url(JSON.stringify({ scopi, ambito, redirect_uri, idp, nonce, exp: now + ttl }))
  sig     = base64url(hmacSha256(stateSecret, payload))
  return payload + '.' + sig

decode(state)
  [payload, sig] = state.split('.')
  if (!sig || !timingSafeEqual(sig, hmacSha256(stateSecret, payload))) throw 'state_invalid'
  data = JSON.parse(base64urlDecode(payload))
  if (data.exp < now) throw 'state_invalid'
  return data
```

Lo state contiene tutto ciò che serve al callback per non dover usare la sessione (asp-ws è stateless).

### 5.6bis Estensione `JwtService.generateToken`

Oggi `api/services/JwtService.js` accetta `{ username, scopi, ambito, id_ambito, livello }`. Va esteso per propagare un eventuale `auth_method` opzionale **senza rompere i chiamanti esistenti**:

```js
generateToken: (userData) => {
  const payload = {
    username: userData.username,
    scopi: userData.scopi,
    ambito: userData.ambito,
    livello: userData.livello,
    id_ambito: userData.id_ambito,
    ...(userData.auth_method ? { auth_method: userData.auth_method } : {})
  };
  // ... resto invariato
}
```

`verificaPermessi` non deve cambiare: `auth_method` è informativo, non vincolante.

### 5.6 `SpidOidcService` — algoritmo

- `getClient()`: discovery una sola volta (cache in modulo). Issuer = `kcIssuer`. Client = `new issuer.Client({ client_id, client_secret, redirect_uris: [wsBaseUrl + callbackPath], response_types: ['code'], token_endpoint_auth_method: 'client_secret_post' })`.
- `buildAuthorizeUrl({ state, idp? })`:
  ```js
  client.authorizationUrl({
    scope: kcScopes,
    state,
    redirect_uri: wsBaseUrl + callbackPath,
    ...(idp ? { kc_idp_hint: idp } : {})
  })
  ```
- `exchangeCode({ code, state })`:
  ```js
  const tokenSet = await client.callback(
    wsBaseUrl + callbackPath,
    { code, state },
    { state }
  );
  return tokenSet;
  ```
- `extractFiscalNumber(tokenSet)`: legge `tokenSet.claims()[config.fiscalNumberClaim]` (default `fiscalNumber`). Fallback: decode dell'access_token e ricerca dello stesso claim. Fallback ulteriore: chiamata a `userinfo()`. **Attenzione**: il claim è camelCase `fiscalNumber`, NON snake_case `fiscal_number` — il mapper Keycloak su questo realm produce camelCase.

### 5.7 `start.js` — algoritmo

```js
inputs:
  scopi:       string, required, space-separated
  ambito:      string, optional (default = config.defaultAmbito)
  redirect_uri: string, required
  idp:         string, optional (es. "spid-aruba", "cieid")

flusso:
  1. controlla che spidLogin sia configurato (else 503)
  2. valida redirect_uri (deve esistere strict-equal in allowedRedirectUris)
  3. genera nonce random 32B
  4. state = SpidStateService.encode({scopi, ambito, redirect_uri, idp, nonce})
  5. url = SpidOidcService.buildAuthorizeUrl({state, idp})
  6. res.redirect(302, url)

errori:
  - redirect_uri non whitelisted → 400 JSON {error: "invalid_redirect_uri"} (NON redirect)
  - input mancanti               → 400 JSON {error: "invalid_request"}
```

### 5.8 `callback.js` — algoritmo

```js
flusso:
  1. legge code, state, error, error_description dalla query
  2. se error → mappa in spid_<n> con la stessa logica di keykloak-test-auth/detectSpidError
     e redirect a state.redirect_uri (se decodificabile) altrimenti pagina HTML errore
  3. SpidStateService.decode(state) → { scopi, ambito, redirect_uri, idp }
  4. tokenSet = await SpidOidcService.exchangeCode({code, state})
  5. cf = SpidOidcService.extractFiscalNumber(tokenSet)
     se manca → redirect_uri?error=cf_missing
  6. cfUpper = cf.toUpperCase().trim()
  7. ambitoRecord = await Auth_Ambiti.findOne({ambito: ambito || config.defaultAmbito})
     se null → redirect_uri?error=ambito_invalid
  8. utente = await Auth_Utenti.findOne({
       username: cfUpper,
       ambito: ambitoRecord.id
     }).populate('scopi').populate('ambito')
     se null → redirect_uri?error=user_not_found
     se !utente.attivo → redirect_uri?error=user_inactive
  9. scopiRichiesti = scopi.split(' ').filter(Boolean)
     scopiAttivi = utente.scopi.filter(s => s.attivo).map(s => s.scopo)
     se !scopiRichiesti.every(s => scopiAttivi.includes(s)) → redirect_uri?error=scope_unauthorized
 10. tokenObj = JwtService.generateToken({
       username: utente.username,
       scopi: scopiRichiesti,
       ambito: utente.ambito.ambito,
       id_ambito: utente.ambito.id,
       livello: utente.livello,
       auth_method: 'spid'                    // unico claim extra rispetto a /get-token
     })
     // Nota: JwtService.generateToken oggi NON propaga auth_method — va esteso (vedi §5.7bis).
 11. log con tag LOGIN_SPID (vedi §5.9) e incremento counter Prometheus (vedi §5.11)
 12. url = redirect_uri + (redirect_uri.includes('?') ? '&' : '?')
         + 'asp_token=' + encodeURIComponent(tokenObj.token)
         + '&expireDate=' + encodeURIComponent(tokenObj.expireDate)
     res.redirect(302, url)
```

### 5.9 Logging

Aggiungere costante `LOGIN_SPID` a `api/helpers/log.js` (o al dizionario tag esistente). Loggare:
- richiesta start: `{ ip, scopi, ambito, redirect_uri }`
- esito callback: `{ ip, cf: cfUpper, username: utente?.username, ambito, scopi, esito: 'OK'|'<error_code>' }`

Mai loggare: id_token, access_token, JWT proprietario emesso, client_secret.

### 5.11 Metriche Prometheus

In `api/services/MetricsService.js` aggiungere un counter:

```js
const spidLoginTotal = new client.Counter({
  name: 'asp_spid_login_total',
  help: 'Numero login SPID server-side per esito',
  labelNames: ['outcome'],
  registers: [register]
});
```

Il `callback.js` chiama `spidLoginTotal.inc({ outcome })` con uno fra:
`ok`, `state_invalid`, `kc_token_exchange_failed`, `kc_id_token_invalid`,
`cf_missing`, `ambito_invalid`, `user_not_found`, `user_inactive`,
`scope_unauthorized`, `spid_<n>` (collassare gli SPID errors in un'unica label `spid_user_error` per evitare cardinalità alta).

Aggiornare `docs/monitoring/metrics.md` documentando il nuovo counter e suggerire al Roberto un pannello Grafana che mostri il rate per outcome.

### 5.10 Sicurezza — checklist

- `redirect_uri` validato in lista esatta (no wildcard, no startsWith) **prima** di emettere il redirect a Keycloak.
- `state` HMAC-firmato + scaduto in 10 minuti.
- `client_secret` solo in `private_spid_login.json` (gitignored). Mai in log, mai nel JSON di risposta.
- Verifica id_token: `openid-client.callback()` la fa già (firma RS256 via JWKS auto-cached, iss, aud=client_id, exp, nonce). Verificare l'opzione di TTL sulla cache JWKS (default OK).
- Tutti gli output di errore vanno **alla redirect_uri** (mai stack trace al cittadino).
- Rate limiting: aggiungere policy esistente di rate limit (vedi `api/helpers/check-submission-rate-limit.js` come pattern).
- HTTPS enforced: `wsBaseUrl` e tutti i `redirect_uri` devono iniziare con `https://` in produzione (consentire `http://localhost` solo se `process.env.NODE_ENV !== 'production'`).
- L'utente deve essere creato manualmente in `Auth_Utenti` con `username = CF in uppercase` e l'ambito desiderato. Se vuoi automatizzare il provisioning, NON farlo in questa iterazione: aprire issue separata.
- **PKCE non viene attivato** in questa iterazione: con client confidential e secret server-side è ridondante. Da rivalutare se in futuro si introdurrà un client public per una SPA.

---

## 6. Test

### 6.1 Unit test (creare `test/spid/state-service.test.js`)
- encode/decode round-trip preserva i campi
- state scaduto fallisce con 'state_invalid'
- state firmato con secret diverso fallisce
- alterazione del payload invalidando la firma fallisce

### 6.2 Test manuali end-to-end
1. Creare in MySQL `auth.utenti` un utente di test con `username = '<CF tester maiuscolo>'`, `ambito = id ambito 'api'`, `livello = id livello user`, `attivo = 1`, e assegnarli almeno uno scopo attivo (es. `cambio-medico`) tramite `auth.utentiScopi`.
2. Configurare `private_spid_login.json` con secret KC e una `redirect_uri` di test, es. `https://ws1.asp.messina.it/api/v1/login/spid/debug`. Aggiungere temporaneamente in `routes.js` un'action di debug che riceve `?asp_token=...` e mostra il decode del JWT.
3. Browser: `https://ws1.asp.messina.it/api/v1/login/spid/start?scopi=cambio-medico&ambito=api&redirect_uri=https%3A%2F%2Fws1.asp.messina.it%2Fapi%2Fv1%2Flogin%2Fspid%2Fdebug`
4. Login con SPID di test (validatore AGID `spid-saml-check` o `spid-validator`, oppure SPID Aruba sandbox).
5. Verificare:
   - redirect finale a `.../debug?asp_token=...&expireDate=...`
   - chiamando `POST /api/v1/login/verify-token` con il token, ritorna `valid:true`, `username = CF`, `scopi = ["cambio-medico"]`, `ambito = "api"`.
   - chiamando una rotta protetta (es. `POST /api/v1/cambio-medico/get-medici`) con `Authorization: Bearer <asp_token>`, risponde 200.
6. Casi negativi:
   - utente con `attivo=0` → `redirect_uri?error=user_inactive`
   - scopo non assegnato → `redirect_uri?error=scope_unauthorized`
   - `redirect_uri` non whitelistato → 400 JSON
   - tentativo di replay del `code` → KC risponde con errore, asp-ws → `kc_token_exchange_failed`

### 6.3 Verifica no-regression
- `POST /api/v1/login/get-token` continua a funzionare con un utente "tradizionale" (username + password + OTP).

---

## 7. Deploy

asp-ws è deployato su `ws1.asp.messina.it` (gestito da Roberto). Il deploy non è coperto da questo prompt: limitarsi a scrivere il codice, lasciare per ultimo un commit pulito. Su `192.168.250.78` (server Keycloak `aspme`) **non bisogna toccare** nulla, le modifiche KC sono solo via console admin (§4).

---

## 8. Vincoli generali

- **Linguaggio risposta utente: italiano.** Commenti nel codice in italiano.
- **Stack: Node.js + Sails.** Niente porting a TypeScript, niente sostituzione del framework, niente mongo/postgres.
- **Open source / stabile**: usare solo pacchetti maturi e ben mantenuti (`openid-client` v5 e `jsonwebtoken` sono già in famiglia). Non introdurre `@panva/openid-client` v6 in questa iterazione.
- **In dubbio, chiedere a Roberto** prima di prendere decisioni che esulano da questo prompt (es. cambio di schema DB, refresh token, single logout).
- **Non modificare** i controller esistenti `get-token.js`, `verify-token.js`, `JwtService.js`. Solo aggiungere.
- **Non committare** `config/custom/private_*.json`. Sono già in `.gitignore` per convenzione, verificare.
- **Lint**: il progetto usa ESLint 5.16, eseguire `npm run lint` prima di chiudere.
- **Documentazione**: aggiornare `docs/auth/keycloak-spid.md` con un paragrafo introduttivo "**Flow server-side (questa iterazione)**" che linka a questo file e specifica il match `username=CF`.

---

## 9. Riferimenti

- Codice esistente come ispirazione del flow OIDC: `/Users/deduzzo/dev/keycloak/keykloak-test-auth/server.js` (specialmente `initOIDC()`, `/login`, `/callback`, mappa `SPID_ERRORS`, `detectSpidError`).
- Doc design preesistente (frontend-driven, NON questa iterazione): `docs/auth/keycloak-spid.md`.
- Modelli rilevanti: `api/models/Auth_Utenti.js`, `api/models/Auth_Ambiti.js`, `api/models/Auth_Scopi.js`, `api/models/Auth_UtentiScopi.js`.
- Service JWT: `api/services/JwtService.js`.
- Controller di login esistente: `api/controllers/login/get-token.js`.
- Routes: `config/routes.js` (in particolare il pattern di registrazione delle action sotto `/api/v1/login/*`).
- Spec OIDC: <https://openid.net/specs/openid-connect-core-1_0.html>
- Mapper SPID Keycloak provider: <https://github.com/italia/spid-keycloak-provider>

---

## 10. Definition of done

- [x] **Client Keycloak `asp-ws-spid` già creato** sul realm `asp` con scope `spid-cie-attributes` (Default), mapper `fiscalNumber` (ereditato dallo scope), redirect URI `https://ws1.asp.messina.it/api/v1/login/spid/callback`, Web origins `+`, confidential.
- [ ] Roberto deve incollare il `client_secret` dalla tab Credentials nel campo `kcClientSecret` di `config/custom/private_spid_login.json`.
- [ ] `package.json` aggiornato con `openid-client` e `jwks-rsa`, `npm install` eseguito.
- [ ] `SpidOidcService` e `SpidStateService` creati con unit test green.
- [ ] `start.js` e `callback.js` creati, registrati in `config/routes.js`.
- [ ] `config/custom.js` legge `private_spid_login.json` (con esempio `example_private_spid_login.json` committato).
- [ ] Logging tag `LOGIN_SPID` operativo in `api/helpers/log.js`.
- [ ] Counter Prometheus `asp_spid_login_total{outcome}` aggiunto a `MetricsService` e documentato in `docs/monitoring/metrics.md`.
- [ ] `JwtService.generateToken` esteso per propagare `auth_method` opzionale senza regressioni sui chiamanti esistenti.
- [ ] Test manuale end-to-end con SPID di test passa (utente con CF in uppercase, scopo attivo, ambito esistente).
- [ ] `POST /api/v1/login/get-token` non subisce regressioni.
- [ ] `npm run lint` pulito.
- [ ] `docs/auth/keycloak-spid.md` aggiornato con paragrafo "Flow server-side".
- [ ] Nessun secret loggato, nessun secret committato.
