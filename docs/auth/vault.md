# User Vault - Gestione Credenziali Esterne Sicure

## Obiettivo

Permettere agli utenti di memorizzare credenziali (username/password) per servizi esterni (portali regionali, Sistema TS, ecc.) in modo che:

1. **Il server da solo non puo decifrarle** (niente chiavi in env vars o DB)
2. **Il database da solo e inutile** (tutto cifrato)
3. **Solo l'utente** (con il suo PIN) + il server (con il suo secret) + il DB (con i blob) **insieme** possono accedere ai dati

## Modello di sicurezza: 3 fattori

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   Per decifrare un segreto servono TUTTI E TRE:                   ║
║                                                                   ║
║   1. PIN utente        → conosciuto solo dall'utente              ║
║   2. Server Secret     → env var sul server, mai nel DB           ║
║   3. Blob cifrato      → nel database                             ║
║                                                                   ║
║   Compromesso uno qualsiasi → dati al sicuro                      ║
║   Compromessi due su tre    → dati al sicuro                      ║
║   Servono tutti e tre       → decifratura possibile               ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Scenari di attacco

| Scenario | Risultato |
|----------|-----------|
| Rubano il DB (SQL injection, backup, dipendente infedele) | Solo blob cifrati, inutili |
| Rubano il server (accesso SSH, env vars) | Hanno il server secret ma non i PIN utente ne il DB |
| Rubano DB + server | Devono fare brute force sui PIN, ma PBKDF2 310k iterazioni rende costoso |
| Rubano DB senza server | **Impossibile decifrare** anche con brute force (manca il server secret) |
| Admin/superadmin | Non puo decifrare i segreti degli altri utenti |
| Password AD compromessa | Accesso JWT ma NON ai segreti (serve il PIN) |
| Password AD cambiata | Nessun impatto sul vault (PIN indipendente) |

## Architettura

### Separazione login vs vault

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│   Password AD/LDAP  →  solo per LOGIN                  │
│                        autenticazione Active Directory  │
│                        Sails non la memorizza           │
│                                                        │
│   PIN Vault         →  solo per CIFRATURA              │
│                        gestito internamente da Sails    │
│                        indipendente da AD               │
│                        l'utente lo sceglie al setup     │
│                                                        │
│   Sono DUE segreti completamente separati.             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Doppio livello di cifratura

```
PIN utente + Server Secret
        │
        ▼  PBKDF2 + HKDF
   User Key (derivata, esiste solo in RAM durante la richiesta)
        │
        │  decifra ──►  Vault Key (random, unica per utente)
        │               generata una volta al setup
        │
        │               Vault Key decifra ──►  Segreti utente
        │                                      (credenziali servizi)
        │
        ▼
   User Key buttata dalla RAM
```

**Perche due livelli?** Quando l'utente cambia PIN, si ri-cifra solo la Vault Key (un'operazione). Se si cifrassero i segreti direttamente col PIN, al cambio PIN andrebbe ri-cifrato tutto.

### Derivazione chiave

```
PIN (6+ cifre)                    VAULT_SERVER_SECRET (256 bit, env var)
      │                                    │
      ▼                                    │
  PBKDF2(pin, salt, 310000, sha256)        │
      │                                    │
      └──────────────┬────────────────────┘
                     ▼
              HKDF(pin_key + server_secret,
                   salt,
                   context: "asp-messina-vault-v1",
                   256 bit)
                     │
                     ▼
               User Key finale
```

- **PBKDF2** (310k iterazioni): rende il brute force del PIN molto costoso
- **HKDF**: combina crittograficamente PIN derivato + server secret
- **Contesto applicativo**: previene riutilizzo chiavi cross-applicazione

### Algoritmo di cifratura

**AES-256-GCM** per tutte le operazioni di cifratura:
- 256 bit di chiave
- IV random di 12 byte per ogni cifratura (stessa password → output diverso)
- Authentication Tag: rileva manomissioni del ciphertext
- Formato storage: `iv_hex:tag_hex:ciphertext_hex`

## Schema Database

### Tabella `user_vault` (database: `auth`)

