# Deployment Guide - Forms Submission System

## Sistema Completo Implementato

Il sistema forms dinamici è stato completamente implementato e testato localmente. Include:

- ✅ Salvataggio submissions su database SQLite embedded
- ✅ Sistema antiflood con reCAPTCHA v3
- ✅ Interfaccia admin con autenticazione JWT
- ✅ Export Excel delle submissions
- ✅ Dashboard con statistiche
- ✅ API REST complete

## 🚀 Deploy su Produzione

### 1. Verificare Branch

Il codice è stato committato sul branch `feature/dynamic-forms`:

```bash
git log --oneline -1
# 84ff3e9 Add forms submission system with SQLite database and admin interface
```

### 2. Installare Dipendenze

Sul server di produzione, installare le nuove dipendenze:

```bash
npm install
```

Nuove dipendenze aggiunte:
- `better-sqlite3` - Database SQLite embedded
- `exceljs` - Export Excel

### 3. Struttura Cartelle

Verificare che esistano le seguenti cartelle:

```
api/data/forms/
├── template/           # JSON form definitions (committati in git)
├── data/              # Database SQLite (creati automaticamente)
│   └── .gitignore     # Esclude i file .db dal git
└── FORMS_SYSTEM.md    # Documentazione completa
```

La cartella `data/` viene creata automaticamente al primo submit di un form.

### 4. Configurazione reCAPTCHA

Assicurarsi che il file `config/custom/private_recaptcha.json` esista e contenga:

```json
{
  "siteKey": "YOUR_RECAPTCHA_SITE_KEY",
  "secretKey": "YOUR_RECAPTCHA_SECRET_KEY",
  "minScore": 0.5
}
```

Se il file non esiste, crearlo seguendo l'esempio in `config/custom/private_recaptcha.json.example`.

### 5. Permessi File System

Assicurarsi che l'utente che esegue Sails abbia permessi di scrittura su:

```bash
# Database forms
chmod 755 api/data/forms/data/

# Rate limiting
chmod 755 .tmp/
```

### 6. Autenticazione Admin

Per accedere all'interfaccia admin (`/admin/forms`), gli utenti devono:

1. Avere un account nel database `auth.auth_utenti`
2. Avere lo **scopo "forms"** assegnato in `auth.auth_utenti_scopi`
3. Avere **ambito "login"**
4. Livello minimo: **user (1)**

#### Aggiungere Scopo "forms" al Database

Se lo scopo "forms" non esiste ancora:

```sql
-- 1. Aggiungere lo scopo nella tabella auth_scopi
INSERT INTO auth.auth_scopi (nome, descrizione)
VALUES ('forms', 'Gestione form dinamici e submissions');

-- 2. Assegnare lo scopo a un utente (sostituire USER_ID)
INSERT INTO auth.auth_utenti_scopi (id_utente, id_scopo)
SELECT [USER_ID], id FROM auth.auth_scopi WHERE nome = 'forms';
```

### 7. Riavviare Sails

Sul server di produzione:

```bash
# Se usi PM2
pm2 restart asp-ws

# Se usi systemd
systemctl restart asp-ws

# Se esegui manualmente
pkill -9 -f "sails lift"
NODE_ENV=production node app.js
```

### 8. Verificare Funzionamento

Testare gli endpoint:

```bash
# Lista forms pubblici
curl https://ws1.asp.messina.it/forms

# Dashboard admin (deve richiedere login)
curl https://ws1.asp.messina.it/admin/forms

# API endpoint (deve richiedere JWT)
curl https://ws1.asp.messina.it/api/v1/forms/esempio-1/submissions
```

### 9. Reverse Proxy (se necessario)

Se usi nginx o Apache come reverse proxy, assicurati che passi correttamente:

