# Guida Extra Data Assistiti — per implementazione frontend

## Panoramica

Il sistema "Extra Data" permette di associare dati aggiuntivi strutturati a ogni assistito dell'anagrafica. I dati sono organizzati in **categorie** (es. ANAGRAFICA_CONTATTI, CLINICO_ALLERGIE) e ogni categoria definisce i propri **campi** con tipo, etichetta e validazione.

Tutto è filtrato per **scope**: l'utente vede solo le categorie per cui ha i permessi di lettura/scrittura nel proprio token JWT.

**Base URL**: `https://ws1.asp.messina.it`

**Autenticazione**: Header `Authorization: Bearer <JWT>`

**Formato risposta** (sempre):
```json
{
  "ok": true|false,
  "err": null | { "code": "ERROR_CODE", "msg": "Descrizione errore" },
  "data": { ... } | null
}
```

---

## 1. Scoprire le categorie e i campi disponibili

### `GET /api/v1/anagrafica/extra-data-categorie/summary`

Restituisce le categorie attive con la struttura completa dei campi. Funziona in **modalità duale**:

- **Senza token** (pubblico): restituisce **tutte** le categorie attive con `canWrite: null`
- **Con token** (autenticato): restituisce solo le categorie per cui l'utente ha scope di lettura, con `canWrite: true/false`

**Autenticazione**: opzionale (header `Authorization: Bearer <JWT>`)

**Risposta**:
```json
{
  "ok": true,
  "data": {
    "categorie": {
      "ANAGRAFICA_CONTATTI": {
        "descrizione": "Recapiti del paziente (telefoni, email, PEC)",
        "scopoLettura": "anagrafica_contatti-read",
        "scopoScrittura": "anagrafica_contatti-write",
        "canWrite": true,
        "campi": [
          {
            "chiave": "cellulare_privato",
            "tipo": "string",
            "obbligatorio": false,
            "etichetta": "Cellulare privato",
            "note": "Numero di cellulare personale",
            "esempio": "3331234567",
            "schema": null
          },
          {
            "chiave": "email",
            "tipo": "string",
            "obbligatorio": false,
            "etichetta": "Email",
            "note": "Indirizzo email personale",
            "esempio": "mario.rossi@email.it",
            "schema": null
          }
        ]
      },
      "CLINICO_ALLERGIE": {
        "descrizione": "Allergie del paziente",
        "scopoLettura": "clinico_allergie-read",
        "scopoScrittura": "clinico_allergie-write",
        "canWrite": false,
        "campi": [
          {
            "chiave": "allergie",
            "tipo": "json",
            "obbligatorio": false,
            "etichetta": "Allergie",
            "note": "Lista delle allergie",
            "esempio": null,
            "schema": { "fields": [{"key": "sostanza", "type": "string"}, {"key": "tipo", "type": "string"}] }
          }
        ]
      }
    },
    "gruppi": {
      "anagrafica": {
        "descrizione": "Tutti i dati anagrafici",
        "scopoLettura": "anagrafica_*-read",
        "scopoScrittura": "anagrafica_*-write",
        "categorie": ["ANAGRAFICA_CONTATTI", "ANAGRAFICA_CONTATTI_EMERGENZA", "ANAGRAFICA_EXTRA", "ANAGRAFICA_NOTE"]
      },
      "clinico": {
        "descrizione": "Tutti i dati clinici",
        "scopoLettura": "clinico_*-read",
        "scopoScrittura": "clinico_*-write",
        "categorie": ["CLINICO_ALLERGIE", "CLINICO_CONSENSI", "CLINICO_ESENZIONI", "CLINICO_PARAMETRI_VITALI", "CLINICO_PATOLOGIE_CRONICHE", "CLINICO_TERAPIE_CRONICHE", "SIAD_PRESA_IN_CARICO", "SIAD_VALUTAZIONE_SANITARIA", "SIAD_VALUTAZIONE_SOCIALE"]
      },
      "*": {
        "descrizione": "Tutte le categorie extra data",
        "scopoLettura": "*-read",
        "scopoScrittura": "*-write",
        "categorie": ["...tutte..."]
      }
    },
    "scopeBase": "asp5-anagrafica"
  }
}
```

### Struttura della risposta

La risposta contiene tre sezioni:

**`categorie`** — Dettaglio di ogni categoria con i campi:
- `descrizione` — Nome leggibile della categoria
- `scopoLettura` / `scopoScrittura` — Scope necessari per questa specifica categoria
- `canWrite` — `true`/`false` se autenticato, `null` se pubblico
- `campi` — Array con la definizione completa di ogni campo:
  - `chiave` — Identificativo del campo (usato nelle API set/delete)
  - `tipo` — Tipo del valore: `string`, `number`, `boolean`, `date`, `json`
  - `obbligatorio` — Se il campo è obbligatorio
  - `etichetta` — Label da mostrare nella UI
  - `note` — Descrizione/help text per l'utente
  - `esempio` — Valore di esempio (usabile come placeholder)
  - `schema` — Per campi `json`: schema di validazione della struttura

**`gruppi`** — Scope wildcard che coprono più categorie. Utili per il login: invece di richiedere N scope singoli, il frontend può richiedere uno scope wildcard per accedere a tutto il gruppo.

**`scopeBase`** — Lo scope obbligatorio per tutti gli endpoint anagrafica (va sempre incluso nel login).

### Come usare il summary per la schermata di login

1. Chiama `GET /api/v1/anagrafica/extra-data-categorie/summary` **senza token** per ottenere tutte le categorie e i gruppi disponibili
2. Mostra all'utente le categorie (o i gruppi) come opzioni selezionabili
3. In base alla selezione, costruisci la stringa `scopi` per il login:
   - Se l'utente seleziona categorie singole → usa `scopoLettura`/`scopoScrittura` di ogni categoria
   - Se l'utente seleziona un gruppo → usa `scopoLettura`/`scopoScrittura` del gruppo (wildcard)
   - Aggiungi sempre `scopeBase` (`asp5-anagrafica`)
4. Dopo il login, richiama il summary **con il token** per avere `canWrite` e le categorie effettivamente accessibili

**Tipi supportati**: `string`, `number`, `boolean`, `date`, `json`

- I campi di tipo `json` sono usati per dati multi-valore (es. lista allergie, lista farmaci). Contengono un array di oggetti con il proprio `schema` di validazione.
- I campi di tipo `string`, `number`, `boolean`, `date` sono valori singoli.

### Categorie esistenti (ad oggi)

| Codice | Descrizione | Tipo campi | Scope lettura | Scope scrittura |
|--------|-------------|------------|---------------|-----------------|
| `ANAGRAFICA_CONTATTI` | Recapiti (telefoni, email, PEC) | Campi singoli | `anagrafica_contatti-read` | `anagrafica_contatti-write` |
| `ANAGRAFICA_CONTATTI_EMERGENZA` | Contatti di emergenza | Campi singoli | `anagrafica_contatti_emergenza-read` | `anagrafica_contatti_emergenza-write` |
| `ANAGRAFICA_EXTRA` | Dati anagrafici extra (stato civile, professione...) | Campi singoli | `anagrafica_extra-read` | `anagrafica_extra-write` |
| `CLINICO_ALLERGIE` | Allergie | JSON | `clinico_allergie-read` | `clinico_allergie-write` |
| `CLINICO_PATOLOGIE_CRONICHE` | Patologie croniche | JSON | `clinico_patologie_croniche-read` | `clinico_patologie_croniche-write` |
| `CLINICO_ESENZIONI` | Esenzioni | JSON | `clinico_esenzioni-read` | `clinico_esenzioni-write` |
| `CLINICO_TERAPIE_CRONICHE` | Terapie croniche | JSON | `clinico_terapie_croniche-read` | `clinico_terapie_croniche-write` |
| `CLINICO_PARAMETRI_VITALI` | Parametri vitali | Campi singoli | `clinico_parametri_vitali-read` | `clinico_parametri_vitali-write` |
| `CLINICO_CONSENSI` | Consensi informati | JSON | `clinico_consensi-read` | `clinico_consensi-write` |
| `SIAD_PRESA_IN_CARICO` | Presa in carico ADI | Campi singoli | `siad_presa_in_carico-read` | `siad_presa_in_carico-write` |
| `SIAD_VALUTAZIONE_SANITARIA` | Valutazione sanitaria ADI | Campi singoli | `siad_valutazione_sanitaria-read` | `siad_valutazione_sanitaria-write` |
| `SIAD_VALUTAZIONE_SOCIALE` | Valutazione sociale ADI | Campi singoli | `siad_valutazione_sociale-read` | `siad_valutazione_sociale-write` |