Contiene la Vault Key cifrata e i parametri di derivazione, una riga per utente.

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| id | INT PK AUTO_INCREMENT | |
| utente_id | INT UNIQUE NOT NULL | FK verso Auth_Utenti |
| encrypted_vault_key | TEXT NOT NULL | Vault Key cifrata con User Key (AES-256-GCM) |
| encrypted_vault_key_recovery | TEXT | Vault Key cifrata con Recovery Key |
| salt | VARCHAR(128) NOT NULL | Salt per PBKDF2 (random 32 byte, hex) |
| pin_hash | VARCHAR(255) NOT NULL | Hash Argon2 del PIN per verifica rapida |
| recovery_key_hash | VARCHAR(255) | Hash Argon2 della Recovery Key |
| createdAt | DATETIME | |
| updatedAt | DATETIME | |

### Tabella `user_secrets` (database: `auth`)

Contiene le credenziali cifrate, una riga per utente/servizio.

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| id | INT PK AUTO_INCREMENT | |
| utente_id | INT NOT NULL | FK verso Auth_Utenti |
| servizio | VARCHAR(100) NOT NULL | Identificativo servizio (es. "portale_regione") |
| label | VARCHAR(255) | Nome leggibile del servizio |
| encrypted_data | TEXT NOT NULL | JSON cifrato: `{username, password, note}` |
| createdAt | DATETIME | |
| updatedAt | DATETIME | |
| **UNIQUE** | (utente_id, servizio) | |

### Migrazione SQL

```sql
-- database: auth

CREATE TABLE IF NOT EXISTS user_vault (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utente_id INT NOT NULL,
    encrypted_vault_key TEXT NOT NULL,
    encrypted_vault_key_recovery TEXT NULL,
    salt VARCHAR(128) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    recovery_key_hash VARCHAR(255) NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_vault_utente (utente_id)
);

CREATE TABLE IF NOT EXISTS user_secrets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utente_id INT NOT NULL,
    servizio VARCHAR(100) NOT NULL,
    label VARCHAR(255) NULL,
    encrypted_data TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_utente_servizio (utente_id, servizio)
);
```

## Componenti da implementare

### 1. Configurazione

**File**: `config/custom.js`

```javascript
vaultServerSecret: process.env.VAULT_SERVER_SECRET,  // 256 bit hex
```

**Generazione** (una volta, al deploy):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **ATTENZIONE**: se si perde il `VAULT_SERVER_SECRET`, TUTTI i vault diventano irrecuperabili. Va incluso nel backup sicuro delle credenziali di sistema.

### 2. Helpers crittografici

#### `api/helpers/vault-derive-key.js`

Deriva la User Key finale da PIN + salt + server secret.

```
Input:  pin (string), salt (Buffer)
Usa:    sails.config.custom.vaultServerSecret
Output: Buffer 32 byte (User Key)

Algoritmo:
1. pinKey = PBKDF2(pin, salt, 310000 iterazioni, 32 byte, SHA-256)
2. ikm = concat(pinKey, serverSecret)
3. finalKey = HKDF(SHA-256, ikm, salt, "asp-messina-vault-v1", 32 byte)
4. return finalKey
```

#### `api/helpers/vault-encrypt.js`

Cifra un testo con una chiave AES-256-GCM.

```
Input:  text (string), key (Buffer 32 byte)
Output: string formato "iv_hex:tag_hex:ciphertext_hex"

Algoritmo:
1. iv = randomBytes(12)
2. cipher = createCipheriv('aes-256-gcm', key, iv)
3. encrypted = cipher.update(text) + cipher.final()
4. tag = cipher.getAuthTag()
5. return iv:tag:encrypted (tutto hex)
```

#### `api/helpers/vault-decrypt.js`

Decifra un blob AES-256-GCM.

```
Input:  encrypted (string "iv:tag:ciphertext"), key (Buffer 32 byte)
Output: string in chiaro

Algoritmo:
1. split su ":"
2. decipher = createDecipheriv('aes-256-gcm', key, iv)
3. decipher.setAuthTag(tag)
4. return decipher.update(ciphertext) + decipher.final()
```

### 3. Modelli Sails

#### `api/models/Auth_UserVault.js`

```javascript
{
  tableName: 'user_vault',
  datastore: 'auth',
  attributes: {
    utente_id:                    { type: 'number', required: true, unique: true },
    encrypted_vault_key:          { type: 'string', required: true },
    encrypted_vault_key_recovery: { type: 'string', allowNull: true },
    salt:                         { type: 'string', required: true },
    pin_hash:                     { type: 'string', required: true },
    recovery_key_hash:            { type: 'string', allowNull: true }
  }
}
```

#### `api/models/Auth_UserSecrets.js`

