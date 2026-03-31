# Report Tecnico Completo - ASP Web Services

## Portale Web Services ASP di Messina

**Versione:** 1.x
**Framework:** Sails.js v1.5.14
**Runtime:** Node.js ^22.13
**Data report:** Marzo 2026

---

## 1. Panoramica del Sistema

Il sistema ASP-WS e' una piattaforma di web services sviluppata per l'ASP (Azienda Sanitaria Provinciale) di Messina. Fornisce servizi digitali per la gestione dell'anagrafica sanitaria, il cambio del medico di base, la gestione di dati clinici personalizzati (Extra Data), un sistema di Master Patient Index (MPI) per pazienti non identificati, un sistema di form pubblici, e la gestione di applicazioni Docker containerizzate.

L'architettura e' basata su un pattern MVC (Model-View-Controller) con autenticazione JWT, autorizzazione basata su ruoli e scopi (RBAC + scope-based), e un pannello di amministrazione web completo.

### Componenti principali

1. **API RESTful** - Oltre 95 endpoint organizzati per dominio funzionale
2. **Pannello di Amministrazione** - Interfaccia web per la gestione di utenti, permessi, dati clinici e applicazioni
3. **Sistema di Autenticazione** - JWT con supporto OTP (email e TOTP)
4. **Anagrafica Sanitaria** - Gestione pazienti con integrazione al registro nazionale (NAR2)
5. **Extra Data System** - Sistema flessibile per dati clinici dinamici con versionamento
6. **Master Patient Index (MPI)** - Gestione pazienti non identificati con macchina a stati
7. **Cambio Medico** - Workflow per il cambio del medico di medicina generale
8. **Form Builder** - Sistema di form pubblici con raccolta dati e reCAPTCHA
9. **Docker App Manager** - Gestione containerizzata di applicazioni satellite
10. **Motore di Ricerca** - Integrazione con Meilisearch per ricerca full-text pazienti

---

## 2. Architettura del Database

Il sistema utilizza un'architettura multi-database con tre istanze MySQL separate, ciascuna dedicata a un dominio specifico.

### 2.1 Database `auth` - Autenticazione e Autorizzazione

Contiene tutte le tabelle relative alla gestione degli utenti e dei permessi.

**Tabelle principali:**

- **Auth_Utenti** - Tabella utenti
  - Campi: username (unico), hash_password (Argon2), mail, ambito (FK), livello (FK), attivo, allow_domain_login, domain
  - Supporto OTP: otp_enabled, otp_key (per TOTP), otp (hash codice), otp_exp (scadenza), otp_type ('mail'/'totp'), otp_required
  - Token: refresh_token, token_revocato
  - Relazione many-to-many con Auth_Scopi tramite Auth_UtentiScopi

- **Auth_Scopi** - Tabella permessi/scope
  - Campi: scopo (nome univoco), attivo
  - Supporta pattern wildcard (es. `anagrafica-hl7_*-read`)
  - Relazione many-to-many con Auth_Utenti

- **Auth_Ambiti** - Domini di autenticazione
  - Campi: ambito (nome dominio), is_dominio (flag per login Active Directory)
  - Esempi: 'api', 'asp.messina.it', 'globale'

- **Auth_Livelli** - Livelli di accesso
  - Campi: livello, descrizione, isSuperAdmin
  - Livelli predefiniti: Guest (1), User (2), Admin (3), SuperAdmin (4)

- **Auth_UtentiScopi** - Tabella di giunzione utente-scopo
  - Campi: utente (FK), scopo (FK)

### 2.2 Database `anagrafica` - Registro Pazienti

Contiene i dati anagrafici dei pazienti e tutti i dati clinici associati.

**Tabelle principali:**

- **Anagrafica_Assistiti** - Registro principale pazienti
  - Dati anagrafici: cf (codice fiscale, unico), cognome, nome, sesso, dataNascita
  - Dati residenza: indirizzoResidenza, capResidenza, comuneResidenza, codComuneResidenza, codIstatComuneResidenza
  - Dati nascita: comuneNascita, codComuneNascita, codIstatComuneNascita, provinciaNascita
  - Dati sanitari: asp, ssnTipoAssistito, ssnInizioAssistenza, ssnFineAssistenza, ssnNumeroTessera
  - Dati medico: MMGTipo, MMGCodReg, MMGNome, MMGCognome, MMGCf, MMGDataScelta, MMGDataRevoca
  - Geolocalizzazione: lat, long, geolocPrecise
  - Controllo: md5 (hash per change detection), lastCheck, dataDecesso
  - Lifecycle hooks: sincronizzazione automatica con Meilisearch su create/update/destroy

- **Anagrafica_ExtraDataCategorie** - Definizioni categorie dati extra
  - Campi: codice (unico), descrizione, scopoLettura, scopoScrittura, campi (JSON schema), attivo
  - Tipi campo supportati: string, number, boolean, date, json

