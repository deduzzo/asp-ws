# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Sails.js v1.5.14 application providing web services for ASP di Messina (healthcare services). The application uses a multi-database architecture with JWT-based authentication and role-based access control.

## Common Commands

### Development
```bash
# Start the application in development mode
sails lift

# Start in production mode
npm start
# or
NODE_ENV=production node app.js

# Run linter
npm run lint

# Run tests
npm test
```

### Sails-specific Commands
```bash
# Generate a new controller
sails generate controller <name>

# Generate a new model
sails generate model <name>

# Generate a new action
sails generate action <name>

# Generate a new helper
sails generate helper <name>

# Console (REPL with access to models)
sails console
```

## Architecture

### Multi-Database Setup

The application uses three separate MySQL databases:
- **auth**: Authentication and authorization (users, roles, scopes, domains)
- **anagrafica**: Patient registry data and extra data
- **log**: Application logging

Database connections are configured in `config/datastores.js`. Models specify which datastore to use via the `datastore` attribute. The setting `migrate: 'safe'` is used — tables are never auto-created by Sails, migrations are handled by the custom migration system.

### Migration System

The application has a custom SQL migration system that runs automatically on `sails lift`.

**How it works:**
1. SQL files in `migrations/` are executed in alphabetical order at startup via `config/bootstrap.js`
2. Each database has a `_migrations` table that tracks which migrations have been executed
3. A migration is never re-executed once registered
4. If a migration fails, it's logged but doesn't block the others — it will be retried on next lift

**File naming convention:**
```
YYYYMMDD_NNN_descrizione.sql
```
Example: `20260323_001_extra_data.sql`

**Required header** — every file must declare the target database:
```sql
-- database: anagrafica
```
Valid databases: `anagrafica`, `auth`, `log`

**Helper:** `api/helpers/run-migrations.js` — called from `config/bootstrap.js`

**Datastore-to-model mapping** (used internally for `sendNativeQuery`):
- `anagrafica` → `Anagrafica_Assistiti`
- `auth` → `Auth_Utenti`
- `log` → `Log`

### Authentication & Authorization

**JWT-based authentication** with a sophisticated permission system:

1. **Login levels** (defined in `api/services/JwtService.js`):
   - `guest` (0)
   - `user` (1)
   - `admin` (2)
   - `superAdmin` (99)

2. **Scopes (scopi)**: Granular permissions for different API areas (e.g., 'asp5-anagrafica', 'cambio-medico', 'admin-manage')

3. **Domains (ambiti)**: Segregate users by domain (e.g., 'api', 'asp.messina.it', 'globale')

4. **Policy enforcement**: The `is-token-verified` policy validates JWT tokens and checks:
   - Token validity and expiration
   - User has required login level
   - User has required scopes
   - User belongs to required domain
   - User account is active
   - Exposes `req.tokenData` (username, scopi, ambito, livello) for controllers

5. **Wildcard scopes**: Scope matching supports `*` wildcard via `api/helpers/scope-matches.js`:
   - `anagrafica-hl7_*-read` matches all HL7 categories
   - `anagrafica-*-read` matches all extra data categories
   - Always use `sails.helpers.scopeMatches(userScopi, requiredScope)` instead of `includes()`

Routes are protected in `config/routes.js` by specifying `scopi`, `ambito`, and `minAuthLevel` properties.

### Extra Data System

A flexible system for adding dynamic data to patients (assistiti), organized by categories with versioning and scope-based access control.

**Models** (database `anagrafica`):
- `Anagrafica_ExtraDataCategorie` → `extra_data_categorie` — category definitions with field schemas
- `Anagrafica_ExtraDataValori` → `extra_data_valori` — current values per assistito/category/key
- `Anagrafica_ExtraDataStorico` → `extra_data_storico` — audit trail of all changes

**Scope convention:**
- Pattern: `anagrafica-{codice_lowercase}-read` / `anagrafica-{codice_lowercase}-write`
- Category `HL7_ALLERGIE` → `anagrafica-hl7_allergie-read`, `anagrafica-hl7_allergie-write`
- Scopes are auto-created in `Auth_Scopi` when a category is created via admin endpoint
- Wildcard scopes (e.g., `anagrafica-hl7_*-read`) must be created manually

