# Introduzione

## ASP Messina Web Services

Piattaforma di web services per l'**Azienda Sanitaria Provinciale di Messina**, costruita su Sails.js con architettura multi-database, autenticazione JWT e controllo accessi basato su ruoli e scope.

### Funzionalita principali

| Modulo | Descrizione |
|--------|-------------|
| **Anagrafica Assistiti** | Registro pazienti con ricerca avanzata, integrazione SistemaTS e geolocalizzazione |
| **Master Patient Index** | Collegamento record da applicazioni esterne ai pazienti del registro centrale |
| **Dati Clinici HL7** | Extra data strutturati: allergie, patologie, terapie, consensi, parametri vitali |
| **SIAD** | Presa in carico, valutazione sanitaria e sociale per assistenza domiciliare |
| **Autenticazione** | JWT con scope granulari, wildcard, OTP (email e TOTP) |

### Tecnologie

- **Backend**: Sails.js v1.5.14 (Node.js ^22.13)
- **Database**: MySQL (3 istanze: anagrafica, auth, log)
- **Autenticazione**: JWT + Argon2 + OTP
- **Ricerca**: Meilisearch full-text
- **Geolocalizzazione**: Turf.js
- **Documentazione API**: Swagger/OpenAPI

### Database

Il sistema utilizza tre database MySQL separati:

| Database | Contenuto |
|----------|-----------|
| `anagrafica` | Registro pazienti, extra data, MPI records |
| `auth` | Utenti, ruoli, scope, domini |
| `log` | Log di tutte le richieste API |

### Formato Risposte API

Tutte le risposte usano il formato unificato `ApiResponse`:

```json
{
  "ok": true,
  "err": null,
  "data": { "risultato": "..." }
}
```

In caso di errore:

```json
{
  "ok": false,
  "err": { "code": "NOT_FOUND", "msg": "Risorsa non trovata" },
  "data": null
}
```
