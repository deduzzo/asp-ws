# Guida Integrazione Login e OTP — ASP Messina Web Services

## Indice

1. [Panoramica](#panoramica)
2. [Login Standard (senza OTP)](#login-standard-senza-otp)
3. [Login con OTP via Email](#login-con-otp-via-email)
4. [Login con OTP Authenticator (TOTP)](#login-con-otp-authenticator-totp)
5. [Configurazione TOTP da parte dell'utente](#configurazione-totp-da-parte-dellutente)
6. [Switch metodo OTP (mail ↔ totp)](#switch-metodo-otp)
7. [Cambio Password](#cambio-password)
8. [Verifica Token](#verifica-token)
9. [Codici di errore](#codici-di-errore)
10. [Diagrammi di flusso](#diagrammi-di-flusso)
11. [Esempi completi](#esempi-completi)

---

## Panoramica

Il sistema di autenticazione si basa su **JWT (JSON Web Token)** con supporto opzionale per **autenticazione a due fattori (2FA)** tramite:

- **OTP via Email**: un codice a 6 cifre inviato alla casella email dell'utente
- **OTP via Authenticator (TOTP)**: un codice a 6 cifre generato da un'app authenticator (Google Authenticator, Authy, Microsoft Authenticator, ecc.)

### Base URL

Tutti gli endpoint sono relativi al base URL del servizio. Esempio:

```
https://ws.asp.messina.it/api/v1/
```

### Headers comuni

Tutti gli endpoint protetti richiedono l'header `Authorization`:

```
Authorization: Bearer <token_jwt>
```

Il `Content-Type` per tutte le richieste POST è:

```
Content-Type: application/json
```

### Formato risposta standard

Tutte le risposte seguono questo formato:

```json
{
  "ok": true | false,
  "err": {
    "code": "CODICE_ERRORE",
    "msg": "Messaggio descrittivo"
  } | null,
  "data": { ... } | null
}
```

- `ok: true` → operazione riuscita, dati in `data`
- `ok: false` → errore, dettagli in `err`

---

## Login Standard (senza OTP)

Se l'utente **non ha OTP abilitato**, il login è un singolo step.

### Endpoint

```
POST /api/v1/login/get-token
```

### Parametri

| Campo      | Tipo   | Obbligatorio | Descrizione |
|------------|--------|:------------:|-------------|
| `login`    | string | Si           | Username dell'utente |
| `password` | string | Si           | Password dell'utente |
| `scopi`    | string | Si           | Scopi richiesti, separati da spazio (es. `"asp5-anagrafica"`) |
| `ambito`   | string | No           | Ambito d'utenza (default: `"generale"`) |
| `domain`   | string | No           | Dominio per login Active Directory (es. `"asp.messina.it"`) |

### Esempio richiesta

```json
{
  "login": "mario.rossi",
  "password": "MiaPassword123!",
  "scopi": "asp5-anagrafica",
  "ambito": "api"
}
```

### Risposta successo (HTTP 200)

```json
{
  "ok": true,
  "err": null,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

Il `token` JWT va conservato lato client e usato per tutte le chiamate successive nell'header `Authorization: Bearer <token>`.

---

## Login con OTP via Email

Se l'utente ha **OTP abilitato con tipo `mail`**, il login richiede **due step**.

### Step 1: Richiesta OTP

Inviare la stessa richiesta di login **senza** il campo `otp`:

```json
{
  "login": "mario.rossi",
  "password": "MiaPassword123!",
  "scopi": "asp5-anagrafica",
  "ambito": "api"
}
```

#### Risposta: OTP inviato (HTTP 200)

```json
{
  "ok": true,
  "err": null,
  "data": {
    "otpExpire": "2026-03-24 15:30:00"
  }
}
```

**Cosa significa:**
- Il sistema ha inviato un codice a 6 cifre all'email dell'utente
- `otpExpire` indica quando il codice scadrà (formato `YYYY-MM-DD HH:mm:ss`, timezone Europe/Rome)
- Il codice **scade dopo 10 minuti**
- Non si puo' richiedere un nuovo codice prima di 8 minuti dalla richiesta precedente

#### Risposta: Troppo presto per nuovo OTP (HTTP 401)

```json
{
  "ok": false,
  "err": {
    "code": "NON_AUTORIZZATO",
    "msg": "E' necessario attendere prima di richiedere un nuovo token"
  },
  "data": null
}
```

**Azione client:** mostrare messaggio all'utente di attendere prima di richiedere un nuovo codice.

### Step 2: Invio OTP

Ripetere la stessa richiesta con il campo `otp` valorizzato:

```json
{
  "login": "mario.rossi",
  "password": "MiaPassword123!",
  "scopi": "asp5-anagrafica",
  "ambito": "api",
  "otp": "482917"
}
```

#### Risposta successo (HTTP 200)

```json
{
  "ok": true,
  "err": null,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Possibili errori

| Codice | Messaggio | Causa |
|--------|-----------|-------|
| `NON_AUTORIZZATO` | Token OTP scaduto | Il codice e' scaduto (>10 min) |
| `NON_AUTORIZZATO` | Token OTP non valido | Il codice inserito non e' corretto |
| `NON_AUTORIZZATO` | Nessun OTP richiesto | Non e' stato richiesto un OTP (step 1 non eseguito) |

---

## Login con OTP Authenticator (TOTP)

Se l'utente ha **OTP abilitato con tipo `totp`**, il login richiede **due step**, ma con un flusso leggermente diverso.

### Step 1: Richiesta iniziale (senza OTP)

```json
{
  "login": "mario.rossi",
  "password": "MiaPassword123!",
  "scopi": "asp5-anagrafica",
  "ambito": "api"
}
```

#### Risposta: Richiesta codice authenticator (HTTP 200)

```json
{
  "ok": true,
  "err": null,
  "data": {
    "otpExpire": null,
    "otpType": "autenticator"
  }
}
```

**Come riconoscere il tipo OTP dalla risposta:**

| `otpExpire` | `otpType` | Tipo OTP | Azione client |
|:-----------:|:---------:|:--------:|---------------|
| data/ora    | assente   | **Email** | Mostrare campo input + countdown scadenza |
| `null`      | `"autenticator"` | **TOTP** | Mostrare campo input per codice app |

### Step 2: Invio codice dall'app authenticator

```json
{
  "login": "mario.rossi",
  "password": "MiaPassword123!",
  "scopi": "asp5-anagrafica",
  "ambito": "api",
  "otp": "384921"
}
```

Il codice e' quello generato dall'app authenticator in quel momento (valido per ~30 secondi, con tolleranza ±30s).

#### Risposta successo (HTTP 200)

```json
{
  "ok": true,
  "err": null,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Possibili errori

| Codice | Messaggio | Causa |
|--------|-----------|-------|
| `NON_AUTORIZZATO` | Codice TOTP non valido | Il codice non corrisponde o e' scaduto |
| `ERRORE_GENERICO` | TOTP non configurato per questo utente | L'utente non ha completato il setup TOTP |

---

## Configurazione TOTP da parte dell'utente

Un utente autenticato puo' configurare l'app authenticator in **due step**. Questi endpoint richiedono un token JWT valido.

### Step 1: Generazione QR Code

```
POST /api/v1/login/otp/setup
Authorization: Bearer <token>
```

Nessun body richiesto.

#### Risposta successo (HTTP 200)

```json
{
  "ok": true,
  "err": null,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgo...",
    "secret": "JBSWY3DPEHPK3PXP",
    "otpauthUrl": "otpauth://totp/ASP%20Messina:mario.rossi?secret=JBSWY3DPEHPK3PXP&issuer=ASP%20Messina"
  }
}
```

| Campo | Descrizione |
|-------|-------------|
| `qrCode` | Immagine QR code in formato data URL (base64 PNG). Puo' essere usata direttamente come `src` di un tag `<img>` |
| `secret` | Chiave segreta in formato Base32. Da mostrare come alternativa al QR per inserimento manuale nell'app |
| `otpauthUrl` | URI `otpauth://` completo. Utilizzabile per generare il QR code lato client se preferito |

**Azione client:**
1. Mostrare il QR code all'utente
2. Mostrare il `secret` come alternativa per inserimento manuale
3. Mostrare un campo input per la verifica del codice (step 2)

> **Attenzione:** Chiamare nuovamente `/otp/setup` genera un **nuovo secret** e invalida il precedente. Il QR code precedente non sara' piu' valido.

### Step 2: Verifica e attivazione

Dopo che l'utente ha scansionato il QR code nell'app authenticator, deve verificare che funzioni inserendo il codice generato:

```
POST /api/v1/login/otp/verify-setup
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "codice": "482917"
}
```

#### Risposta successo (HTTP 200)

```json
{
  "ok": true,
  "err": null,
  "data": {
    "message": "TOTP attivato con successo"
  }
}
```

Da questo momento, il login dell'utente richiederà il codice dall'app authenticator.

#### Possibili errori

| Codice | Messaggio | Causa |
|--------|-----------|-------|
| `NON_AUTORIZZATO` | Codice TOTP non valido | Il codice non corrisponde — l'utente potrebbe non aver scansionato il QR corretto |
| `ERRORE_GENERICO` | Nessun setup TOTP in corso | L'utente non ha eseguito `/otp/setup` prima |

---

## Switch metodo OTP

Un utente autenticato che ha OTP attivo puo' cambiare metodo tra `mail` e `totp`.

> **Nota:** Se l'amministratore ha impostato `otp_required = true`, l'utente **non puo' disattivare** l'OTP, ma puo' solo cambiare metodo. La disattivazione e' riservata esclusivamente all'amministratore.

### Prerequisiti per lo switch

| Da → A | Requisito |
|--------|-----------|
| mail → totp | Deve aver completato il setup TOTP (`/otp/setup` + `/otp/verify-setup`) |
| totp → mail | Deve avere un indirizzo email configurato nel profilo |

### Endpoint

```
POST /api/v1/login/otp/switch
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "nuovoTipo": "totp"
}
```

Valori ammessi per `nuovoTipo`: `"mail"`, `"totp"`

#### Risposta successo (HTTP 200)

```json
{
  "ok": true,
  "err": null,
  "data": {
    "message": "Metodo OTP cambiato a totp"
  }
}
```

#### Possibili errori

| Codice | Messaggio | Causa |
|--------|-----------|-------|
| `ERRORE_GENERICO` | OTP non è attivo per questo utente | L'OTP non è abilitato |
| `ERRORE_GENERICO` | Il metodo OTP è già impostato su ... | Già in uso il metodo richiesto |
| `ERRORE_GENERICO` | TOTP non configurato | Non ha completato setup + verify |
| `ERRORE_GENERICO` | Nessun indirizzo email configurato | Mail non disponibile per switch a mail |

---

## Cambio Password

Un utente autenticato puo' cambiare la propria password. **Non disponibile per utenti di dominio** (Active Directory).

### Endpoint

```
POST /api/v1/login/cambio-password
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "vecchiaPassword": "VecchiaPassword123!",
  "nuovaPassword": "NuovaPassword456@"
}
```

### Requisiti complessita' password

La nuova password deve rispettare **tutti** i seguenti requisiti:

- Almeno **8 caratteri**
- Almeno **1 lettera maiuscola** (A-Z)
- Almeno **1 lettera minuscola** (a-z)
- Almeno **1 numero** (0-9)
- Almeno **1 carattere speciale** (es. `!@#$%^&*()`)

#### Risposta successo (HTTP 200)

```json
{
  "ok": true,
  "err": null,
  "data": {
    "message": "Password cambiata con successo"
  }
}
```

#### Possibili errori

| Codice | Messaggio | Causa |
|--------|-----------|-------|
| `NON_AUTORIZZATO` | La password attuale non è corretta | Vecchia password errata |
| `ERRORE_GENERICO` | Il cambio password non è disponibile per utenti di dominio | Utente AD |
| `ERRORE_GENERICO` | La nuova password non rispetta i requisiti di complessità: ... | Dettaglio dei requisiti mancanti |

---

## Verifica Token

Permette di verificare la validita' di un token JWT e ottenere gli scopi abilitati dell'utente.

### Endpoint

```
POST /api/v1/login/verify-token
Content-Type: application/json
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Risposta successo (HTTP 200)

```json
{
  "ok": true,
  "err": null,
  "data": {
    "valid": true,
    "username": "mario.rossi",
    "scopi": ["asp5-anagrafica"],
    "ambito": "api",
    "livello": 1,
    "enabledScopes": ["asp5-anagrafica", "cambio-medico"]
  }
}
```

---

## Codici di errore

| Codice HTTP | Codice errore | Descrizione |
|:-----------:|---------------|-------------|
| 400 | `ERRORE_GENERICO` | Errore di validazione o logica |
| 401 | `NON_AUTORIZZATO` | Credenziali errate, token scaduto, OTP errato |
| 404 | `NON_TROVATO` | Risorsa non trovata |
| 500 | `ERRORE_DEL_SERVER` | Errore interno del server |

---

## Diagrammi di flusso

### Flusso completo di login

```
CLIENT                                    SERVER
  |                                         |
  |  POST /get-token (login + password)     |
  |---------------------------------------->|
  |                                         |
  |  [Se OTP non abilitato]                 |
  |  <-- 200 { token: "..." }              |
  |                                         |
  |  [Se OTP tipo mail]                     |
  |  <-- 200 { otpExpire: "2026-..." }     |
  |                                         |
  |  [Se OTP tipo totp]                     |
  |  <-- 200 { otpExpire: null,            |
  |            otpType: "autenticator" }    |
  |                                         |
  |  [Utente inserisce codice OTP]          |
  |                                         |
  |  POST /get-token (login + password      |
  |                   + otp)                |
  |---------------------------------------->|
  |                                         |
  |  <-- 200 { token: "..." }              |
  |                                         |
```

### Flusso setup TOTP

```
CLIENT                                    SERVER
  |                                         |
  |  POST /otp/setup                        |
  |  (Authorization: Bearer <token>)        |
  |---------------------------------------->|
  |                                         |
  |  <-- 200 { qrCode, secret }            |
  |                                         |
  |  [Utente scansiona QR con app]          |
  |  [Utente legge codice dall'app]         |
  |                                         |
  |  POST /otp/verify-setup                 |
  |  { codice: "384921" }                   |
  |---------------------------------------->|
  |                                         |
  |  <-- 200 { message: "TOTP attivato" }  |
  |                                         |
```

### Logica client per gestione risposta login

```
risposta = POST /get-token(login, password, scopi, ambito)

SE risposta.ok == true:
    SE risposta.data.token:
        → Login completato! Salvare il token.
    ALTRIMENTI SE risposta.data.otpType == "autenticator":
        → Mostrare campo input "Inserisci codice dall'app authenticator"
        → Nessun countdown (il codice si rigenera ogni 30s nell'app)
    ALTRIMENTI SE risposta.data.otpExpire:
        → Mostrare campo input "Inserisci codice OTP ricevuto via email"
        → Mostrare countdown basato su otpExpire
ALTRIMENTI:
    → Mostrare errore: risposta.err.msg
```

---

## Esempi completi

### Esempio JavaScript/Fetch

```javascript
// --- Funzione di login completa ---
async function login(username, password, scopi, ambito) {
  const BASE_URL = 'https://ws.asp.messina.it/api/v1';

  // Step 1: Invio credenziali
  const response = await fetch(`${BASE_URL}/login/get-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: username, password, scopi, ambito })
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.err.msg);
  }

  // Caso 1: Login diretto (no OTP)
  if (result.data.token) {
    return { type: 'success', token: result.data.token };
  }

  // Caso 2: OTP via Authenticator
  if (result.data.otpType === 'autenticator') {
    return { type: 'otp_totp' };
  }

  // Caso 3: OTP via Email
  if (result.data.otpExpire) {
    return { type: 'otp_mail', expire: result.data.otpExpire };
  }
}

// --- Funzione per completare login con OTP ---
async function loginWithOtp(username, password, scopi, ambito, otp) {
  const BASE_URL = 'https://ws.asp.messina.it/api/v1';

  const response = await fetch(`${BASE_URL}/login/get-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: username, password, scopi, ambito, otp })
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.err.msg);
  }

  return result.data.token;
}

// --- Esempio di utilizzo ---
async function main() {
  try {
    const step1 = await login('mario.rossi', 'Password123!', 'asp5-anagrafica', 'api');

    switch (step1.type) {
      case 'success':
        console.log('Login riuscito! Token:', step1.token);
        break;

      case 'otp_mail':
        console.log(`Codice OTP inviato via email. Scade: ${step1.expire}`);
        const codiceEmail = prompt('Inserisci codice OTP:');
        const token1 = await loginWithOtp('mario.rossi', 'Password123!', 'asp5-anagrafica', 'api', codiceEmail);
        console.log('Login riuscito! Token:', token1);
        break;

      case 'otp_totp':
        console.log('Inserisci il codice dall\'app authenticator');
        const codiceTotp = prompt('Codice:');
        const token2 = await loginWithOtp('mario.rossi', 'Password123!', 'asp5-anagrafica', 'api', codiceTotp);
        console.log('Login riuscito! Token:', token2);
        break;
    }
  } catch (error) {
    console.error('Errore login:', error.message);
  }
}
```

### Esempio Setup TOTP

```javascript
async function setupTotp(token) {
  const BASE_URL = 'https://ws.asp.messina.it/api/v1';

  // Step 1: Genera QR
  const setupRes = await fetch(`${BASE_URL}/login/otp/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  const setupResult = await setupRes.json();

  if (!setupResult.ok) {
    throw new Error(setupResult.err.msg);
  }

  // Mostra QR all'utente
  console.log('Scansiona questo QR code con la tua app authenticator');
  // In HTML: <img src="${setupResult.data.qrCode}" />
  // Alternativa manuale: setupResult.data.secret

  // Step 2: L'utente inserisce il codice dall'app
  const codice = prompt('Inserisci il codice generato dall\'app:');

  const verifyRes = await fetch(`${BASE_URL}/login/otp/verify-setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ codice })
  });

  const verifyResult = await verifyRes.json();

  if (!verifyResult.ok) {
    throw new Error(verifyResult.err.msg);
  }

  console.log('TOTP attivato con successo!');
}
```

### Esempio cURL

```bash
# Login senza OTP
curl -X POST https://ws.asp.messina.it/api/v1/login/get-token \
  -H "Content-Type: application/json" \
  -d '{"login":"mario.rossi","password":"Password123!","scopi":"asp5-anagrafica","ambito":"api"}'

# Login con OTP (step 2)
curl -X POST https://ws.asp.messina.it/api/v1/login/get-token \
  -H "Content-Type: application/json" \
  -d '{"login":"mario.rossi","password":"Password123!","scopi":"asp5-anagrafica","ambito":"api","otp":"482917"}'

# Setup TOTP
curl -X POST https://ws.asp.messina.it/api/v1/login/otp/setup \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# Verifica Setup TOTP
curl -X POST https://ws.asp.messina.it/api/v1/login/otp/verify-setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{"codice":"384921"}'

# Switch metodo OTP
curl -X POST https://ws.asp.messina.it/api/v1/login/otp/switch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{"nuovoTipo":"mail"}'

# Cambio password
curl -X POST https://ws.asp.messina.it/api/v1/login/cambio-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{"vecchiaPassword":"VecchiaPassword123!","nuovaPassword":"NuovaPassword456@"}'
```