**Field types supported:** `string`, `number`, `boolean`, `date`, `json`
- Use `json` type for multi-value data (e.g., list of allergies, medications)

**Default HL7 categories** (created by migration `20260323_002`):
- `HL7_CONTATTI_EMERGENZA` — individual fields (nome, relazione, telefono)
- `HL7_ALLERGIE` — JSON list [{sostanza, tipo, criticita, reazione...}]
- `HL7_PATOLOGIE_CRONICHE` — JSON list [{codice_icd9, descrizione, stato_clinico...}]
- `HL7_ESENZIONI` — JSON list [{codice_esenzione, tipo, data_inizio...}]
- `HL7_TERAPIE_CRONICHE` — JSON list [{farmaco, dosaggio, frequenza...}]
- `HL7_PARAMETRI_VITALI` — individual fields (pressione, FC, peso, SpO2...)
- `HL7_CONSENSI` — JSON list [{tipo_consenso, stato, data_rilascio...}]
- `HL7_ANAGRAFICA_EXTRA` — individual fields (stato_civile, titolo_studio, professione, condizione_lavorativa)

**SIAD categories** (created by migration `20260330_002`, rif. SIAD v7.4 - Assistenza Domiciliare):
- `SIAD_PRESA_IN_CARICO` — Gestione presa in carico (data, soggetto richiedente, tipologia PIC, patologia prevalente/concomitante, nucleo familiare, assistente non familiare)
- `SIAD_VALUTAZIONE_SANITARIA` — Valutazione sanitaria (autonomia, mobilita, rischio infettivo, bisogni assistenziali si/no: broncorespirazione, ossigenoterapia, ventiloterapia, tracheostomia, alimentazione, stomia, ulcere, ECG, telemetria, riabilitazione, cure palliative, ecc.)
- `SIAD_VALUTAZIONE_SOCIALE` — Valutazione sociale (supporto sociale, fragilita familiare, disturbi cognitivi/comportamentali, responsabilita genitoriale)

**Wildcard scopes:** `anagrafica-siad_*-read/write` per tutte le categorie SIAD, `anagrafica-hl7_*-read/write` per tutte le HL7, `anagrafica-*-read/write` per tutte

**Public API endpoints** (use `cf` as key, scope `asp5-anagrafica` + category scope):
- `GET /api/v1/anagrafica/extra-data/:cf` — get extra data
- `POST /api/v1/anagrafica/extra-data/:cf` — set values (body: `{categoria, valori}`)
- `DELETE /api/v1/anagrafica/extra-data/:cf` — delete values (body: `{categoria, chiavi}`)
- `GET /api/v1/anagrafica/extra-data/:cf/storico` — change history
- `GET /api/v1/anagrafica/extra-data-categorie/summary` — categories with field names

**Admin API endpoints** (use assistito `id`, scope `admin-manage`, superAdmin):
- `GET/POST/PUT/DELETE /api/v1/admin/extra-data-categorie` — CRUD categories
- `POST /api/v1/admin/extra-data-valori/search-assistito` — search by CF
- `GET /api/v1/admin/extra-data-valori/:assistitoId` — get all values + field definitions
- `POST /api/v1/admin/extra-data-valori/:assistitoId` — set values
- `DELETE /api/v1/admin/extra-data-valori/:assistitoId` — delete value
- `GET /api/v1/admin/extra-data-valori/:assistitoId/storico` — full history (no scope filter)

**Auto-include in search:** The `ricerca.js` controller automatically includes `extraData` in search results, filtered by user scopes.

**Helper:** `api/helpers/get-extra-data-for-assistiti.js` — bulk fetch extra data for multiple assistiti, filtered by scope.

### API Response Format

All API responses use the custom `ApiResponse` response handler (`api/responses/ApiResponse.js`):

```javascript
// Success
return res.ApiResponse({
  data: { /* your data */ }
});

// Error
return res.ApiResponse({
  errType: ERROR_TYPES.NOT_FOUND,
  errMsg: 'Resource not found'
});
```

This ensures consistent response structure:
```json
{
  "ok": true|false,
  "err": { "code": "ERROR_CODE", "msg": "Error message" } | null,
  "data": { /* data */ } | null
}
```

