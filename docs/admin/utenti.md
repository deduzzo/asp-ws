# Gestione Utenti

## Modello Utente

| Campo | Descrizione |
|-------|-------------|
| `username` | Username univoco |
| `password` | Hash Argon2 |
| `livello` | 0=guest, 1=user, 2=admin, 99=superAdmin |
| `attivo` | Abilitazione account |
| `otpRequired` | OTP obbligatorio al login |
| `otpMethod` | Metodo OTP: `email` o `totp` |
| `email` | Email per OTP e comunicazioni |

## API Admin Utenti

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/utenti` | Lista utenti |
| `POST` | `/api/v1/admin/utenti` | Crea utente |
| `PUT` | `/api/v1/admin/utenti/:id` | Modifica utente |
| `DELETE` | `/api/v1/admin/utenti/:id` | Disattiva utente |
| `POST` | `/api/v1/admin/utenti/:id/scopi` | Assegna scope |
| `DELETE` | `/api/v1/admin/utenti/:id/scopi` | Rimuovi scope |
| `POST` | `/api/v1/admin/utenti/:id/reset-password` | Reset password |

## Assegnazione Scope

Per assegnare uno scope a un utente:

```json
POST /api/v1/admin/utenti/{id}/scopi
{
  "scopo": "clinico_*-read"
}
```

Un utente puo avere **multipli scope**. Gli scope wildcard (`*`) sono particolarmente utili per dare accesso a intere famiglie di categorie.

## Esempio: Setup Utente per Applicazione MPI

```
1. Crea utente: POST /api/v1/admin/utenti
   { "username": "app_ps_papardo", "password": "...", "livello": 1 }

2. Assegna scope MPI:
   - mpi-ps_papardo-read
   - mpi-ps_papardo-write
   - mpi-link

3. Assegna scope extra data:
   - clinico_*-read
   - clinico_*-write
```
