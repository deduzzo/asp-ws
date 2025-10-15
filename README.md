# ASP di Messina - Web Services

Applicazione Sails.js per la gestione dei servizi web dell'ASP di Messina (Azienda Sanitaria Provinciale). Il sistema fornisce API REST per la gestione dell'anagrafica assistiti, autenticazione, cambio medico e funzionalità amministrative.

## Requisiti

- **Node.js**: ^22.13
- **MySQL**: Database per gestione dati
- **Meilisearch**: Motore di ricerca full-text (opzionale)

## Tecnologie Principali

- **Sails.js 1.5.14**: Framework MVC
- **JWT**: Autenticazione basata su token
- **Argon2**: Hashing delle password
- **aziendasanitaria-utils**: Libreria utilities interna
- **Swagger**: Documentazione API
- **@turf/turf**: Operazioni geospaziali

## Installazione

```bash
# Clona il repository
git clone <repository-url>
cd asp-ws

# Installa le dipendenze
npm install

# Configura i file di configurazione privati
# Copia e modifica i file di esempio in config/custom/
cp config/custom/private_example.json config/custom/private.json

# Avvia l'applicazione in modalità sviluppo
sails lift
```

## Configurazione

### Database Multi-Database

L'applicazione utilizza tre database MySQL separati:

- **auth**: Autenticazione e autorizzazione (utenti, ruoli, scopi, ambiti)
- **anagrafica**: Dati anagrafici assistiti
- **log**: Logging applicativo

Configurare le connessioni in `config/datastores.js`.

### File di Configurazione Privati

I file sensibili sono esclusi dal repository e devono essere creati in `config/custom/`:

- `private.json`: Configurazioni private generali
- `private_jwt.json`: Secret JWT
- Altri file privati specifici

## Comandi Utili

### Sviluppo

```bash
# Avvia in modalità sviluppo
sails lift

# Avvia in modalità produzione
npm start
# oppure
NODE_ENV=production node app.js

# Linter
npm run lint

# Test
npm test

# Console REPL (accesso ai modelli)
sails console
```

### Generatori Sails

```bash
# Genera un nuovo controller
sails generate controller <nome>

# Genera un nuovo model
sails generate model <nome>

# Genera una nuova action
sails generate action <nome>

# Genera un nuovo helper
sails generate helper <nome>
```

## Architettura

### Sistema di Autenticazione e Autorizzazione

Sistema sofisticato basato su JWT con:

#### 1. Livelli di Login

- `guest` (0): Accesso limitato
- `user` (1): Utente standard
- `admin` (2): Amministratore
- `superAdmin` (99): Super amministratore

#### 2. Scopi (Scopes)

Permessi granulari per diverse aree API:
- `asp5-anagrafica`: Accesso all'anagrafica
- `cambio-medico`: Gestione cambio medico
- `admin-manage`: Funzioni amministrative
- Altri scopi personalizzati

#### 3. Ambiti (Domains)

Segregazione utenti per dominio:
- `api`: API generiche
- `asp.messina.it`: Dominio aziendale
- `globale`: Accesso globale

#### 4. Policy di Protezione

La policy `is-token-verified` valida:
- Validità e scadenza token JWT
- Livello di autenticazione richiesto
- Scopi necessari
- Appartenenza al dominio
- Stato attivo dell'account

Le rotte sono protette in `config/routes.js` specificando `scopi`, `ambito` e `minAuthLevel`.

### Formato Risposta API

Tutte le risposte API utilizzano il formato standardizzato tramite `ApiResponse`:

```javascript
// Successo
return res.ApiResponse({
  data: { /* dati */ }
});

// Errore
return res.ApiResponse({
  errType: ERROR_TYPES.NOT_FOUND,
  errMsg: 'Risorsa non trovata'
});
```

Struttura della risposta:
```json
{
  "ok": true|false,
  "err": { "code": "CODICE_ERRORE", "msg": "Messaggio errore" } | null,
  "data": { /* dati */ } | null
}
```

### Sistema di Logging

Logging automatico di tutte le richieste e risposte API tramite l'helper `log`:

```javascript
await sails.helpers.log.with({
  level: 'info',
  tag: LOG_TAGS.ANAGRAFICA,
  action: 'get-assistito',
  ip: req.ip,
  user: req.user,
  params: req.allParams()
});
```

I log includono:
- Livello (info, warn, error)
- Tag per categorizzazione
- Azione eseguita
- Indirizzo IP
- Utente autenticato
- Parametri della richiesta

### Organizzazione Controller

```
api/controllers/
├── anagrafica/          # Operazioni anagrafica assistiti
├── login/               # Endpoint autenticazione
├── admin/               # Funzioni amministrative
├── cambio-medico/       # Gestione cambio medico
└── stats/               # Endpoint statistiche
```

### Servizi Principali

```
api/services/
├── JwtService.js            # Generazione e verifica JWT
├── AssistitoService.js      # Operazioni dati assistiti
├── MeilisearchService.js    # Integrazione ricerca
├── MediciService.js         # Gestione dati medici
├── MailService.js           # Invio email
└── JobManager.js            # Gestione job in background
```

### Helper