**Note:** Sails native validation errors (400) have a different format (`{problems: [...]}`) without the `err` field. The admin UI `apiCall` handles both formats.

### Logging

All API requests and responses are automatically logged using the `log` helper (`api/helpers/log.js`). Logs include:
- Level (info, warn, error)
- Tag (for categorization, defined in `api/models/Log.js`)
- Action being performed
- IP address
- User (when authenticated)
- Request parameters and context

### Controllers Organization

Controllers are organized by domain in subdirectories:
- `api/controllers/anagrafica/`: Patient registry operations
- `api/controllers/anagrafica/extra-data/`: Extra data CRUD (public API, keyed by CF)
- `api/controllers/login/`: Authentication endpoints
- `api/controllers/admin/`: Administrative functions
- `api/controllers/admin/extra-data-categorie/`: Category CRUD (admin)
- `api/controllers/admin/extra-data-valori/`: Extra data values management (admin, keyed by ID)
- `api/controllers/cambio-medico/`: Doctor change functionality
- `api/controllers/stats/`: Statistics endpoints

### Services

Key services in `api/services/`:
- **JwtService**: JWT token generation and verification
- **AssistitoService**: Patient data operations
- **MeilisearchService**: Search integration with Meilisearch
- **MediciService**: Doctor data retrieval
- **MailService**: Email sending via nodemailer
- **JobManager**: Background job management

### Helpers

Key helpers in `api/helpers/`:
- **log**: Log to database
- **run-migrations**: Execute pending SQL migrations from `migrations/`
- **get-extra-data-for-assistiti**: Bulk fetch extra data filtered by scope
- **scope-matches**: Wildcard scope matching (sync helper)

### Configuration

Important config files:
- `config/routes.js`: Route definitions with authentication requirements
- `config/policies.js`: Policy mappings (most routes use `is-token-verified`)
- `config/datastores.js`: Database connections
- `config/custom.js`: Custom app config (JWT settings, base URL)
- `config/bootstrap.js`: Initialization logic — runs migrations, then swagger setup, then Docker sync
- `config/auth.js`: Basic auth credentials for Swagger UI
- `config/swaggergenerator.js`: Swagger documentation generation
- `config/models.js`: `migrate: 'safe'`, `schema: true`

### Domain Login

The application supports Active Directory/LDAP authentication via the `domain-login` helper for the asp.messina.it domain. When a user logs in with domain credentials, their username is automatically stripped of the domain suffix.

### Swagger Documentation

Swagger docs are available at `/docs` (protected by basic auth). The dynamic stats (total patients, last update, geolocation percentage) are injected into the Swagger spec at runtime via the `/api/v1/stats/info` endpoint.

**Swagger tag system (IMPORTANT — follow exactly):**

Tags are managed **exclusively** via JSDoc comments in controllers. Do NOT use `swagger: { tags: [...] }` in route definitions (`routes.js`) or in controller `module.exports`.

1. **Declare a tag once** in one controller per group, using a JSDoc block with `name` and `description`:
   ```javascript
   /**
    * @swagger
    *
    * /action-name:
    *   tags:
    *     - TagName
    * tags:
    *   - name: TagName
    *     description: Description shown next to the tag in Swagger UI
    */
   ```

2. **Reference the tag** in all other controllers of the same group:
   ```javascript
   /**
    * @swagger
    *
    * /action-name:
    *   tags:
    *     - TagName
    */
   ```

3. **The path in JSDoc must be the short action name only** (last segment), NOT the full route path. Examples:
   - Controller at `api/controllers/login/get-token.js` → path is `/get-token`
   - Controller at `api/controllers/admin/search-user.js` → path is `/search-user`
   - Controller at `api/controllers/cambio-medico/get-medici.js` → path is `/get-medici`
   - WRONG: `/api/v1/admin-op/search-user` or `/admin-op/search-user`

4. **Route exclusion filter** in `config/swaggergenerator.js` (`includeRoute`): routes containing `/admin/` are excluded from Swagger. Use a different URL prefix (e.g., `/admin-op/`) for admin endpoints that need to appear in Swagger docs.