```javascript
{
  tableName: 'user_secrets',
  datastore: 'auth',
  attributes: {
    utente_id:      { type: 'number', required: true },
    servizio:       { type: 'string', required: true, maxLength: 100 },
    label:          { type: 'string', allowNull: true },
    encrypted_data: { type: 'string', required: true }
  }
}
```

### 4. Scope di accesso

| Scope | Descrizione |
|-------|-------------|
| `vault-manage` | Gestione del proprio vault (setup, cambio PIN, recovery) |
| `vault-secrets` | Lettura/scrittura dei propri segreti |

Nota: ogni utente puo accedere **solo** ai propri segreti. Lo scope abilita la funzionalita, il filtro `utente_id` garantisce l'isolamento.

### 5. API Endpoints

Tutti protetti da JWT + scope. Ogni endpoint richiede il PIN (eccetto setup e recovery).

#### Gestione Vault

| Metodo | Rotta | Azione | Note |
|--------|-------|--------|------|
| POST | `/api/v1/vault/setup` | Crea vault per l'utente | Richiede: `pin`, `pin_conferma`. Ritorna: `recovery_key` |
| POST | `/api/v1/vault/verify-pin` | Verifica PIN corretto | Richiede: `pin`. Utile per UI |
| PUT | `/api/v1/vault/change-pin` | Cambia PIN | Richiede: `old_pin`, `new_pin` |
| POST | `/api/v1/vault/recover` | Reset PIN con recovery key | Richiede: `recovery_key`, `new_pin` |
| GET | `/api/v1/vault/status` | Stato vault (esiste? ha recovery?) | Solo check, no PIN richiesto |

#### Gestione Segreti

| Metodo | Rotta | Azione | Note |
|--------|-------|--------|------|
| GET | `/api/v1/vault/secrets` | Lista servizi (senza dati decifrati) | Solo nomi/label, no PIN richiesto |
| POST | `/api/v1/vault/secrets` | Salva credenziali | Richiede: `pin`, `servizio`, `label`, `username`, `password` |
| POST | `/api/v1/vault/secrets/read` | Leggi credenziali decifrate | Richiede: `pin`, `servizio`. POST perche il PIN va nel body |
| PUT | `/api/v1/vault/secrets` | Aggiorna credenziali | Richiede: `pin`, `servizio`, `username`, `password` |
| DELETE | `/api/v1/vault/secrets` | Elimina credenziali | Richiede: `pin`, `servizio` |

## Flussi operativi

### Setup vault (prima volta)

```
Utente                           Sails                              DB
  │                                │                                 │
  │ POST /vault/setup              │                                 │
  │ { pin: "123456",               │                                 │
  │   pin_conferma: "123456" }     │                                 │
  │ + JWT                          │                                 │
  ├───────────────────────────────►│                                 │
  │                                │                                 │
  │                                │ 1. Verifica: vault non esiste   │
  │                                │    per questo utente             │
  │                                │                                 │
  │                                │ 2. salt = randomBytes(32)       │
  │                                │ 3. vaultKey = randomBytes(32)   │
  │                                │ 4. recoveryKey = randomBytes(16)│
  │                                │    formattata XXXX-XXXX-XXXX    │
  │                                │                                 │
  │                                │ 5. userKey = deriveKey(pin,salt)│
  │                                │ 6. encVK = encrypt(vaultKey,    │
  │                                │            userKey)             │
  │                                │                                 │
  │                                │ 7. recKey = deriveKey(          │
  │                                │            recoveryKey, salt)   │
  │                                │ 8. encVKR = encrypt(vaultKey,   │
  │                                │            recKey)              │
  │                                │                                 │
  │                                │ 9. pinHash = argon2(pin)        │
  │                                │ 10. recHash = argon2(recoveryKey)│
  │                                │                                 │
  │                                │ 11. BUTTA tutto dalla RAM       │
  │                                │                                 │
  │                                │ INSERT user_vault               │
  │                                ├────────────────────────────────►│
  │                                │                                 │
  │ { ok: true,                    │                                 │
  │   recovery_key:                │                                 │
  │   "A1B2-C3D4-E5F6-G7H8" }    │                                 │
  │◄───────────────────────────────┤                                 │
  │                                │                                 │
  │ L'utente DEVE salvare la       │                                 │
  │ recovery key in un posto       │                                 │
  │ sicuro. Non sara piu visibile. │                                 │
```

### Salvataggio credenziali