- **Anagrafica_ExtraDataValori** - Valori correnti dati extra per paziente
  - Campi: assistito (FK), categoria (FK), chiave, valore
  - Vincolo unicita': (assistito, categoria, chiave)

- **Anagrafica_ExtraDataStorico** - Audit trail modifiche dati extra
  - Campi: assistito (FK), categoria (FK), chiave, valoreVecchio, valoreNuovo, utente, operazione ('SET'/'DELETE'), ipAddress

- **Anagrafica_MpiApplicazioni** - Applicazioni MPI registrate
  - Campi: codice (unico), nome, descrizione, versione, contatto, attivo

- **Anagrafica_MpiRecord** - Record pazienti non identificati
  - Campi: mpiId (UUID unico), applicazione (FK), idEsterno, stato ('aperto'/'identificato'/'annullato'), assistito (FK nullable)
  - Dati demografici opzionali (stessa struttura di Anagrafica_Assistiti)
  - Campi identificazione: dataIdentificazione, utenteIdentificazione, note

- **Anagrafica_MpiRecordStorico** - Audit trail operazioni MPI
  - Campi: mpiRecord (FK), operazione ('CREATE'/'UPDATE'/'LINK'/'UNLINK'/'ANNULLA'), dettaglio (JSON), utente, ipAddress

- **Anagrafica_MpiExtraDataValori** / **Anagrafica_MpiExtraDataStorico** - Dati extra e storico per record MPI

### 2.3 Database `log` - Logging

- **Log** - Log applicativo
  - Campi: level ('info'/'warn'/'error'/'debug'), tag, message, action, user, context (JSON), ipAddress
  - Tag predefiniti: TOKEN_VERIFY_OK/KO, TOKEN_REQUEST_OK/KO, API_RESPONSE_OK/KO, ADMIN, FORMS, OTP_*, CAMBIO_PASSWORD, MPI_*

- **Log_FormSubmission** - Submission form pubblici
  - Campi: formId, formTitle, submissionData (JSON), ipAddress, userAgent, recaptchaScore, submittedAt

### 2.4 Sistema di Migrazione

Le migrazioni SQL sono gestite da un sistema custom che esegue automaticamente all'avvio dell'applicazione.

- I file SQL si trovano in `migrations/` con naming convention `YYYYMMDD_NNN_descrizione.sql`
- Ogni file dichiara il database target con header `-- database: anagrafica|auth|log`
- Ogni database ha una tabella `_migrations` per tracciare le migrazioni eseguite
- Le migrazioni non vengono mai ri-eseguite; se falliscono vengono loggate e ritentate al prossimo avvio
- Tutte le INSERT usano `WHERE NOT EXISTS` per idempotenza

---

## 3. Sistema di Autenticazione e Sicurezza

### 3.1 Flusso di Autenticazione Completo

```
[Client] --POST /api/v1/login/get-token--> [Server]
   |                                           |
   |   {login, password, scopi, ambito}        |
   |                                           v
   |                                   [1. Lookup utente]
   |                                   [2. Verifica stato attivo]
   |                                   [3. Verifica ambito]
   |                                           |
   |                              +------------+------------+
   |                              |                         |
   |                     [Domain Login?]            [Password locale]
   |                     [LDAP/AD check]            [Argon2 verify]
   |                              |                         |
   |                              +------------+------------+
   |                                           |
   |                                   [4. OTP richiesto?]
   |                              +----+----+
   |                              |         |
   |                          [Email]    [TOTP]
   |                          [Genera]   [Verifica]
   |                          [6 cifre]  [Authenticator]
   |                          [10 min]   [App code]
   |                              |         |
   |   <---{otp_required}--------+         |
   |                                        |
   |   --{otp_code}----------------------->|
   |                                        |
   |                              +---------+
   |                              |
   |                     [5. Validazione scopi]
   |                     [User scopes >= requested scopes]
   |                              |
   |                     [6. Generazione JWT]
   |                     [Payload: username, scopi, ambito, livello]
   |                              |
   |   <---{token, expireDate}----+
   |
   |   [Richieste successive]
   |   Authorization: Bearer <token>
   |                                           |
   |                                   [Policy: is-token-verified]
   |                                   [Verifica firma JWT]
   |                                   [Verifica utente attivo]
   |                                   [Verifica scopi ancora validi]
   |                                   [Verifica livello sufficiente]
   |                                   [Verifica ambito corretto]
   |                                           |
   |                                   [req.tokenData disponibile]
   |                                   [al controller]
```

### 3.2 Livelli di Accesso (Gerarchia)

| Livello | Codice | Valore | Descrizione |
|---------|--------|--------|-------------|
| Guest | guest | 0 | Endpoint pubblici, nessuna autenticazione |
| User | user | 1 | Utente autenticato base |
| Admin | admin | 2 | Utente amministratore |
| SuperAdmin | superAdmin | 99 | Amministratore di sistema con accesso completo |

### 3.3 Sistema degli Scopi (Scope-Based Authorization)