**Scope wildcard**: `anagrafica-*-read/write` per tutte le categorie, `clinico_*-read/write` per tutte le cliniche, `siad_*-read/write` per tutte le SIAD.

---

## 2. Leggere i dati extra di un assistito

### `GET /api/v1/anagrafica/extra-data/:cf`

**Parametri**: `:cf` = codice fiscale (path param)

**Scope richiesto**: `asp5-anagrafica` + scope di lettura per le categorie che vuoi vedere

**Risposta**:
```json
{
  "ok": true,
  "data": {
    "cf": "RSSMRA80A01H501V",
    "extraData": {
      "ANAGRAFICA_CONTATTI": {
        "cellulare_privato": "3331234567",
        "email": "mario.rossi@email.it",
        "fisso_privato": "0901234567"
      },
      "ANAGRAFICA_CONTATTI_EMERGENZA": {
        "nome": "Maria Rossi",
        "relazione": "Moglie",
        "telefono": "3339876543"
      },
      "CLINICO_ALLERGIE": {
        "allergie": "[{\"sostanza\":\"Penicillina\",\"tipo\":\"farmaco\",\"criticita\":\"alta\"}]"
      }
    }
  }
}
```

**Note importanti**:
- `extraData` contiene solo le categorie per cui l'utente ha scope di lettura
- Se l'assistito non ha dati per una categoria, quella categoria non compare nell'oggetto
- I campi di tipo `json` sono restituiti come **stringa JSON** — va fatto `JSON.parse()` lato frontend
- Se il CF non esiste nel DB, ritorna errore `NOT_FOUND`

---

## 3. Scrivere/aggiornare dati extra

### `POST /api/v1/anagrafica/extra-data/:cf`

**Parametri**:
- `:cf` = codice fiscale (path param)
- Body JSON:
```json
{
  "categoria": "ANAGRAFICA_CONTATTI",
  "valori": {
    "cellulare_privato": "3331234567",
    "email": "mario.rossi@email.it"
  }
}
```

**Scope richiesto**: `asp5-anagrafica` + scope di **scrittura** della categoria

**Comportamento**:
- Se il campo non esiste, viene **creato** (operazione CREATE)
- Se il campo esiste già, viene **aggiornato** (operazione UPDATE)
- Ogni operazione viene tracciata nello storico
- Le chiavi passate in `valori` devono corrispondere alle chiavi definite nei `campi` della categoria, altrimenti errore 400

**Risposta**:
```json
{
  "ok": true,
  "data": {
    "cf": "RSSMRA80A01H501V",
    "categoria": "ANAGRAFICA_CONTATTI",
    "risultati": [
      { "chiave": "cellulare_privato", "operazione": "CREATE" },
      { "chiave": "email", "operazione": "UPDATE" }
    ]
  }
}
```

**Validazioni server-side**:
- Chiavi non valide per la categoria → errore 400 con elenco campi ammessi
- Campi obbligatori vuoti → errore 400
- Campi di tipo `json` con schema → validazione struttura JSON

---

## 4. Eliminare dati extra

### `DELETE /api/v1/anagrafica/extra-data/:cf`

**Parametri**:
- `:cf` = codice fiscale (path param)
- Body JSON:
```json
{
  "categoria": "ANAGRAFICA_CONTATTI",
  "chiavi": ["cellulare_privato", "email"]
}
```

**Scope richiesto**: `asp5-anagrafica` + scope di **scrittura** della categoria

**Risposta**:
```json
{
  "ok": true,
  "data": {
    "cf": "RSSMRA80A01H501V",
    "categoria": "ANAGRAFICA_CONTATTI",
    "risultati": [
      { "chiave": "cellulare_privato", "operazione": "DELETE" },
      { "chiave": "email", "operazione": "NOT_FOUND" }
    ]
  }
}
```

---

## 5. Storico modifiche

### `GET /api/v1/anagrafica/extra-data/:cf/storico`

**Query params** (opzionali):
- `categoria` — filtra per codice categoria
- `page` — pagina (default 1)
- `limit` — risultati per pagina (default 50)

**Scope richiesto**: `asp5-anagrafica` + scope di lettura per le categorie