```
Utente                           Sails                              DB
  │                                │                                 │
  │ POST /vault/secrets            │                                 │
  │ { pin: "123456",               │                                 │
  │   servizio: "portale_regione", │                                 │
  │   label: "Portale Regione",    │                                 │
  │   username: "mario.rossi",     │                                 │
  │   password: "segreta123" }     │                                 │
  │ + JWT                          │                                 │
  ├───────────────────────────────►│                                 │
  │                                │                                 │
  │                                │ 1. Leggi vault dell'utente      │
  │                                │◄────────────────────────────────┤
  │                                │                                 │
  │                                │ 2. userKey = deriveKey(pin,salt)│
  │                                │ 3. vaultKey = decrypt(          │
  │                                │       encVK, userKey)           │
  │                                │                                 │
  │                                │    Se decrypt fallisce:         │
  │                                │    → PIN errato, errore 401     │
  │                                │                                 │
  │                                │ 4. data = JSON.stringify({      │
  │                                │      username, password })      │
  │                                │ 5. encData = encrypt(data,      │
  │                                │       vaultKey)                 │
  │                                │                                 │
  │                                │ 6. BUTTA userKey e vaultKey     │
  │                                │                                 │
  │                                │ INSERT/UPDATE user_secrets      │
  │                                ├────────────────────────────────►│
  │                                │                                 │
  │ { ok: true }                   │                                 │
  │◄───────────────────────────────┤                                 │
```

### Lettura credenziali

```
Utente                           Sails                              DB
  │                                │                                 │
  │ POST /vault/secrets/read       │                                 │
  │ { pin: "123456",               │                                 │
  │   servizio: "portale_regione"} │                                 │
  │ + JWT                          │                                 │
  ├───────────────────────────────►│                                 │
  │                                │                                 │
  │                                │ 1. Leggi vault + secret         │
  │                                │◄────────────────────────────────┤
  │                                │                                 │
  │                                │ 2. userKey = deriveKey(pin,salt)│
  │                                │ 3. vaultKey = decrypt(encVK,    │
  │                                │       userKey)                  │
  │                                │ 4. data = decrypt(encData,      │
  │                                │       vaultKey)                 │
  │                                │ 5. BUTTA userKey e vaultKey     │
  │                                │                                 │
  │ { ok: true,                    │                                 │
  │   data: {                      │                                 │
  │     username: "mario.rossi",   │                                 │
  │     password: "segreta123" }}  │                                 │
  │◄───────────────────────────────┤                                 │
```

### Cambio PIN

```
Utente                           Sails                              DB
  │                                │                                 │
  │ PUT /vault/change-pin          │                                 │
  │ { old_pin: "123456",           │                                 │
  │   new_pin: "654321" }          │                                 │
  │ + JWT                          │                                 │
  ├───────────────────────────────►│                                 │
  │                                │                                 │
  │                                │ 1. Leggi vault                  │
  │                                │◄────────────────────────────────┤
  │                                │                                 │
  │                                │ 2. oldUserKey = deriveKey(      │
  │                                │       old_pin, old_salt)        │
  │                                │ 3. vaultKey = decrypt(encVK,    │
  │                                │       oldUserKey)               │
  │                                │                                 │
  │                                │ 4. newSalt = randomBytes(32)    │
  │                                │ 5. newUserKey = deriveKey(      │
  │                                │       new_pin, newSalt)         │
  │                                │ 6. newEncVK = encrypt(vaultKey, │
  │                                │       newUserKey)               │
  │                                │ 7. newPinHash = argon2(new_pin) │
  │                                │                                 │
  │                                │ 8. Ri-cifra anche recovery:    │
  │                                │    (recovery key NON cambia,    │
  │                                │     ma usa il nuovo salt)       │
  │                                │    Non possibile senza recovery │
  │                                │    key → encVKR rimane col      │
  │                                │    vecchio salt (OK, ha il suo) │
  │                                │                                 │
  │                                │ 9. BUTTA tutto dalla RAM        │
  │                                │                                 │
  │                                │ UPDATE user_vault               │
  │                                ├────────────────────────────────►│
  │                                │                                 │
  │ { ok: true }                   │                                 │
  │◄───────────────────────────────┤                                 │
```

### Recovery (PIN dimenticato)