Gli scopi sono permessi granulari assegnati agli utenti che determinano a quali API e funzionalita' possono accedere.

**Scopi principali:**

| Scopo | Area funzionale |
|-------|-----------------|
| `asp5-anagrafica` | Ricerca e gestione anagrafica pazienti |
| `cambio-medico` | Workflow cambio medico di base |
| `forms` | Gestione form e visualizzazione submissions |
| `admin-manage` | Pannello di amministrazione completo |
| `apps` | Gestione applicazioni Docker |
| `mpi-{appCode}-read` | Lettura record MPI per applicazione specifica |
| `mpi-{appCode}-write` | Scrittura record MPI per applicazione specifica |
| `mpi-search` | Ricerca cross-applicazione su MPI |
| `anagrafica-{codice}-read` | Lettura dati extra per categoria specifica |
| `anagrafica-{codice}-write` | Scrittura dati extra per categoria specifica |

**Wildcard matching:** Il sistema supporta pattern wildcard negli scopi. Ad esempio, `anagrafica-hl7_*-read` corrisponde a `anagrafica-hl7_allergie-read`, `anagrafica-hl7_patologie_croniche-read`, ecc. La verifica avviene tramite l'helper `scope-matches.js`.

### 3.4 Autenticazione a Due Fattori (2FA/OTP)

Il sistema supporta due modalita' OTP:

**Email OTP:**
1. L'utente effettua il login con username e password
2. Il server genera un codice numerico di 6 cifre
3. Il codice viene hashato con Argon2 e salvato nel DB con scadenza 10 minuti
4. Viene inviata un'email HTML all'utente con il codice
5. L'utente inserisce il codice nella richiesta successiva
6. Il server verifica il codice contro l'hash salvato

**TOTP (Time-based One-Time Password):**
1. L'utente configura un'app authenticator (Google Authenticator, Authy, ecc.)
2. Il server genera una chiave segreta e la restituisce come QR code
3. L'utente scansiona il QR code e verifica con un codice di test
4. Ad ogni login successivo, l'utente fornisce il codice generato dall'app
5. Il server verifica il codice usando la libreria `otplib`

### 3.5 Login di Dominio (Active Directory)

Per gli utenti del dominio `asp.messina.it`, il sistema supporta l'autenticazione tramite LDAP/Active Directory:
- Il suffisso di dominio viene automaticamente rimosso dallo username
- La verifica delle credenziali avviene tramite l'helper `domain-login.js`
- L'utente deve avere `allow_domain_login: true` e il campo `domain` configurato

### 3.6 Protezione degli Endpoint

Ogni route nel sistema dichiara i propri requisiti di sicurezza:

```
Route definition:
{
  action: 'controller/action',
  scopi: 'scope1 scope2',      // Scopi richiesti (spazio-separati)
  ambito: 'dominio',           // Dominio richiesto
  minAuthLevel: 'user|admin|superAdmin'  // Livello minimo
}
```

La policy `is-token-verified` intercetta tutte le richieste protette e verifica:
1. Presenza e validita' del token JWT nell'header `Authorization: Bearer`
2. Il token non sia scaduto
3. L'utente sia ancora attivo nel database
4. L'utente abbia gli scopi richiesti dalla route
5. L'utente appartenga all'ambito richiesto
6. Il livello di autenticazione sia sufficiente

In caso di successo, `req.tokenData` viene popolato con: `username`, `scopi`, `ambito`, `livello`.

### 3.7 Protezione del Pannello Admin e Documentazione

Il pannello di amministrazione (`/admin`) e la documentazione Swagger (`/docs`) sono protetti da Basic Authentication HTTP, con credenziali configurate in file privati non versionati (`config/custom/private_ui_users.json`).

### 3.8 Hashing delle Password

Le password sono hashate con **Argon2** (algoritmo vincitore della Password Hashing Competition), considerato lo stato dell'arte per l'hashing sicuro delle password.

---

## 4. Sistema Anagrafica Sanitaria

### 4.1 Gestione Pazienti

Il registro pazienti (Anagrafica_Assistiti) e' il cuore del sistema. Ogni paziente e' identificato univocamente dal codice fiscale (`cf`).

**Funzionalita' principali:**

- **Ricerca locale:** Ricerca nel database locale per CF, nome, cognome, data di nascita (max 100 risultati)
- **Ricerca NAR2:** Interrogazione del registro nazionale pazienti tramite il servizio esterno NAR2
- **Ricerca massiva:** Import/sync massivo di dati paziente (solo superAdmin)
- **Geolocalizzazione:** Calcolo coordinate GPS dall'indirizzo di residenza tramite Nominatim (OpenStreetMap)
- **Ricerca full-text:** Integrazione con Meilisearch per ricerca veloce e fuzzy

### 4.2 Integrazione Meilisearch