**Risposta**:
```json
{
  "ok": true,
  "data": {
    "storico": [
      {
        "id": 123,
        "valore": 456,
        "vecchioValore": "3331234567",
        "nuovoValore": "3339999999",
        "operazione": "UPDATE",
        "utente": "roberto.dedomenico",
        "ipAddress": "10.0.0.1",
        "createdAt": 1712000000000,
        "chiave": "cellulare_privato",
        "categoriaCode": "ANAGRAFICA_CONTATTI"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 3,
      "pages": 1
    }
  }
}
```

`operazione` può essere: `CREATE`, `UPDATE`, `DELETE`

---

## 6. Extra data nella ricerca assistiti

### `POST /api/v1/anagrafica/ricerca`

Quando si cerca un assistito, la risposta include automaticamente `extraData` per ogni assistito trovato, filtrato per scope dell'utente. Non serve una chiamata separata.

```json
{
  "ok": true,
  "data": {
    "assistiti": [
      {
        "cf": "RSSMRA80A01H501V",
        "cognome": "Rossi",
        "nome": "Mario",
        "extraData": {
          "ANAGRAFICA_CONTATTI": {
            "cellulare_privato": "3331234567",
            "email": "mario.rossi@email.it"
          }
        }
      }
    ],
    "totalCount": 1
  }
}
```

---

## 7. Esempio completo: campo ANAGRAFICA_CONTATTI

Struttura completa dei campi della categoria (come definita nel DB):

```json
[
  { "chiave": "cellulare_privato", "tipo": "string", "obbligatorio": false, "etichetta": "Cellulare privato", "note": "Numero di cellulare personale", "esempio": "3331234567" },
  { "chiave": "cellulare_pubblico", "tipo": "string", "obbligatorio": false, "etichetta": "Cellulare pubblico", "note": "Numero di cellulare pubblico/lavoro", "esempio": "3409876543" },
  { "chiave": "cellulare_altro", "tipo": "string", "obbligatorio": false, "etichetta": "Cellulare altro", "note": "Altro recapito cellulare", "esempio": "3281112233" },
  { "chiave": "email", "tipo": "string", "obbligatorio": false, "etichetta": "Email", "note": "Indirizzo email personale", "esempio": "mario.rossi@email.it" },
  { "chiave": "fisso_privato", "tipo": "string", "obbligatorio": false, "etichetta": "Fisso privato", "note": "Telefono fisso abitazione", "esempio": "0901234567" },
  { "chiave": "fisso_pubblico", "tipo": "string", "obbligatorio": false, "etichetta": "Fisso pubblico", "note": "Telefono fisso lavoro/ufficio", "esempio": "0907654321" },
  { "chiave": "fisso_altro", "tipo": "string", "obbligatorio": false, "etichetta": "Fisso altro", "note": "Altro recapito fisso", "esempio": "0909998877" },
  { "chiave": "pec", "tipo": "string", "obbligatorio": false, "etichetta": "PEC", "note": "Posta Elettronica Certificata", "esempio": "mario.rossi@pec.it" }
]
```

---

## 8. Note per l'implementazione frontend

### Flow consigliato

1. **All'avvio** chiama `GET /api/v1/anagrafica/extra-data-categorie/summary` (con token) per sapere quali categorie e campi sono disponibili per l'utente corrente. Le categorie sono in `data.categorie`, i gruppi wildcard in `data.gruppi`
2. **Alla selezione di un assistito** chiama `GET /api/v1/anagrafica/extra-data/:cf` per caricare i dati extra (oppure usa quelli già inclusi nella risposta di ricerca)
3. **Per modificare** usa `POST /api/v1/anagrafica/extra-data/:cf` con la categoria e i valori da impostare
4. **Per eliminare** un campo usa `DELETE /api/v1/anagrafica/extra-data/:cf` con la categoria e l'array di chiavi
5. **Per lo storico** usa `GET /api/v1/anagrafica/extra-data/:cf/storico`

### Codici errore comuni

| Codice | HTTP | Significato |
|--------|------|-------------|
| `NOT_FOUND` | 404 | Assistito o categoria non trovata |
| `NON_AUTORIZZATO` | 401 | Token mancante/scaduto o scope insufficienti |
| `BAD_REQUEST` | 400 | Chiave non valida, JSON malformato, campo obbligatorio vuoto |
| `ERRORE_DEL_SERVER` | 500 | Errore interno |
| `TIMEOUT` | 504 | Timeout (es. ricerca su TS) |