```
Utente                           Sails                              DB
  │                                │                                 │
  │ POST /vault/recover            │                                 │
  │ { recovery_key:                │                                 │
  │   "A1B2-C3D4-E5F6-G7H8",     │                                 │
  │   new_pin: "999999" }         │                                 │
  │ + JWT                          │                                 │
  ├───────────────────────────────►│                                 │
  │                                │                                 │
  │                                │ 1. Verifica hash recovery key   │
  │                                │ 2. recKey = deriveKey(          │
  │                                │       recovery_key, salt)       │
  │                                │ 3. vaultKey = decrypt(encVKR,   │
  │                                │       recKey)                   │
  │                                │                                 │
  │                                │ 4. Genera nuova recovery key    │
  │                                │ 5. Ri-cifra vaultKey con        │
  │                                │    new_pin e nuova recovery     │
  │                                │                                 │
  │                                │ UPDATE user_vault               │
  │                                ├────────────────────────────────►│
  │                                │                                 │
  │ { ok: true,                    │                                 │
  │   new_recovery_key:            │                                 │
  │   "X1Y2-Z3W4-V5U6-T7S8" }    │                                 │
  │◄───────────────────────────────┤                                 │
```

## File da creare/modificare

### Nuovi file

| File | Descrizione |
|------|-------------|
| `migrations/XXXXXXXX_001_user_vault.sql` | Crea tabelle `user_vault` e `user_secrets` |
| `api/models/Auth_UserVault.js` | Modello Sails per user_vault |
| `api/models/Auth_UserSecrets.js` | Modello Sails per user_secrets |
| `api/helpers/vault-derive-key.js` | Derivazione chiave PIN + server secret |
| `api/helpers/vault-encrypt.js` | Cifratura AES-256-GCM |
| `api/helpers/vault-decrypt.js` | Decifratura AES-256-GCM |
| `api/controllers/vault/setup.js` | Setup vault |
| `api/controllers/vault/status.js` | Stato vault |
| `api/controllers/vault/verify-pin.js` | Verifica PIN |
| `api/controllers/vault/change-pin.js` | Cambio PIN |
| `api/controllers/vault/recover.js` | Recovery con chiave |
| `api/controllers/vault/list-secrets.js` | Lista servizi |
| `api/controllers/vault/save-secret.js` | Salva credenziali |
| `api/controllers/vault/read-secret.js` | Leggi credenziali |
| `api/controllers/vault/update-secret.js` | Aggiorna credenziali |
| `api/controllers/vault/delete-secret.js` | Elimina credenziali |

### File da modificare

| File | Modifica |
|------|----------|
| `config/routes.js` | Aggiunta rotte `/api/v1/vault/*` |
| `config/custom.js` | Aggiunta `vaultServerSecret` da env var |

### Scope da creare (migrazione)

| Scope | Tipo | Descrizione |
|-------|------|-------------|
| `vault-manage` | scope | Gestione vault (setup, PIN, recovery) |
| `vault-secrets` | scope | Lettura/scrittura segreti |

## Requisiti di deploy

1. **Generare `VAULT_SERVER_SECRET`** e aggiungerlo alle env vars del server:
   ```bash
   VAULT_SERVER_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   ```

2. **Backup sicuro** del `VAULT_SERVER_SECRET`: se si perde, tutti i vault sono irrecuperabili

3. **Nessuna dipendenza esterna**: tutto usa il modulo `crypto` nativo di Node.js

## Limiti e considerazioni

### Il PIN non e una password forte
Un PIN di 6 cifre ha solo 10^6 combinazioni. La sicurezza si basa su:
- **PBKDF2 310k iterazioni**: ~0.3s per tentativo → brute force 6 cifre ≈ 3.5 giorni
- **Server secret**: senza di esso il brute force e impossibile
- **Rate limiting**: bloccare dopo N tentativi errati (da implementare)

### Raccomandazioni PIN
- Minimo 6 caratteri
- Consigliato: passphrase alfanumerica (es. "medico2026!") per sicurezza maggiore
- Non usare lo stesso PIN per piu servizi

### Recovery key persa
Se l'utente perde sia il PIN che la recovery key, i segreti sono **irrecuperabili by design**. Nessun admin puo recuperarli. L'utente dovra:
1. Eliminare il vault
2. Crearne uno nuovo
3. Re-inserire tutte le credenziali

### Rate limiting (da implementare)
- Max 5 tentativi PIN errati per finestra di 15 minuti
- Dopo 5 errori: blocco temporaneo di 30 minuti
- Log di tutti i tentativi falliti per audit
