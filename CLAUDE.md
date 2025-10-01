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
- **anagrafica**: Patient registry data
- **log**: Application logging

Database connections are configured in `config/datastores.js`. Models specify which datastore to use via the `datastore` attribute.

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

Routes are protected in `config/routes.js` by specifying `scopi`, `ambito`, and `minAuthLevel` properties.

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
- `api/controllers/login/`: Authentication endpoints
- `api/controllers/admin/`: Administrative functions
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

### Configuration

Important config files:
- `config/routes.js`: Route definitions with authentication requirements
- `config/policies.js`: Policy mappings (most routes use `is-token-verified`)
- `config/datastores.js`: Database connections
- `config/custom.js`: Custom app config (JWT settings, base URL)
- `config/bootstrap.js`: Initialization logic run on server start
- `config/auth.js`: Basic auth credentials for Swagger UI
- `config/swaggergenerator.js`: Swagger documentation generation

### Domain Login

The application supports Active Directory/LDAP authentication via the `domain-login` helper for the asp.messina.it domain. When a user logs in with domain credentials, their username is automatically stripped of the domain suffix.

### Swagger Documentation

Swagger docs are available at `/docs` (protected by basic auth). The dynamic stats (total patients, last update, geolocation percentage) are injected into the Swagger spec at runtime via the `/api/v1/stats/info` endpoint.

## Key Patterns

1. **Username Domain Stripping**: For asp.messina.it logins, the domain suffix is stripped from usernames (see git commit messages)

2. **Model Globals**: Models are automatically globalized by Sails (e.g., `Anagrafica_Assistiti`, `Auth_Utenti`) and can be accessed anywhere without requiring them

3. **Helpers**: Use `sails.helpers.<helperName>()` to invoke helpers (e.g., `sails.helpers.log.with({...})`)

4. **Custom Response**: Always use `res.ApiResponse()` instead of `res.json()` for API endpoints

5. **Private Config Files**: JWT secrets and other sensitive data are stored in `config/custom/private_*.json` files (not in git)

## Testing

The project uses ESLint for code quality. Tests are run via `npm test` which executes linting and any custom test scripts.

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

## Node Version

Requires Node.js ^22.13 (see package.json engines)