Il sistema mantiene un indice di ricerca sincronizzato con il database tramite lifecycle hooks del modello:
- **afterCreate/afterUpdate:** Il documento viene indicizzato/aggiornato automaticamente
- **beforeDestroy:** Il documento viene rimosso dall'indice
- Campi ricercabili: cf, nome, cognome, dataNascita, fullText
- Nessuna tolleranza ai typo (ricerca esatta)

### 4.3 Change Detection

Ogni record paziente include un campo `md5` calcolato automaticamente prima di ogni create/update. Questo hash permette di rilevare modifiche ai dati senza confrontare campo per campo, ottimizzando le operazioni di sincronizzazione.

---

## 5. Sistema Extra Data

### 5.1 Architettura

Il sistema Extra Data permette di aggiungere dati dinamici ai pazienti, organizzati per categorie con schema flessibile.

```
[Categoria]                    [Valori]                    [Storico]
+-------------------+         +-------------------+        +-------------------+
| codice            |<------->| assistito (FK)    |        | assistito (FK)    |
| descrizione       |         | categoria (FK)    |------->| categoria (FK)    |
| scopoLettura      |         | chiave            |        | chiave            |
| scopoScrittura    |         | valore            |        | valoreVecchio     |
| campi (JSON)      |         +-------------------+        | valoreNuovo       |
| attivo            |                                      | utente            |
+-------------------+                                      | operazione        |
                                                           | ipAddress         |
                                                           +-------------------+
```

### 5.2 Tipi di Campo

Ogni categoria definisce uno schema di campi tramite un array JSON:

```json
[
  {"chiave": "nome_campo", "tipo": "string", "obbligatorio": true, "etichetta": "Label"},
  {"chiave": "allergia_lista", "tipo": "json", "obbligatorio": false, "etichetta": "Allergie"}
]
```

Tipi supportati: `string`, `number`, `boolean`, `date`, `json`

Il tipo `json` e' usato per dati multi-valore (es. lista allergie, lista farmaci).

### 5.3 Categorie HL7 Predefinite

Il sistema include categorie predefinite basate sullo standard HL7 per dati clinici:

| Categoria | Tipo Dati | Descrizione |
|-----------|-----------|-------------|
| HL7_CONTATTI_EMERGENZA | Campi singoli | Nome, relazione, telefono contatto emergenza |
| HL7_ALLERGIE | JSON lista | Sostanza, tipo, criticita', reazione per ogni allergia |
| HL7_PATOLOGIE_CRONICHE | JSON lista | Codice ICD9, descrizione, stato clinico per ogni patologia |
| HL7_ESENZIONI | JSON lista | Codice esenzione, tipo, data inizio per ogni esenzione |
| HL7_TERAPIE_CRONICHE | JSON lista | Farmaco, dosaggio, frequenza per ogni terapia |
| HL7_PARAMETRI_VITALI | Campi singoli | Pressione, frequenza cardiaca, peso, SpO2 |
| HL7_CONSENSI | JSON lista | Tipo consenso, stato, data rilascio |

### 5.4 Controllo Accesso per Categoria

Ogni categoria ha scopi di lettura e scrittura dedicati:
- Pattern: `anagrafica-{codice_lowercase}-read` / `anagrafica-{codice_lowercase}-write`
- Esempio: categoria `HL7_ALLERGIE` richiede `anagrafica-hl7_allergie-read` per leggere
- Gli scopi vengono creati automaticamente in Auth_Scopi quando una categoria viene creata
- Supporto wildcard: `anagrafica-hl7_*-read` per accedere a tutte le categorie HL7

### 5.5 Versionamento e Audit Trail

Ogni modifica ai dati extra viene registrata nello storico:
- Operazione: SET (creazione/modifica) o DELETE (eliminazione)
- Valore vecchio e nuovo salvati
- Utente che ha effettuato la modifica
- Indirizzo IP della richiesta
- Timestamp automatico

---

## 6. Master Patient Index (MPI)

### 6.1 Scopo del Sistema

Il Master Patient Index gestisce pazienti non ancora identificati o provenienti da sistemi esterni. Ogni applicazione sanitaria registrata puo' creare record MPI che vengono successivamente collegati ai pazienti noti nell'anagrafica.

### 6.2 Macchina a Stati

```
                    +----------+
                    |  APERTO  |  (Record creato, paziente non identificato)
                    +----+-----+
                         |
              +----------+----------+
              |                     |
              v                     v
     +--------+-------+    +-------+--------+
     |  IDENTIFICATO  |    |   ANNULLATO    |
     |  (Collegato a  |    |   (Record     |
     |   assistito)   |    |   invalido)   |
     +----------------+    +---------------+
```

**Stati:**
- **aperto**: Record appena creato, il paziente non e' stato ancora identificato nell'anagrafica
- **identificato**: Il record e' stato collegato (link) a un paziente noto in Anagrafica_Assistiti
- **annullato**: Il record e' stato cancellato/invalidato

### 6.3 Operazioni