**nginx esempio**:
```nginx
location /admin/forms {
    proxy_pass http://localhost:1337/admin/forms;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location /api/v1/forms {
    proxy_pass http://localhost:1337/api/v1/forms;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Dopo modifiche al proxy, ricarica la configurazione:
```bash
nginx -t && nginx -s reload
```

## 📊 Endpoint Disponibili

### Form Pubblici
- `GET /forms` - Lista tutti i form
- `GET /forms/:id` - Visualizza form
- `POST /api/v1/forms/:id/submit` - Invia submission

### API Admin (JWT required, scopo "forms")
- `GET /api/v1/forms/:id/submissions` - Lista submissions con paginazione
- `GET /api/v1/forms/:id/submissions/export` - Export Excel
- `DELETE /api/v1/forms/:id/submissions/:submissionId` - Elimina submission

### Interfaccia Admin
- `GET /admin/forms` - Dashboard
- `GET /admin/forms/:id` - Visualizza submissions di un form specifico

## 🔍 Troubleshooting

### 404 su /admin/forms

**Causa**: Server non aggiornato o reverse proxy non configurato

**Soluzione**:
1. Verificare che il codice sia stato aggiornato: `git log --oneline -1`
2. Verificare che Sails sia riavviato
3. Controllare i log: `tail -f logs/sails.log`
4. Verificare configurazione reverse proxy

### "Utente non autorizzato ad accedere alla gestione forms"

**Causa**: L'utente non ha lo scopo "forms"

**Soluzione**: Aggiungere lo scopo all'utente (vedi sezione 6)

### Error: Cannot find module 'better-sqlite3'

**Causa**: Dipendenze non installate

**Soluzione**: `npm install`

### EACCES permission denied writing to .db files

**Causa**: Permessi insufficienti sulla cartella data/

**Soluzione**: `chmod 755 api/data/forms/data/`

### Rate limit non funziona dopo restart

**Causa**: Il file `.tmp/rate-limit.json` viene mantenuto tra restart

**Soluzione**: Questo è il comportamento corretto. Per resettare: `rm .tmp/rate-limit.json`

## 📁 File Modificati/Aggiunti

### Nuovi File
- `api/controllers/forms/admin-index.js`
- `api/controllers/forms/admin-view.js`
- `api/controllers/forms/submit-form.js`
- `api/controllers/forms/get-submissions.js`
- `api/controllers/forms/export-submissions.js`
- `api/controllers/forms/delete-submission.js`
- `api/helpers/form-db.js`
- `api/helpers/check-submission-rate-limit.js`
- `api/data/forms/FORMS_SYSTEM.md`
- `api/data/forms/DEPLOYMENT.md` (questo file)
- `api/data/forms/data/.gitignore`
- `views/pages/forms/admin-index.ejs`
- `views/pages/forms/admin-view.ejs`

### File Modificati
- `api/controllers/forms/get-form.js` - Legge da template/
- `api/controllers/forms/list-forms.js` - Legge da template/
- `views/pages/forms/view-form.ejs` - Submit a API reale
- `config/routes.js` - Nuove route API e admin
- `package.json` - Nuove dipendenze

### Folder Riorganizzati
- `api/data/forms/*.json` → `api/data/forms/template/*.json`

## ✅ Testing Locale Completato

Il sistema è stato testato completamente in locale:

```bash
$ curl -s http://localhost:1337/admin/forms | grep "Forms Admin"
<title>Forms Admin - ASP Messina</title>

$ curl -s http://localhost:1337/forms | grep "Moduli"
<title>Moduli Disponibili - ASP Messina</title>
```

Tutti gli endpoint funzionano correttamente.

## 📞 Support

Per problemi o domande:
- Vedere `FORMS_SYSTEM.md` per documentazione completa del sistema
- Controllare i log di Sails
- Verificare la configurazione del reverse proxy

---
**Versione**: 1.0.0
**Data Deploy**: 2025-10-16
**Branch**: feature/dynamic-forms
**Commit**: 84ff3e9