Existing tags: `Auth`, `Otp`, `Cambio Medico`, `Gestione Extra data Assistiti`, `Info`, `Admin`.

### Admin UI

The admin panel at `/admin` (protected by basic auth) provides:
- **Dashboard**: Stats overview
- **Utenti**: User CRUD with scope assignment, OTP config
- **Scopi**: Scope management (including wildcard scopes)
- **Ambiti**: Domain management
- **Livelli**: Access level listing
- **Extra Data**: Category management + per-assistito value editing with inline history popovers

The panel uses Bootstrap 5, is a single-page EJS template (`views/pages/admin/index.ejs`) with JS in `assets/js/admin.js` and inline extensions in the template.

## Key Patterns

1. **Username Domain Stripping**: For asp.messina.it logins, the domain suffix is stripped from usernames

2. **Model Globals**: Models are automatically globalized by Sails (e.g., `Anagrafica_Assistiti`, `Auth_Utenti`) and can be accessed anywhere without requiring them

3. **Helpers**: Use `sails.helpers.<helperName>()` to invoke helpers (e.g., `sails.helpers.log.with({...})`)

4. **Custom Response**: Always use `res.ApiResponse()` instead of `res.json()` for API endpoints

5. **Private Config Files**: JWT secrets and other sensitive data are stored in `config/custom/private_*.json` files (not in git)

6. **Scope Matching**: Always use `sails.helpers.scopeMatches(userScopi, requiredScope)` for scope checks — never `userScopi.includes()` directly, to support wildcards

7. **Extra Data CF Key**: Public extra data endpoints use codice fiscale (`cf`) as key since `customToJSON` in `Anagrafica_Assistiti` strips the `id` field from responses

8. **JSON Fields**: Multi-value healthcare data (allergies, medications, conditions) is stored as JSON strings in extra data values. Controllers handle `typeof === 'string'` parsing for query string compatibility.

9. **Migration Idempotency**: All migration INSERTs use `WHERE NOT EXISTS` to be safely re-runnable

## Testing

The project uses ESLint for code quality. Tests are run via `npm test` which executes linting and any custom test scripts.

## Git

The repository has two remotes. Always push to both:
- **origin**: `https://github.com/deduzzo/asp-ws.git`
- **gitlab**: `https://dev.asp.messina.it/asp5_messina/asp-ws`

```bash
git push origin && git push gitlab
```

### Prometheus Metrics

The application exposes a `/metrics` endpoint in Prometheus text exposition format, protected by HTTP basic auth.

**Key files:**
- `api/services/MetricsService.js` — Registry, DB queries with 15s cache, health check
- `api/hooks/metrics.js` — Hook that registers `GET /metrics` on Express with basic auth

**Config:** `config/custom/private_metrics_config.json` (see example file for format)

**How it works:** Metrics are derived from the Log database table. On each Prometheus scrape, `MetricsService.refreshMetricsFromDb()` runs aggregate queries (COUNT + GROUP BY) on the Log table, cached for 15 seconds. No in-memory counters, no middleware — all data comes from existing logging in `ApiResponse.js`. The Log context includes `statusCode`, `ambito`, and `scopi` for each API response.

**Adding metrics to new features (MANDATORY):**
Every new controller, endpoint, or business operation MUST be evaluated for metrics. Follow this checklist:
1. Ensure the operation logs via `sails.helpers.log` or `res.ApiResponse()` with appropriate tags
2. If a new tag is needed, add it to `api/models/Log.js` TAGS
3. Add the corresponding query in `MetricsService.refreshMetricsFromDb()`
4. Update `docs/monitoring/metrics.md` with the new metric
5. Provide the user a prompt for the Grafana/Prometheus instance to update the dashboard

## Dependencies

- **Sails.js 1.5.14**: MVC framework
- **aziendasanitaria-utils**: Internal utility library for healthcare data
- **Meilisearch**: Full-text search engine
- **JWT**: Token-based authentication
- **Argon2**: Password hashing
- **Axios**: HTTP client
- **Moment.js**: Date/time handling
- **@turf/turf**: Geospatial operations
- **Swagger**: API documentation
- **prom-client**: Prometheus metrics client

## Node Version

Requires Node.js ^22.13 (see package.json engines)