| Operazione | Descrizione | Effetto sullo stato |
|------------|-------------|---------------------|
| CREATE | Crea nuovo record MPI con UUID automatico | → aperto |
| UPDATE | Modifica dati demografici del record | Nessun cambio stato |
| LINK | Collega il record a un paziente identificato | aperto → identificato |
| ANNULLA | Invalida il record | aperto → annullato |

### 6.4 Architettura Multi-Applicazione

```
[App Pronto Soccorso]     [App Laboratorio]      [App Radiologia]
        |                        |                       |
        v                        v                       v
  mpi-ps-write             mpi-lab-write          mpi-rad-write
        |                        |                       |
        +------------------------+---+-------------------+
                                 |
                          [MPI Records]
                                 |
                     +-----------+-----------+
                     |                       |
              [Extra Data MPI]        [Storico MPI]
                     |
              [Link a Assistito] ---> [Anagrafica_Assistiti]
```

Ogni applicazione ha scopi dedicati:
- `mpi-{codiceApp}-read`: Lettura dei propri record
- `mpi-{codiceApp}-write`: Creazione e modifica dei propri record
- `mpi-search`: Ricerca cross-applicazione (scopo speciale)

### 6.5 Extra Data MPI

I record MPI supportano gli stessi Extra Data dei pazienti identificati, con modelli dedicati (`Anagrafica_MpiExtraDataValori`, `Anagrafica_MpiExtraDataStorico`) e le stesse categorie.

---

## 7. Sistema Cambio Medico

### 7.1 Workflow

Il modulo Cambio Medico gestisce il processo di cambio del medico di medicina generale per i pazienti.

```
[1. Ricerca Paziente]
        |
        v
[2. Verifica situazione assistenziale]
        |
        v
[3. Verifica ambito domicilio]
        |
        v
[4. Ricerca medici disponibili per il paziente]
        |
        v
[5. Selezione nuovo medico]
        |
        v
[6. Completamento cambio]
```

**Endpoint disponibili:**

| Endpoint | Funzione |
|----------|----------|
| `get-medici` | Lista medici con filtri |
| `get-medici-disponibili-assistito` | Medici disponibili per un paziente specifico |
| `get-situazioni-assistenziali-assistito` | Situazione assistenziale corrente del paziente |
| `get-ambito-domicilio-assistito` | Ambito territoriale del domicilio |
| `get-situazione-medico` | Situazione corrente di un medico (pazienti, massimale) |

---

## 8. Sistema Form Pubblici

### 8.1 Architettura

Il sistema permette di creare form pubblici accessibili senza autenticazione, con un builder per l'amministratore.

```
[Admin: Crea/Modifica Form]
        |
        v
[Form JSON Definition]  <--- [Import/Export]
        |
        v
[Pagina Pubblica /forms/:id]
        |
        v
[Submit con reCAPTCHA v3]
        |
        v
[Log_FormSubmission]
        |
        v
[Admin: Visualizza/Esporta CSV]
```

### 8.2 Funzionalita'

- **Form Builder**: Interfaccia admin per creare e modificare form
- **Form pubblici**: Accessibili senza autenticazione su `/forms/:id`
- **reCAPTCHA v3**: Protezione anti-spam opzionale con scoring
- **Rate limiting**: Limitazione invii per prevenire abusi
- **Export CSV**: Esportazione submissions in formato CSV
- **Import/Export**: Import/export definizioni form in formato JSON
- **Logo personalizzato**: Upload logo per branding dei form
- **Impostazioni globali**: Configurazione centralizzata (logo, reCAPTCHA, branding)

---

## 9. Gestione Applicazioni Docker

### 9.1 Panoramica

Il sistema include un gestore di applicazioni Docker containerizzate, accessibile dal pannello admin.

**Funzionalita':**
- Lista container con stato (running, stopped, ecc.)
- Upload nuove applicazioni
- Clone di applicazioni esistenti
- Start, stop, restart container
- Visualizzazione log container
- Configurazione settings Docker
- Supporto piattaforme Windows (WSL) e Unix

### 9.2 Architettura

```
[Admin Panel /admin/apps]
        |
        v
[Apps API Endpoints]
        |
        v
[AppsService.js]
        |
        v
[dockerode / shell commands]
        |
        v
[Docker Engine]
        |
        v
[Container 1] [Container 2] [Container N]
```

Ogni applicazione ha un endpoint di configurazione pubblico (`/api/v1/apps/:appId/config`) che i container possono usare per ottenere la propria configurazione.

---

## 10. Pannello di Amministrazione

### 10.1 Struttura

Il pannello admin e' una Single Page Application basata su Bootstrap 5, servita come template EJS.

**Sezioni:**

