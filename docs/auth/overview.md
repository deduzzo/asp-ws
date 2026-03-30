# Autenticazione e Autorizzazione

## JWT

Il sistema utilizza **JSON Web Token** per l'autenticazione. Il token viene generato al login e contiene:

| Campo | Descrizione |
|-------|-------------|
| `username` | Username dell'utente |
| `scopi` | Array di scope assegnati |
| `ambito` | Dominio di appartenenza |
| `livello` | Livello di autenticazione |

Il token va incluso nell'header `Authorization: Bearer {token}` di ogni richiesta API.

## Livelli di Autenticazione

| Livello | Nome | Valore | Descrizione |
|---------|------|--------|-------------|
| Guest | `guest` | 0 | Accesso minimo |
| User | `user` | 1 | Utente autenticato standard |
| Admin | `admin` | 2 | Amministratore |
| SuperAdmin | `superAdmin` | 99 | Accesso completo |

## Policy `is-token-verified`

Ogni rotta API e' protetta dalla policy che verifica:

1. **Token valido** — Non scaduto, firma corretta
2. **Livello minimo** — `minAuthLevel` definito nella rotta
3. **Scope** — L'utente possiede gli scope richiesti (`scopi` nella rotta)
4. **Dominio** — L'utente appartiene al dominio richiesto (`ambito` nella rotta)
5. **Account attivo** — L'utente non e' stato disabilitato

Il token decodificato e' disponibile in `req.tokenData`.

## Domini (Ambiti)

| Dominio | Descrizione |
|---------|-------------|
| `api` | Accesso API programmatico |
| `asp.messina.it` | Utenti del dominio ASP (Active Directory) |
| `globale` | Accesso cross-dominio |

## Login con Active Directory

Per il dominio `asp.messina.it`, il login avviene tramite **LDAP/Active Directory**. Il suffisso dominio viene automaticamente rimosso dallo username.

## Password Hashing

Le password sono hashate con **Argon2** (variante Argon2id).
