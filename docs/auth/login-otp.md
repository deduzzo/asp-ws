# Login e OTP

## Login Standard

```
POST /api/v1/login
Body: { "username": "...", "password": "..." }
```

Risposta con JWT token:
```json
{
  "ok": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "username": "mario.rossi",
      "livello": 1,
      "scopi": ["asp5-anagrafica", "anagrafica-hl7_*-read"],
      "ambito": "api"
    }
  }
}
```

## OTP (One-Time Password)

Il sistema supporta due metodi OTP:

### OTP via Email

1. L'utente effettua il login con username e password
2. Se OTP e' abilitato, riceve un codice via email
3. Conferma il codice per ottenere il token JWT

### OTP via Authenticator (TOTP)

1. L'utente configura un'app authenticator (Google Authenticator, Authy, ecc.)
2. Al login, inserisce il codice TOTP generato dall'app
3. I codici sono validi per 30 secondi

## Configurazione OTP

L'utente puo configurare/cambiare il metodo OTP tramite:

```
POST /api/v1/login/otp/setup
```

## Switch Metodo OTP

Per passare da email a TOTP o viceversa:

```
POST /api/v1/login/otp/switch
Body: { "metodo": "totp" }
```
