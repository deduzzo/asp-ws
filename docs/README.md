# Introduzione

## ASP Messina Web Services

Piattaforma di web services per l'**Azienda Sanitaria Provinciale di Messina**, costruita su Sails.js con architettura multi-database, autenticazione JWT e controllo accessi basato su ruoli e scope.

## Moduli del Sistema

| Modulo | Descrizione |
|--------|-------------|
| **Anagrafica Assistiti** | Registro pazienti con ricerca avanzata, integrazione SistemaTS e geolocalizzazione |
| **Master Patient Index** | Collegamento record da applicazioni esterne ai pazienti del registro centrale |
| **Extra Data** | Sistema flessibile di dati aggiuntivi per categoria con schema, validazione e audit trail |
| **Dati Clinici HL7** | Allergie, patologie croniche, terapie, esenzioni, consensi, parametri vitali, contatti emergenza |
| **SIAD** | Presa in carico, valutazione sanitaria e sociale per assistenza domiciliare |
| **Forms Dinamici** | Form serverless definiti via JSON con multi-pagina, validazione e reCAPTCHA |
| **Apps Docker** | Deploy e gestione app containerizzate con reverse proxy |
| **Autenticazione** | JWT con scope granulari, wildcard, OTP (email e TOTP), Active Directory |

## API Endpoints — Riepilogo Completo

### Login e Autenticazione

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/api/v1/login/get-token` | Login e ottenimento JWT |
| `POST` | `/api/v1/login/verify-token` | Verifica validita token |
| `POST` | `/api/v1/login/otp/setup` | Configurazione OTP |
| `POST` | `/api/v1/login/otp/switch` | Cambio metodo OTP |

### Anagrafica

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/api/v1/anagrafica/ricerca` | Ricerca assistiti (scope: `asp5-anagrafica`) |
| `GET` | `/api/v1/anagrafica/extra-data/:cf` | Extra data per assistito |
| `POST` | `/api/v1/anagrafica/extra-data/:cf` | Scrivi extra data |
| `DELETE` | `/api/v1/anagrafica/extra-data/:cf` | Elimina extra data |
| `GET` | `/api/v1/anagrafica/extra-data/:cf/storico` | Storico modifiche |
| `GET` | `/api/v1/anagrafica/extra-data-categorie/summary` | Lista categorie disponibili |

### MPI — Master Patient Index

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/api/v1/mpi/record` | Crea record MPI |
| `GET` | `/api/v1/mpi/record/:mpiId` | Dettaglio record |
| `PUT` | `/api/v1/mpi/record/:mpiId` | Aggiorna dati (solo se aperto) |
| `POST` | `/api/v1/mpi/record/:mpiId/link` | Collega a un assistito via CF |
| `POST` | `/api/v1/mpi/record/:mpiId/annulla` | Annulla record |
| `GET` | `/api/v1/mpi/record/:mpiId/storico` | Audit trail |
| `POST` | `/api/v1/mpi/ricerca` | Ricerca cross-applicazione |
| `GET` | `/api/v1/mpi/record/by-assistito/:cf` | Record per assistito |
| `GET` | `/api/v1/mpi/record/by-idesterno/:idEsterno` | Record per ID esterno |

### MPI Extra Data

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/mpi/record/:mpiId/extra-data` | Leggi extra data MPI |
| `POST` | `/api/v1/mpi/record/:mpiId/extra-data` | Scrivi extra data MPI |
| `DELETE` | `/api/v1/mpi/record/:mpiId/extra-data` | Elimina extra data MPI |
| `GET` | `/api/v1/mpi/record/:mpiId/extra-data/storico` | Storico modifiche MPI |

### Forms

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/forms/:id` | Visualizza form (pagina web) |
| `GET` | `/api/v1/forms/:id` | Definizione JSON del form |

### Admin — Utenti e Permessi

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/utenti` | Lista utenti |
| `POST` | `/api/v1/admin/utenti` | Crea utente |
| `PUT` | `/api/v1/admin/utenti/:id` | Modifica utente |
| `DELETE` | `/api/v1/admin/utenti/:id` | Disattiva utente |
| `POST` | `/api/v1/admin/utenti/:id/scopi` | Assegna scope |
| `DELETE` | `/api/v1/admin/utenti/:id/scopi` | Rimuovi scope |
| `POST` | `/api/v1/admin/utenti/:id/reset-password` | Reset password |