| Sezione | Funzionalita' |
|---------|---------------|
| Dashboard | Statistiche: totale utenti, scopi, ambiti, livelli |
| Gestione Utenti | CRUD utenti, assegnazione scopi, configurazione OTP, attivazione/disattivazione |
| Gestione Scopi | CRUD permessi, visualizzazione utenti associati |
| Gestione Ambiti | CRUD domini autenticazione |
| Livelli di Accesso | Visualizzazione livelli (sola lettura) |
| Extra Data | Gestione categorie e valori per paziente con storico inline |
| MPI Applicazioni | CRUD applicazioni MPI registrate |
| MPI Record | Visualizzazione e ricerca record MPI |

### 10.2 Sicurezza

- Protetto da Basic Auth HTTP (credenziali in file privato non versionato)
- Le API admin richiedono JWT con scopo `admin-manage` e livello `superAdmin`
- Tutte le operazioni vengono loggate nel database

---

## 11. Servizi di Supporto

### 11.1 Logging Centralizzato

Ogni richiesta API viene automaticamente loggata nel database `log` tramite l'helper `log.js`:
- Livello: info, warn, error, debug
- Tag categorizzato (TOKEN_*, API_RESPONSE_*, ADMIN, FORMS, OTP_*, MPI_*)
- Azione, utente, IP, contesto JSON

### 11.2 Meilisearch (Ricerca Full-Text)

Motore di ricerca dedicato per i pazienti:
- Indicizzazione automatica tramite lifecycle hooks
- Campi ricercabili: cf, nome, cognome, dataNascita, fullText
- Campi ordinabili: cf, nome, cognome
- Nessuna tolleranza typo (ricerca precisa)

### 11.3 Servizio Email

Invio email tramite Nodemailer per:
- Codici OTP
- Notifiche di sistema

### 11.4 Geolocalizzazione

Calcolo coordinate GPS dall'indirizzo di residenza:
- Nominatim privato per operazioni bulk
- OpenStreetMap ufficiale per query singole
- Flag `geolocPrecise` per indicare la qualita' del risultato

### 11.5 Documentazione API (Swagger)

Documentazione interattiva disponibile su `/docs`:
- Generata automaticamente dai JSDoc nei controller
- Protetta da Basic Auth
- Statistiche dinamiche iniettate a runtime (totale pazienti, ultimo aggiornamento, percentuale geolocalizzazione)
- Tag: Auth, Otp, Cambio Medico, Gestione Extra Data Assistiti, Info, Admin

---

## 12. Formato Risposte API

Tutte le risposte API utilizzano un formato standardizzato tramite il response handler `ApiResponse`:

**Risposta di successo:**
```json
{
  "ok": true,
  "err": null,
  "data": { ... }
}
```

**Risposta di errore:**
```json
{
  "ok": false,
  "err": {
    "code": "ERROR_CODE",
    "msg": "Descrizione errore"
  },
  "data": null
}
```

**Codici errore comuni:**
- `TOKEN_SCADUTO` - Token JWT scaduto
- `TOKEN_NON_VALIDO` - Token JWT non valido o permessi insufficienti
- `NOT_FOUND` - Risorsa non trovata
- `VALIDATION_ERROR` - Errore di validazione input
- `UNAUTHORIZED` - Non autorizzato

---

## 13. Flussi di Processo Principali

### 13.1 Registrazione e Primo Accesso Utente

```
[SuperAdmin crea utente]
        |
        v
[Assegna livello, ambito, scopi]
        |
        v
[Attiva account]
        |
        v
[Utente riceve credenziali]
        |
        v
[Primo login: cambio password obbligatorio?]
        |
        v
[Opzionale: Setup OTP (email/TOTP)]
        |
        v
[Login completo con JWT]
```

### 13.2 Ricerca e Consultazione Paziente

```
[Utente autenticato con scopo asp5-anagrafica]
        |
        v
[Ricerca per CF / nome / cognome]
        |
        +---[DB locale]--->[Risultati con Extra Data filtrati per scopi utente]
        |
        +---[NAR2 (registro nazionale)]--->[Dati aggiornati + creazione/update locale]
        |
        v
[Visualizzazione dati paziente completi]
```

### 13.3 Gestione Dati Extra Paziente

```
[Utente con scopo anagrafica-{categoria}-write]
        |
        v
[POST /api/v1/anagrafica/extra-data/:cf]
[Body: {categoria: "HL7_ALLERGIE", valori: {...}}]
        |
        v
[Validazione schema categoria]
        |
        v
[Salvataggio in ExtraDataValori]
[Creazione record in ExtraDataStorico]
        |
        v
[Conferma con dati aggiornati]
```

### 13.4 Flusso MPI Completo

```
[App esterna (es. Pronto Soccorso)]
        |
        v
[POST /api/v1/mpi/record]
[Crea record con dati parziali]
[Stato: APERTO]
        |
        v
[Operatore identifica il paziente]
        |
        v
[POST /api/v1/mpi/record/:mpiId/link]
[Collega a CF noto]
[Stato: IDENTIFICATO]
        |
        v
[Dati extra MPI disponibili per consultazione]
[Storico operazioni tracciato]
```

---

## 14. Mappa Completa degli Endpoint API

