# Docker Apps - Setup Autenticazione

## Modifiche effettuate

### 1. Sistema di Login Indipendente
La pagina `/admin/apps` ora ha un **sistema di login completamente indipendente** che:
- Richiede credenziali specifiche per l'accesso
- Verifica che l'utente abbia l'**ambito "api"** e lo **scopo "apps"**
- Memorizza il token JWT separatamente in `localStorage` con chiave `apps_auth_token`
- Mostra un modal di login all'accesso se non autenticato

### 2. Nuovo Scopo "apps"
È stato creato un nuovo scopo chiamato `apps` per gestire i permessi relativi alla gestione delle applicazioni Docker.

### 3. Aggiornamento Route API
Tutte le route API per la gestione delle apps ora richiedono:
- Scopo: `apps`
- Ambito: `api`
- Livello minimo: `superAdmin`

## Istruzioni per il Setup

### Passo 1: Creare lo scopo "apps" nel database

Eseguire lo script SQL sul database `auth`:

```bash
mysql -u <username> -p auth < scripts/add_apps_scope.sql
```

Oppure eseguire manualmente:

```sql
INSERT INTO scopi (scopo, attivo, createdAt, updatedAt)
SELECT 'apps', 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM scopi WHERE scopo = 'apps'
);
```

### Passo 2: Assegnare lo scopo agli utenti

1. Accedere al pannello admin: `http://localhost:1337/admin`
2. Effettuare il login con le credenziali admin
3. Andare nella sezione "Utenti"
4. Modificare l'utente desiderato
5. Nella sezione "Scopi", selezionare il nuovo scopo `apps`
6. Salvare le modifiche

### Passo 3: Testare l'accesso

1. Navigare su `http://localhost:1337/admin/apps`
2. Apparirà automaticamente un modal di login
3. Inserire le credenziali di un utente che ha:
   - Ambito: `api`
   - Scopo: `apps`
4. Dopo il login, la pagina caricherà le applicazioni Docker
5. L'header mostrerà il nome utente e un pulsante di logout

## Dettagli Tecnici

### Route API modificate:
- `GET /api/v1/admin/apps/list` - Lista tutte le apps
- `GET /api/v1/admin/apps/get` - Dettagli di una app
- `POST /api/v1/admin/apps/upload` - Upload ZIP
- `POST /api/v1/admin/apps/clone` - Clone da GitHub
- `POST /api/v1/admin/apps/update` - Aggiorna da GitHub
- `POST /api/v1/admin/apps/start` - Avvia app
- `POST /api/v1/admin/apps/stop` - Ferma app
- `POST /api/v1/admin/apps/restart` - Riavvia app
- `POST /api/v1/admin/apps/delete` - Elimina app
- `GET /api/v1/admin/apps/logs` - Visualizza logs

### Autenticazione

#### Login Flow
1. All'accesso della pagina `/admin/apps`, viene verificata la presenza del token `apps_auth_token` in `localStorage`
2. Se non presente, viene mostrato un modal di login con backdrop statico (non chiudibile)
3. L'utente inserisce username e password
4. Viene effettuata una chiamata POST a `/api/v1/login/get-token` con:
   - `login`: username dell'utente
   - `password`: password dell'utente
   - `scopi`: `'apps'` (stringa con scopi separati da spazi)
   - `ambito`: `'api'`
5. Il backend verifica che l'utente abbia l'ambito `api` e lo scopo `apps`
6. Se la verifica ha successo, viene restituito un token JWT
7. Il token viene salvato in `apps_auth_token` e le info utente in `apps_auth_user`
8. Il token viene automaticamente incluso in tutte le richieste axios:

```javascript
axios.defaults.headers.common['Authorization'] = `Bearer ${appsAuthToken}`;
```

#### Logout
- Pulsante "Logout" visibile nell'header dopo il login
- Rimuove `apps_auth_token` e `apps_auth_user` da `localStorage`
- Ricarica la pagina mostrando nuovamente il modal di login

#### Token Storage
- **Token**: `localStorage.getItem('apps_auth_token')`
- **User Data**: `localStorage.getItem('apps_auth_user')` (JSON stringified)