```
api/helpers/
├── log.js                   # Helper logging
├── domain-login.js          # Autenticazione LDAP/AD
└── altri helper...
```

## Documentazione API

La documentazione Swagger è disponibile all'endpoint `/docs` (protetto da basic auth).

Le statistiche dinamiche (totale assistiti, ultimo aggiornamento, percentuale geolocalizzazione) sono iniettate nello spec Swagger a runtime tramite l'endpoint `/api/v1/stats/info`.

## Login con Dominio

L'applicazione supporta l'autenticazione Active Directory/LDAP tramite l'helper `domain-login` per il dominio asp.messina.it. Il suffisso del dominio viene automaticamente rimosso dagli username durante il login.

## Best Practices

### 1. Utilizzo Modelli

I modelli sono automaticamente globalizzati da Sails e accessibili ovunque:

```javascript
// Accesso diretto ai modelli
const assistiti = await Anagrafica_Assistiti.find();
const utenti = await Auth_Utenti.find();
```

### 2. Risposta API Standardizzata

Utilizzare sempre `res.ApiResponse()` invece di `res.json()`:

```javascript
// CORRETTO
return res.ApiResponse({ data: results });

// EVITARE
return res.json(results);
```

### 3. Helper

Invocare gli helper tramite `sails.helpers.<nomeHelper>()`:

```javascript
await sails.helpers.log.with({
  level: 'info',
  tag: LOG_TAGS.AUTH,
  action: 'login-success'
});
```

### 4. Protezione Rotte

Configurare la protezione in `config/routes.js`:

```javascript
'POST /api/v1/assistiti': {
  controller: 'anagrafica/search',
  action: 'search',
  scopi: ['asp5-anagrafica'],
  ambito: ['api', 'asp.messina.it'],
  minAuthLevel: 1
}
```

### 5. Gestione Errori

Utilizzare i tipi di errore definiti e il sistema di logging:

```javascript
try {
  // operazione
} catch (err) {
  await sails.helpers.log.with({
    level: 'error',
    tag: LOG_TAGS.ERROR,
    action: 'operazione-fallita',
    context: { error: err.message }
  });

  return res.ApiResponse({
    errType: ERROR_TYPES.SERVER_ERROR,
    errMsg: 'Errore durante l\'operazione'
  });
}
```

## Struttura del Progetto

```
asp-ws/
├── api/
│   ├── controllers/        # Controller organizzati per dominio
│   ├── models/            # Modelli dati (waterline ORM)
│   ├── helpers/           # Helper riutilizzabili
│   ├── services/          # Servizi business logic
│   ├── policies/          # Policy di autenticazione/autorizzazione
│   └── responses/         # Response handler personalizzati
├── config/
│   ├── routes.js          # Definizione rotte
│   ├── policies.js        # Mapping policy
│   ├── datastores.js      # Configurazione database
│   ├── custom.js          # Configurazioni custom
│   ├── bootstrap.js       # Logica inizializzazione
│   └── custom/            # File configurazione privati
├── assets/                # Asset statici
├── views/                 # Template view
├── tasks/                 # Task Grunt
├── CLAUDE.md             # Guida per Claude Code
└── package.json
```

## Deployment

### Produzione

```bash
# Imposta variabile d'ambiente
export NODE_ENV=production

# Avvia applicazione
node app.js

# Oppure con PM2
pm2 start app.js --name asp-ws
```

### Variabili d'Ambiente

Configurare le seguenti variabili d'ambiente in produzione:

- `NODE_ENV=production`
- Configurazioni database in `config/datastores.js`
- Secret JWT in `config/custom/private_jwt.json`

## Troubleshooting

### Errori Comuni

1. **Errore connessione database**: Verificare le credenziali in `config/datastores.js`
2. **Token JWT non valido**: Verificare la configurazione in `config/custom/private_jwt.json`
3. **Permessi insufficienti**: Controllare scopi e ambiti dell'utente nel database auth

### Log

I log sono salvati nel database `log` e possono essere consultati tramite query dirette o tramite l'interfaccia amministrativa.

## Contribuire

1. Creare un branch per la feature: `git checkout -b feature/nuova-funzionalita`
2. Commit delle modifiche: `git commit -m 'Aggiunta nuova funzionalità'`
3. Push del branch: `git push origin feature/nuova-funzionalita`
4. Aprire una Pull Request

## Licenza

[Specificare la licenza]

## Contatti

ASP di Messina - [Informazioni di contatto]

## Note

- I file di configurazione privati contenenti secret non sono inclusi nel repository
- Assicurarsi di configurare correttamente tutti i database prima dell'avvio
- Per il dominio asp.messina.it è necessaria la configurazione LDAP/Active Directory

---

## Version Info

This app was originally generated on Sat Jan 25 2025 07:07:23 GMT+0100 using Sails v1.5.14.

### Links

+ [Sails framework documentation](https://sailsjs.com/get-started)
+ [Version notes / upgrading](https://sailsjs.com/documentation/upgrading)
+ [Deployment tips](https://sailsjs.com/documentation/concepts/deployment)
+ [Community support options](https://sailsjs.com/support)
+ [Professional / enterprise options](https://sailsjs.com/enterprise)
