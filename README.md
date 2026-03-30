# ASP di Messina - Web Services

Piattaforma di web services per l'**Azienda Sanitaria Provinciale di Messina**. Il sistema fornisce API REST per la gestione dell'anagrafica assistiti, Master Patient Index, dati clinici HL7, assistenza domiciliare SIAD, form dinamici, app containerizzate e funzionalita amministrative.

## Requisiti

- **Node.js**: ^22.13
- **MySQL**: 3 istanze separate (anagrafica, auth, log)
- **Meilisearch**: Motore di ricerca full-text
- **Docker**: Per gestione app containerizzate (opzionale)

## Tecnologie

- **Sails.js 1.5.14**: Framework MVC
- **JWT + Argon2 + OTP**: Autenticazione e sicurezza
- **aziendasanitaria-utils**: Libreria utilities interna
- **Swagger/OpenAPI**: Documentazione API
- **Docsify**: Knowledge Base
- **@turf/turf**: Operazioni geospaziali
- **Dockerode**: Gestione container Docker
- **Alpine.js + Tailwind CSS**: Frontend form dinamici

## Installazione

```bash
git clone <repository-url>
cd asp-ws
npm install

# Configura i file privati
cp config/custom/private_example.json config/custom/private.json
# Modifica config/custom/private_jwt.json, private_ui_users.json, ecc.

# Avvia in sviluppo
sails lift
```

## Moduli del Sistema

### Anagrafica Assistiti
Registro centrale pazienti (~500k record) con ricerca avanzata, integrazione SistemaTS (MEF) per codici STP/ENI, geolocalizzazione automatica indirizzi.

### Master Patient Index (MPI)
Sistema per collegare record da applicazioni esterne (PS, CUP, sistemi dipartimentali) ai pazienti del registro centrale. Supporta:
- Registrazione applicazioni esterne
- Creazione record con dati parziali
- Collegamento (link) a un assistito tramite codice fiscale
- Ricerca cross-applicazione
- Rilevamento collisioni (duplicati potenziali)
- Audit trail completo

### Extra Data System
Sistema flessibile di dati aggiuntivi strutturati per categoria:
- Schema di validazione JSON per campo
- Versionamento e audit trail di ogni modifica
- Controllo accessi granulare per categoria (scope read/write)
- Supporto wildcard scope (`anagrafica-hl7_*-read`)
- Disponibile sia per assistiti che per record MPI

### Dati Clinici HL7
Categorie extra data ispirate allo standard HL7 v2.5:

| Categoria | Descrizione |
|-----------|-------------|
| `HL7_CONTATTI_EMERGENZA` | Contatti di emergenza |
| `HL7_ALLERGIE` | Allergie e intolleranze |
| `HL7_PATOLOGIE_CRONICHE` | Patologie croniche (ICD9/ICD10) |
| `HL7_ESENZIONI` | Esenzioni SSN |
| `HL7_TERAPIE_CRONICHE` | Terapie farmacologiche |
| `HL7_PARAMETRI_VITALI` | Pressione, FC, peso, SpO2, glicemia, temperatura |
| `HL7_CONSENSI` | Consensi informati |
| `HL7_ANAGRAFICA_EXTRA` | Stato civile, titolo studio, professione, condizione lavorativa |

### SIAD - Assistenza Domiciliare
Categorie extra data ispirate al flusso SIAD v7.4 del Ministero della Salute:

| Categoria | Descrizione |
|-----------|-------------|
| `SIAD_PRESA_IN_CARICO` | Data, soggetto richiedente, tipologia PIC, patologie ICD9, nucleo familiare |
| `SIAD_VALUTAZIONE_SANITARIA` | 37 campi clinici: autonomia, mobilita, bisogni assistenziali (si/no), cure palliative, riabilitazione |
| `SIAD_VALUTAZIONE_SOCIALE` | Supporto sociale, fragilita familiare, disturbi cognitivi/comportamentali |

### Forms Dinamici
Form serverless definiti tramite file JSON in `/api/data/forms/`:
- Multi-pagina con progress bar
- Validazioni (required, email, telefono, regex)
- Tipi campo: text, textarea, radio, checkbox, select
- reCAPTCHA v3 integrato
- 2 temi UI (Modern, Healthcare)
- Submission salvate nel database

### Apps Docker
Deploy e gestione applicazioni containerizzate:
- Clone da GitHub o upload ZIP
- Start/stop/restart container
- Reverse proxy su `/apps/<app-id>/`
- Log container in tempo reale
- Aggiornamento da GitHub (git pull)

### Autenticazione e Autorizzazione
- **JWT** con livelli (guest, user, admin, superAdmin)
- **Scope** granulari con supporto wildcard (`*`)
- **Domini** (api, asp.messina.it, globale)
- **OTP** via email o TOTP (Google Authenticator)
- **Active Directory/LDAP** per dominio asp.messina.it
- **Password hashing** con Argon2

## API Endpoints

### Login
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/api/v1/login/get-token` | Login e ottenimento JWT |
| `POST` | `/api/v1/login/verify-token` | Verifica token |

### Anagrafica
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/api/v1/anagrafica/ricerca` | Ricerca assistiti |
| `GET` | `/api/v1/anagrafica/extra-data/:cf` | Leggi extra data |
| `POST` | `/api/v1/anagrafica/extra-data/:cf` | Scrivi extra data |
| `DELETE` | `/api/v1/anagrafica/extra-data/:cf` | Elimina extra data |
| `GET` | `/api/v1/anagrafica/extra-data/:cf/storico` | Storico modifiche |
| `GET` | `/api/v1/anagrafica/extra-data-categorie/summary` | Lista categorie |

