# Sistema Forms Dinamici - ASP Messina

Sistema completo per la gestione di form dinamici con salvataggio su database SQLite embedded, protezione antiflood, reCAPTCHA v3 e interfaccia admin con autenticazione JWT.

## 📁 Struttura

```
api/data/forms/
├── template/                    # Template JSON dei form
│   ├── esempio-1.json
│   ├── richiesta-informazioni.json
│   └── strutture-private-accreditate.json
├── data/                        # Database SQLite (gitignored)
│   ├── .gitignore
│   └── [formId]_data.db         # Creati automaticamente
└── FORMS_SYSTEM.md              # Questa documentazione
```

## 🚀 Funzionalità Implementate

### ✅ Form Pubblici
- Form multi-pagina con progress bar
- Design Material-UI responsive
- Validazione client-side e server-side
- Select searchable personalizzato con Alpine.js
- Checkbox multiple con badge UI
- reCAPTCHA v3 integration

### ✅ Sistema Antiflood
- Rate limiting per IP: max 10 submissions/ora
- Rate limiting per form: max 3 submissions/15min
- Blocco automatico: 30 minuti
- reCAPTCHA v3: score minimo 0.5
- Tracking: `.tmp/rate-limit.json`

### ✅ Database SQLite
- SQLite embedded con better-sqlite3
- Schema dinamico basato sui campi
- Metadata: IP, user agent, reCAPTCHA score
- Un database isolato per form

### ✅ Admin Interface
- Autenticazione JWT (scopo "forms", ambito "login")
- Lista submissions con filtri (data, IP)
- Export Excel con ExcelJS
- Elimina submissions
- Dashboard con statistiche

## 🌐 URL e Endpoints

### Form Pubblici
- GET /forms - Lista tutti i form
- GET /forms/:id - Visualizza form
- POST /api/v1/forms/:id/submit - Invia submission

### API Admin (JWT required)
- GET /api/v1/forms/:id/submissions
- GET /api/v1/forms/:id/submissions/export
- DELETE /api/v1/forms/:id/submissions/:submissionId

### Admin UI
- GET /admin/forms - Dashboard
- GET /admin/forms/:id - Vedi submissions

## 🔑 Autenticazione

Accesso admin richiede:
- Token JWT valido
- Scopo: "forms"
- Ambito: "login"
- Livello: user (1)

## 📊 Database Schema

```sql
CREATE TABLE submissions (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  recaptcha_score REAL,
  field_[fieldId] TEXT, -- Dinamico per ogni campo
  ...
);
```

## 📦 Dipendenze

- better-sqlite3 - Database
- exceljs - Export Excel
- axios - reCAPTCHA
- alpinejs - Frontend
- tailwindcss - Styling

---
Versione: 1.0.0
Autore: ASP Messina