### Admin — Categorie Extra Data

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/extra-data-categorie` | Lista categorie |
| `POST` | `/api/v1/admin/extra-data-categorie` | Crea categoria |
| `PUT` | `/api/v1/admin/extra-data-categorie/:id` | Modifica categoria |
| `DELETE` | `/api/v1/admin/extra-data-categorie/:id` | Disattiva categoria |

### Admin — MPI

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/mpi/applicazioni` | Lista applicazioni MPI |
| `POST` | `/api/v1/admin/mpi/applicazioni` | Crea applicazione |
| `PUT` | `/api/v1/admin/mpi/applicazioni/:id` | Modifica applicazione |
| `DELETE` | `/api/v1/admin/mpi/applicazioni/:id` | Disattiva applicazione |
| `POST` | `/api/v1/admin/mpi/records/search` | Ricerca record (admin) |
| `GET` | `/api/v1/admin/mpi/records/:mpiId` | Dettaglio record (admin) |
| `POST` | `/api/v1/admin/mpi/records` | Crea record (admin) |
| `PUT` | `/api/v1/admin/mpi/records/:mpiId` | Modifica record (admin) |
| `GET` | `/api/v1/admin/mpi/records/:mpiId/storico` | Storico record (admin) |
| `POST` | `/api/v1/admin/mpi/records/:mpiId/link` | Link record (admin) |
| `POST` | `/api/v1/admin/mpi/records/:mpiId/annulla` | Annulla record (admin) |

### Admin — Apps Docker

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/apps/list` | Lista app |
| `GET` | `/api/v1/admin/apps/get?id=<id>` | Dettaglio app |
| `POST` | `/api/v1/admin/apps/clone` | Clone da GitHub |
| `POST` | `/api/v1/admin/apps/upload` | Upload ZIP |
| `POST` | `/api/v1/admin/apps/start` | Avvia container |
| `POST` | `/api/v1/admin/apps/stop` | Ferma container |
| `POST` | `/api/v1/admin/apps/restart` | Riavvia container |
| `POST` | `/api/v1/admin/apps/update` | Aggiorna da GitHub |
| `POST` | `/api/v1/admin/apps/delete` | Elimina app |
| `GET` | `/api/v1/admin/apps/logs?id=<id>` | Log container |

## Categorie Extra Data

### HL7

| Codice | Descrizione | Tipo |
|--------|-------------|------|
| `HL7_CONTATTI_EMERGENZA` | Contatti di emergenza | Campi singoli |
| `HL7_ALLERGIE` | Allergie e intolleranze | JSON lista |
| `HL7_PATOLOGIE_CRONICHE` | Patologie croniche | JSON lista |
| `HL7_ESENZIONI` | Esenzioni SSN | JSON lista |
| `HL7_TERAPIE_CRONICHE` | Terapie farmacologiche | JSON lista |
| `HL7_PARAMETRI_VITALI` | Parametri vitali | Campi singoli |
| `HL7_CONSENSI` | Consensi informati | JSON lista |
| `HL7_ANAGRAFICA_EXTRA` | Stato civile, professione, titolo studio | Campi singoli |

### SIAD

| Codice | Descrizione | Tipo |
|--------|-------------|------|
| `SIAD_PRESA_IN_CARICO` | Presa in carico assistenza domiciliare | Campi singoli |
| `SIAD_VALUTAZIONE_SANITARIA` | Valutazione sanitaria (37 campi) | Campi singoli (si/no) |
| `SIAD_VALUTAZIONE_SOCIALE` | Valutazione sociale | Campi singoli |

### Generiche

| Codice | Descrizione | Tipo |
|--------|-------------|------|
| `CONTATTI` | Recapiti telefonici e email | Campi singoli |
| `EXTRA` | Note generiche | Campi singoli |

## Tecnologie

- **Backend**: Sails.js v1.5.14 (Node.js ^22.13)
- **Database**: MySQL (3 istanze: anagrafica, auth, log)
- **Autenticazione**: JWT + Argon2 + OTP (email/TOTP)
- **Ricerca**: Meilisearch full-text
- **Geolocalizzazione**: Turf.js
- **Container**: Docker + Dockerode
- **Documentazione API**: Swagger/OpenAPI
- **Knowledge Base**: Docsify

## Database

| Database | Contenuto |
|----------|-----------|
| `anagrafica` | Registro pazienti, extra data, MPI records, MPI applicazioni |
| `auth` | Utenti, scope, domini |
| `log` | Log richieste API, form submissions |

## Formato Risposte API

```json
// Successo
{ "ok": true, "err": null, "data": { ... } }

// Errore
{ "ok": false, "err": { "code": "NOT_FOUND", "msg": "..." }, "data": null }
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

Per dettagli su ogni feature, consulta la pagina [Roadmap](roadmap.md).