### MPI
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/api/v1/mpi/record` | Crea record |
| `GET` | `/api/v1/mpi/record/:mpiId` | Dettaglio record |
| `PUT` | `/api/v1/mpi/record/:mpiId` | Aggiorna (solo se aperto) |
| `POST` | `/api/v1/mpi/record/:mpiId/link` | Collega a assistito |
| `POST` | `/api/v1/mpi/record/:mpiId/annulla` | Annulla record |
| `GET` | `/api/v1/mpi/record/:mpiId/storico` | Audit trail |
| `POST` | `/api/v1/mpi/ricerca` | Ricerca cross-app |
| `GET/POST/DELETE` | `/api/v1/mpi/record/:mpiId/extra-data` | Extra data MPI |

### Forms
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/forms/:id` | Visualizza form |
| `GET` | `/api/v1/forms/:id` | Definizione JSON |

### Admin
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET/POST/PUT/DELETE` | `/api/v1/admin/utenti` | CRUD utenti |
| `GET/POST/PUT/DELETE` | `/api/v1/admin/extra-data-categorie` | CRUD categorie |
| `GET/POST/PUT/DELETE` | `/api/v1/admin/mpi/applicazioni` | CRUD app MPI |
| `POST/GET` | `/api/v1/admin/mpi/records/*` | Gestione record MPI |
| `GET/POST` | `/api/v1/admin/apps/*` | Gestione app Docker |

## Interfacce Web

| URL | Descrizione | Protezione |
|-----|-------------|------------|
| `/` | Homepage | Pubblica |
| `/docs` | Swagger UI API | Basic Auth |
| `/kb` | Knowledge Base (Docsify) | Basic Auth |
| `/admin` | Pannello amministrazione | Basic Auth + JWT |
| `/forms/:id` | Form dinamici | Pubblica |
| `/apps/:id` | App containerizzate | Pubblica |

## Database

| Database | Tabelle principali |
|----------|-------------------|
| `anagrafica` | assistiti, extra_data_categorie, extra_data_valori, extra_data_storico, mpi_record, mpi_applicazioni, mpi_record_storico, mpi_extra_data_valori, mpi_extra_data_storico |
| `auth` | utenti, scopi, ambiti, utenti_scopi, utenti_ambiti |
| `log` | log, form_submissions |

### Migrazioni
Le migrazioni SQL in `migrations/` vengono eseguite automaticamente al `sails lift`. Ogni file deve avere l'header `-- database: anagrafica|auth|log`. Convenzione nomi: `YYYYMMDD_NNN_descrizione.sql`.

## Struttura Progetto

```
asp-ws/
├── api/
│   ├── controllers/
│   │   ├── anagrafica/        # Ricerca e extra data assistiti
│   │   ├── anagrafica/extra-data/  # CRUD extra data
│   │   ├── mpi/               # Master Patient Index
│   │   ├── mpi/extra-data/    # Extra data su record MPI
│   │   ├── login/             # Autenticazione
│   │   ├── admin/             # Gestione utenti, categorie
│   │   ├── admin/mpi/         # Admin MPI
│   │   ├── admin/apps/        # Admin Docker apps
│   │   ├── forms/             # Form dinamici
│   │   ├── cambio-medico/     # Cambio medico
│   │   └── stats/             # Statistiche
│   ├── models/                # Modelli (Waterline ORM)
│   ├── helpers/               # Helper riutilizzabili
│   ├── services/              # Business logic
│   ├── policies/              # Policy auth
│   ├── responses/             # Response handler (ApiResponse)
│   ├── hooks/                 # Hook (apps-proxy)
│   └── data/forms/            # Definizioni form JSON
├── config/
│   ├── routes.js              # Definizione rotte + auth
│   ├── policies.js            # Mapping policy
│   ├── datastores.js          # Connessioni database
│   ├── bootstrap.js           # Init + migrazioni
│   └── custom/                # File privati (git-ignored)
├── migrations/                # Migrazioni SQL
├── docs/                      # Knowledge Base (Docsify)
├── views/                     # Template EJS
├── assets/                    # Asset statici
└── .apps/                     # App Docker (git-ignored)
```

## Comandi

```bash
sails lift              # Sviluppo
npm start               # Produzione
npm run lint            # Linter
npm test                # Test
sails console           # REPL con accesso ai modelli
```

## Deployment

```bash
export NODE_ENV=production
node app.js
# oppure
pm2 start app.js --name asp-ws
```

## Roadmap

| # | Feature | Effort | Valore |
|---|---------|--------|--------|
| 1 | Timeline Paziente | Basso | Alto |
| 2 | MPI Merge/Unmerge | Medio | Alto |
| 3 | Report e Statistiche | Medio | Alto |
| 4 | Webhook/Notifiche | Medio | Alto |
| 5 | Alerting Clinico | Alto | Alto |
| 6 | Import/Export Massivo | Medio | Medio |
| 7 | API Key + Rate Limiting | Medio | Medio-Alto |
| 8 | Gestione Documenti/Allegati | Medio | Medio |
| 9 | Cambio Medico Evoluto | Medio | Medio |
| 10 | Portale Medico (MMG/PLS) | Alto | Molto alto |

Dettagli nella [Knowledge Base](/kb).

---

**ASP5 Messina - SIA Area Progettazione e Sviluppo - Ing. Roberto De Domenico**