### 14.1 Autenticazione (nessun livello minimo richiesto)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | /api/v1/login/get-token | Login e ottenimento token JWT |
| POST | /api/v1/login/verify-token | Verifica validita' token |
| POST | /api/v1/login/cambio-password | Cambio password (user) |
| POST | /api/v1/login/otp/setup | Configurazione 2FA |
| POST | /api/v1/login/otp/verify-setup | Verifica setup 2FA |
| POST | /api/v1/login/otp/switch | Cambio tipo OTP |

### 14.2 Anagrafica (scopo: asp5-anagrafica)

| Metodo | Endpoint | Livello | Descrizione |
|--------|----------|---------|-------------|
| POST | /api/v1/anagrafica/ricerca | user | Ricerca pazienti locale |
| POST | /api/v1/anagrafica/ricerca-nar2 | user | Ricerca registro nazionale |
| POST | /api/v1/anagrafica/ricerca-massiva | superAdmin | Import massivo |
| POST | /api/v1/anagrafica/nuovi-assistiti | superAdmin | Nuovi pazienti |
| GET | /api/v1/anagrafica/get-geo-data | superAdmin | Dati geolocalizzazione |
| GET | /api/v1/anagrafica/get-geo-data-job | superAdmin | Job geolocalizzazione |
| GET | /api/v1/anagrafica/get-geo-data-job-status | user | Stato job geoloc |
| POST | /api/v1/anagrafica/get-geo-data-stats | superAdmin | Statistiche geoloc |

### 14.3 Extra Data Paziente (scopo: asp5-anagrafica + scopo categoria)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | /api/v1/anagrafica/extra-data-categorie/summary | Riepilogo categorie disponibili |
| GET | /api/v1/anagrafica/extra-data/:cf | Dati extra per CF |
| POST | /api/v1/anagrafica/extra-data/:cf | Imposta valori extra data |
| DELETE | /api/v1/anagrafica/extra-data/:cf | Elimina valori extra data |
| GET | /api/v1/anagrafica/extra-data/:cf/storico | Storico modifiche |

### 14.4 Cambio Medico (scopo: cambio-medico)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | /api/v1/cambio-medico/get-medici | Lista medici |
| POST | /api/v1/cambio-medico/get-medici-disponibili-assistito | Medici disponibili per paziente |
| POST | /api/v1/cambio-medico/get-situazioni-assistenziali-assistito | Situazione assistenziale |
| POST | /api/v1/cambio-medico/get-ambito-domicilio-assistito | Ambito domicilio |
| POST | /api/v1/cambio-medico/get-situazione-medico | Situazione medico |

### 14.5 MPI (scopo: mpi-{app}-read/write)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | /api/v1/mpi/record | Crea record MPI |
| GET | /api/v1/mpi/record/:mpiId | Dettaglio record |
| GET | /api/v1/mpi/record/by-idesterno/:idEsterno | Record per ID esterno |
| GET | /api/v1/mpi/record/by-assistito/:cf | Record per CF paziente |
| PUT | /api/v1/mpi/record/:mpiId | Aggiorna record |
| POST | /api/v1/mpi/record/:mpiId/link | Collega a paziente |
| POST | /api/v1/mpi/record/:mpiId/annulla | Annulla record |
| GET | /api/v1/mpi/record/:mpiId/storico | Storico operazioni |
| POST | /api/v1/mpi/ricerca | Ricerca cross-app |
| GET | /api/v1/mpi/record/:mpiId/extra-data | Extra data record MPI |
| POST | /api/v1/mpi/record/:mpiId/extra-data | Imposta extra data MPI |
| DELETE | /api/v1/mpi/record/:mpiId/extra-data | Elimina extra data MPI |
| GET | /api/v1/mpi/record/:mpiId/extra-data/storico | Storico extra data MPI |

### 14.6 Form Pubblici

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| GET | /forms | No | Pagina lista form |
| GET | /forms/:id | No | Pagina form |
| GET | /api/v1/forms | No | Lista form (JSON) |
| GET | /api/v1/forms/:id | No | Dettaglio form (JSON) |
| POST | /api/v1/forms/:id/submit | No | Invia form |
| GET | /api/v1/forms/:id/submissions | forms | Lista submissions |
| GET | /api/v1/forms/:id/submissions/export | forms | Export CSV |
| DELETE | /api/v1/forms/:id/submissions/:subId | forms | Elimina submission |
| POST | /api/v1/forms/import | admin | Importa form |
| DELETE | /api/v1/forms/:formId | admin | Elimina form |
| PUT | /api/v1/forms/:formId/settings | admin | Impostazioni form |
| GET | /api/v1/forms/global/settings | admin | Impostazioni globali |
| PUT | /api/v1/forms/global/settings | admin | Aggiorna impostazioni globali |
| POST | /api/v1/forms/global/logo | admin | Upload logo |