### Gestione campi JSON (tipo `json`)

I campi di tipo `json` (es. allergie, patologie) vengono salvati e restituiti come **stringhe JSON**. Il frontend deve:
- **Lettura**: `JSON.parse(valore)` per ottenere l'array di oggetti
- **Scrittura**: passare il valore già come oggetto/array nel body JSON (il server accetta sia stringa che oggetto)

### Chiave di accesso: codice fiscale

Tutti gli endpoint usano il **codice fiscale** (CF) come chiave per identificare l'assistito, non l'ID numerico. Il CF viene automaticamente convertito in uppercase dal server.

---

## 9. Sistema di autenticazione e permessi (scopi)

### Login — ottenere un token JWT

#### `POST /api/v1/login/get-token`

**Parametri** (body o query string):
```json
{
  "login": "username",
  "password": "password",
  "scopi": "asp5-anagrafica anagrafica_contatti-read anagrafica_contatti-write",
  "ambito": "api"
}
```

- `scopi` è una **stringa con scope separati da spazi**. Il token conterrà solo gli scope richiesti che l'utente ha effettivamente assegnati.
- `ambito` indica il dominio d'utenza (es. `api`, `asp.messina.it`, `generale`). Default: `generale`.
- Se l'utente ha OTP attivo, serve anche il campo `otp`.
- Per login con Active Directory: aggiungere `domain: "asp.messina.it"`.

**Risposta** (successo):
```json
{
  "ok": true,
  "data": {
    "token": "eyJhbGci...",
    "username": "mario.rossi",
    "scopi": ["asp5-anagrafica", "anagrafica_contatti-read", "anagrafica_contatti-write"],
    "ambito": "api",
    "livello": 1
  }
}
```

**Il frontend deve richiedere al login tutti gli scope di cui ha bisogno.** Il server restituirà nel token solo quelli che l'utente possiede. Gli scope non posseduti vengono silenziosamente ignorati.

### Come funzionano gli scope

Ogni endpoint richiede:
1. **Scope di route** — es. `asp5-anagrafica` (richiesto per tutti gli endpoint anagrafica/extra-data)
2. **Scope di categoria** — es. `anagrafica_contatti-read` o `anagrafica_contatti-write` (verificato dal controller in base alla categoria)

Il controllo avviene in due fasi:
- La **policy** `is-token-verified` verifica che il token contenga lo scope della route (es. `asp5-anagrafica`)
- Il **controller** verifica che il token contenga lo scope specifico della categoria (es. `anagrafica_contatti-read`)

### Sistema wildcard

Gli scope supportano il carattere `*` come wildcard. La logica è in `api/helpers/scope-matches.js`:

```
"clinico_*-read" matcha "clinico_allergie-read"     ✓
"clinico_*-read" matcha "clinico_patologie-read"     ✓
"clinico_*-read" matcha "anagrafica_contatti-read"   ✗
"anagrafica_*-write" matcha "anagrafica_contatti-write"  ✓
"*-read" matcha qualsiasi scope che finisce con "-read"  ✓
```

Il `*` viene convertito in regex `.*`, quindi matcha qualsiasi sequenza di caratteri in quella posizione.

### Elenco completo degli scope extra data

#### Scope singoli (per categoria)

