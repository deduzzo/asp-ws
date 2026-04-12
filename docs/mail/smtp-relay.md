# SMTP Relay — Proposta architetturale

## Contesto

Il server di posta aziendale limita le connessioni SMTP alla sola rete interna. Per consentire l'invio email da smartphone e client esterni serve un relay.

## Stato attuale

Esiste un endpoint REST (`POST /api/v1/mail/send`) autenticato via API key che accetta credenziali SMTP nel body e inoltra l'email tramite il server interno. Funziona per script e applicazioni, ma **non** per client email nativi (Outlook, Thunderbird, Mail iOS) che parlano solo protocollo SMTP.

## Proposta: SMTP Proxy con sicurezza a strati

Un processo Node.js (basato su `smtp-server`) che gira accanto a Sails e accetta connessioni SMTP dai client, facendo relay verso il server di posta interno.

### Livelli di sicurezza

#### 1. Porta non standard

Usare una porta non convenzionale (es. 9587) invece delle classiche 25/465/587. Riduce l'esposizione a scanning automatizzati.

#### 2. Banner fake

Il server risponde con un banner fuorviante per depistare attaccanti:

```
220 mail.google.com ESMTP Postfix
```

Invece del vero hostname. Chi scansiona la porta vede un apparente server Google e passa oltre.

#### 3. Whitelist utenti

Solo gli username esplicitamente elencati nella configurazione possono autenticarsi. Tutti gli altri vengono rifiutati.

#### 4. Token segreto nascosto nella password

Questo e' il meccanismo chiave. L'utente configura nel client email una password composta da:

```
<password_reale>%%<token_segreto>%%
```

Esempio:
```
Password reale SMTP:  MiaPassword123
Token segreto:        X9kW2mPqR7
Password nel client:  MiaPassword123%%X9kW2mPqR7%%
```

Il proxy, alla ricezione dell'AUTH:

1. Cerca il pattern `%%...%%` nella password ricevuta
2. Se il pattern non c'e' → rifiuta (l'attaccante riceve un generico "auth failed")
3. Estrae il token e lo confronta con quello in configurazione
4. Se il token non corrisponde → rifiuta ("auth failed")
5. Estrae la password reale (parte prima di `%%`) e la usa per autenticarsi sul server SMTP interno
6. Se l'auth SMTP interna fallisce → rifiuta ("auth failed")

Dal punto di vista dell'attaccante, tutti e tre i casi di errore (no token, token errato, password errata) producono lo stesso messaggio. Non c'e' modo di distinguere quale controllo ha fallito.

#### 5. Rate limiting

Max N email/ora per utente per prevenire abusi.

#### 6. FROM enforcement

Il mittente (FROM) deve corrispondere all'utente autenticato. Non e' possibile inviare email come un altro utente.

### Configurazione server

```json
{
  "smtp": {
    "enabled": true,
    "port": 9587,
    "banner": "mail.google.com ESMTP Postfix",
    "secretToken": "X9kW2mPqR7",
    "allowedUsers": ["mario.rossi", "anna.verdi"],
    "maxPerHour": 50
  }
}
```

### Configurazione client (Outlook / Smartphone)

```
Server SMTP:    relay.asp.messina.it
Porta:          9587
Sicurezza:      Nessuna (o STARTTLS se disponibile certificato)
Username:       mario.rossi
Password:       MiaPasswordReale%%X9kW2mPqR7%%
```

### Note sulla sicurezza TLS

Il certificato TLS e' gestito dal reverse proxy aziendale per il traffico HTTP. Per SMTP servirebbero:
- Un certificato dedicato (Let's Encrypt/certbot) installato sul server
- Oppure la configurazione del reverse proxy per terminare TLS anche su porta SMTP

Senza TLS le credenziali viaggiano in chiaro. Accettabile solo se i client si connettono tramite VPN.

### Dipendenze necessarie

- `smtp-server` — server SMTP Node.js
- `mailparser` — parsing dei messaggi email