### 14.7 Amministrazione (scopo: admin-manage, livello: superAdmin)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | /api/v1/admin/users[/:id] | CRUD utenti |
| GET/POST/PUT/DELETE | /api/v1/admin/scopes[/:id] | CRUD scopi |
| GET/POST/PUT/DELETE | /api/v1/admin/domains[/:id] | CRUD ambiti |
| GET | /api/v1/admin/levels | Lista livelli |
| GET/POST/PUT/DELETE | /api/v1/admin/extra-data-categorie[/:id] | CRUD categorie extra data |
| POST | /api/v1/admin/extra-data-valori/search-assistito | Cerca paziente |
| GET/POST/DELETE | /api/v1/admin/extra-data-valori/:assistitoId | Gestione valori extra data |
| GET | /api/v1/admin/extra-data-valori/:assistitoId/storico | Storico extra data |
| GET/POST/PUT/DELETE | /api/v1/admin/mpi/applicazioni[/:id] | CRUD app MPI |
| POST | /api/v1/admin-op/cambio-password | Cambio password utente |
| POST | /api/v1/admin-op/reset-otp | Reset OTP utente |
| POST | /api/v1/admin-op/search-user | Cerca utente |
| POST | /api/v1/admin-op/registra-utente | Registra utente |
| POST | /api/v1/admin-op/modifica-utente | Modifica utente |

### 14.8 Docker Apps (scopo: apps)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | /api/v1/admin/apps/list | Lista applicazioni |
| GET | /api/v1/admin/apps/get | Dettaglio applicazione |
| POST | /api/v1/admin/apps/upload | Upload nuova app |
| POST | /api/v1/admin/apps/clone | Clona applicazione |
| POST | /api/v1/admin/apps/update | Aggiorna configurazione |
| POST | /api/v1/admin/apps/start | Avvia container |
| POST | /api/v1/admin/apps/stop | Ferma container |
| POST | /api/v1/admin/apps/restart | Riavvia container |
| POST | /api/v1/admin/apps/delete | Elimina applicazione |
| GET | /api/v1/admin/apps/logs | Log container |
| POST | /api/v1/admin/apps/docker-settings | Impostazioni Docker |

---

## 15. Sequenza di Avvio dell'Applicazione

```
[node app.js / sails lift]
        |
        v
[1. Sails.js Bootstrap (config/bootstrap.js)]
        |
        v
[2. Esecuzione migrazioni SQL pendenti]
[   - Scansione cartella migrations/]
[   - Per ogni file non ancora eseguito:]
[     - Parsing header database target]
[     - Esecuzione query SQL]
[     - Registrazione in _migrations]
        |
        v
[3. Configurazione Swagger]
[   - Aggiornamento URL server]
[   - Setup generatore documentazione]
        |
        v
[4. Sincronizzazione stato Docker]
[   - Riconciliazione config app con container reali]
[   - Aggiornamento stati (running/stopped)]
        |
        v
[5. Applicazione pronta]
[   - API disponibili]
[   - Admin panel attivo]
[   - Swagger docs serviti]
```

---

## 16. Dipendenze Tecnologiche

| Tecnologia | Versione | Utilizzo |
|------------|----------|----------|
| Sails.js | 1.5.14 | Framework MVC |
| Node.js | ^22.13 | Runtime |
| MySQL | - | Database (3 istanze) |
| Meilisearch | - | Motore ricerca full-text |
| JWT (jsonwebtoken) | - | Autenticazione token |
| Argon2 | - | Hashing password |
| otplib | - | TOTP (2FA) |
| Nodemailer | - | Invio email |
| Axios | - | Client HTTP |
| dockerode | - | Gestione container Docker |
| Moment.js | - | Gestione date |
| @turf/turf | - | Operazioni geospaziali |
| aziendasanitaria-utils | - | Utility sanitarie interne |
| Bootstrap 5 | - | UI pannello admin |
| EJS | - | Template engine |
| swagger-generator | - | Documentazione API |
| express-basic-auth | - | Protezione admin/docs |

---

## 17. Riepilogo Sicurezza

| Aspetto | Implementazione |
|---------|-----------------|
| Autenticazione | JWT con scadenza configurabile |
| 2FA | Email OTP (6 cifre, 10 min) + TOTP (app authenticator) |
| Hashing password | Argon2 (stato dell'arte) |
| Autorizzazione | RBAC (4 livelli) + Scope-based (wildcard supportati) |
| Protezione API | Policy middleware su tutte le route protette |
| Protezione Admin | Basic Auth HTTP + JWT superAdmin |
| Protezione Form | reCAPTCHA v3 + rate limiting |
| Audit Trail | Log completo di tutte le operazioni (DB dedicato) |
| Storico modifiche | Versionamento dati extra con vecchio/nuovo valore |
| Domain login | LDAP/Active Directory per utenti ASP |
| Segregazione dati | Ambiti (domini) per isolamento utenti |
| Database | 3 DB separati per dominio (auth, dati, log) |
| Secrets | File privati non versionati per credenziali |