| Scope | Permesso | Categoria |
|-------|----------|-----------|
| `anagrafica_contatti-read` | Lettura | ANAGRAFICA_CONTATTI |
| `anagrafica_contatti-write` | Scrittura | ANAGRAFICA_CONTATTI |
| `anagrafica_contatti_emergenza-read` | Lettura | ANAGRAFICA_CONTATTI_EMERGENZA |
| `anagrafica_contatti_emergenza-write` | Scrittura | ANAGRAFICA_CONTATTI_EMERGENZA |
| `anagrafica_extra-read` | Lettura | ANAGRAFICA_EXTRA |
| `anagrafica_extra-write` | Scrittura | ANAGRAFICA_EXTRA |
| `anagrafica_note-read` | Lettura | ANAGRAFICA_NOTE |
| `anagrafica_note-write` | Scrittura | ANAGRAFICA_NOTE |
| `clinico_allergie-read` | Lettura | CLINICO_ALLERGIE |
| `clinico_allergie-write` | Scrittura | CLINICO_ALLERGIE |
| `clinico_patologie-read` | Lettura | CLINICO_PATOLOGIE_CRONICHE |
| `clinico_patologie-write` | Scrittura | CLINICO_PATOLOGIE_CRONICHE |
| `clinico_esenzioni-read` | Lettura | CLINICO_ESENZIONI |
| `clinico_esenzioni-write` | Scrittura | CLINICO_ESENZIONI |
| `clinico_terapie-read` | Lettura | CLINICO_TERAPIE_CRONICHE |
| `clinico_terapie-write` | Scrittura | CLINICO_TERAPIE_CRONICHE |
| `clinico_parametri_vitali-read` | Lettura | CLINICO_PARAMETRI_VITALI |
| `clinico_parametri_vitali-write` | Scrittura | CLINICO_PARAMETRI_VITALI |
| `clinico_consensi-read` | Lettura | CLINICO_CONSENSI |
| `clinico_consensi-write` | Scrittura | CLINICO_CONSENSI |
| `clinico_presa_in_carico-read` | Lettura | SIAD_PRESA_IN_CARICO |
| `clinico_presa_in_carico-write` | Scrittura | SIAD_PRESA_IN_CARICO |
| `clinico_valutazione_sanitaria-read` | Lettura | SIAD_VALUTAZIONE_SANITARIA |
| `clinico_valutazione_sanitaria-write` | Scrittura | SIAD_VALUTAZIONE_SANITARIA |
| `clinico_valutazione_sociale-read` | Lettura | SIAD_VALUTAZIONE_SOCIALE |
| `clinico_valutazione_sociale-write` | Scrittura | SIAD_VALUTAZIONE_SOCIALE |

#### Scope wildcard (accesso a gruppi di categorie)

| Scope | Cosa copre |
|-------|-----------|
| `anagrafica_*-read` | Tutte le categorie `anagrafica_*` (contatti, contatti_emergenza, extra, note) |
| `anagrafica_*-write` | Scrittura su tutte le categorie `anagrafica_*` |
| `clinico_*-read` | Tutte le categorie `clinico_*` (allergie, patologie, esenzioni, terapie, parametri_vitali, consensi, presa_in_carico, valutazione_sanitaria, valutazione_sociale) |
| `clinico_*-write` | Scrittura su tutte le categorie `clinico_*` |
| `*-read` | Lettura su **tutte** le categorie extra data |
| `*-write` | Scrittura su **tutte** le categorie extra data |

#### Scope di route (obbligatorio)

| Scope | Richiesto per |
|-------|--------------|
| `asp5-anagrafica` | Tutti gli endpoint `/api/v1/anagrafica/*` (ricerca, extra-data, ecc.) |

### Esempio pratico: scope da richiedere al login

**Frontend che gestisce solo contatti e contatti emergenza**:
```
scopi: "asp5-anagrafica anagrafica_contatti-read anagrafica_contatti-write anagrafica_contatti_emergenza-read anagrafica_contatti_emergenza-write"
```

**Frontend che gestisce tutti i dati anagrafici (ma non clinici)**:
```
scopi: "asp5-anagrafica anagrafica_*-read anagrafica_*-write"
```

**Frontend che gestisce tutto (anagrafica + clinico)**:
```
scopi: "asp5-anagrafica *-read *-write"
```

**Frontend di sola consultazione (read-only su tutto)**:
```
scopi: "asp5-anagrafica *-read"
```

### Come determinare dinamicamente gli scope disponibili

Il frontend può scoprire a runtime quali categorie sono accessibili chiamando l'endpoint **summary** dopo il login. Le categorie restituite sono solo quelle per cui il token ha scope di lettura. Questo permette di costruire la UI dinamicamente senza hardcodare le categorie.

### Livelli di accesso

| Livello | Valore | Descrizione |
|---------|--------|-------------|
| `guest` | 0 | Accesso ospite |
| `user` | 1 | Utente standard — sufficiente per tutti gli endpoint extra data |
| `admin` | 2 | Amministratore |
| `superAdmin` | 99 | Super amministratore — richiesto per endpoint admin |

Gli endpoint extra data richiedono livello minimo `user` (1).
