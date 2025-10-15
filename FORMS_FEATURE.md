# Dynamic Forms Feature

## Panoramica

Sistema di form dinamici serverless per ASP Messina che permette di creare e gestire form complessi tramite semplici file JSON, senza necessità di modificare il codice.

## Funzionalità Implementate

### 1. Struttura Serverless
- Form definiti tramite file JSON in `/api/data/forms/`
- Nessun database necessario per le definizioni (solo per le submission)
- Aggiunta/modifica form tramite semplice upload di file JSON

### 2. Tipi di Campi Supportati

#### Campi di Testo
- **Text**: Campo singola linea
- **Textarea**: Campo multilinea

#### Campi di Selezione
- **Radio**: Scelta singola esclusiva
- **Checkbox**: Scelta multipla libera
- **Checkbox-multiple**: Scelta multipla con min/max selezioni
- **Select**: Menu a tendina (con ricerca opzionale)

### 3. Validazioni

Ogni campo può avere validazioni specifiche:
- **Campi obbligatori**: `required: true`
- **Lunghezza testo**: `minLength`, `maxLength`
- **Range numerico**: `min`, `max`
- **Tipi speciali**:
  - Email (validazione formato)
  - Telefono (validazione formato italiano)
  - URL (validazione formato)
  - Numero
  - Pattern regex personalizzato

### 4. Opzioni Avanzate per le Scelte

Ogni opzione (radio/checkbox/select) può avere:
- **Label**: Testo principale
- **Subtitle**: Sottotitolo (solo checkbox)
- **Description**: Descrizione estesa
- **Ricerca**: Filtraggio in tempo reale su tutti i campi

### 5. Form Multi-Pagina

- Navigazione avanti/indietro tra pagine
- Progress bar visiva
- Opzione per forzare compilazione campi obbligatori prima di procedere
- Ogni pagina con titolo e descrizione propri

### 6. Interfaccia Utente Moderna

#### Design
- Design responsive (mobile, tablet, desktop)
- Animazioni e transizioni fluide
- 2 temi disponibili:
  - **Modern**: Blu moderno
  - **Healthcare**: Cyan/Teal sanitario
- Selettore tema nell'interfaccia

#### Componenti UI
- **Alpine.js**: Reattività e gestione stato
- **Tailwind CSS**: Styling moderno
- **Choices.js**: Select ricercabili
- **Custom components**: Checkbox/radio stilizzati

#### UX Features
- Ricerca in tempo reale per opzioni multiple
- Placeholder e help text
- Indicatori campi obbligatori (*)
- Messaggi di validazione chiari
- Loading states durante invio
- Success/error feedback

### 7. Sicurezza

#### reCAPTCHA v3
- Integrazione Google reCAPTCHA v3
- Configurazione tramite file `config/custom/private_recaptcha.json`
- Attivabile/disattivabile per singolo form
- Score salvato nel database

#### Altri Aspetti
- Sanitizzazione input lato server
- Validazione formato ID form (solo caratteri sicuri)
- IP tracking per auditing
- User agent logging

### 8. Database Schema

Tabella `form_submissions` (datastore: log):
```sql
- formId (varchar)
- formTitle (varchar)
- submissionData (JSON/longtext)
- ipAddress (varchar)
- userAgent (varchar)
- recaptchaScore (decimal)
- submittedAt (datetime)
```

Il campo `submissionData` contiene un JSON flessibile chiave-valore che si adatta automaticamente a qualsiasi struttura di form.

### 9. API Endpoints

#### GET /forms/:id
Visualizza il form renderizzato nell'interfaccia web.

**Esempio**: `/forms/esempio-1`

#### GET /api/v1/forms/:id
Restituisce la definizione JSON del form.

**Risposta**:
```json
{
  "ok": true,
  "data": { /* form definition */ }
}
```

### 10. Logging

Tutte le operazioni vengono loggate usando il sistema di logging esistente:
- Visualizzazione form
- Caricamento definizioni
- Errori e warning

Tag utilizzato: `FORMS`

## Utilizzo

### Creare un Nuovo Form

1. Crea un file JSON in `/api/data/forms/` (es. `mio-form.json`)
2. Segui la struttura documentata in `/api/data/forms/README.md`
3. Il form sarà immediatamente disponibile a `/forms/mio-form`

### Esempio Minimo

```json
{
  "id": "contatto-semplice",
  "title": "Form di Contatto",
  "pages": [
    {
      "id": "page-1",
      "title": "Informazioni",
      "fields": [
        {
          "id": "nome",
          "type": "text",
          "label": "Nome",
          "required": true
        },
        {
          "id": "email",
          "type": "text",
          "label": "Email",
          "required": true,
          "validation": {
            "type": "email"
          }
        }
      ]
    }
  ]
}
```

### Configurare reCAPTCHA

1. Registrati su [Google reCAPTCHA](https://www.google.com/recaptcha/admin)
2. Scegli reCAPTCHA v3
3. Copia `config/custom/private_recaptcha.json.example` in `config/custom/private_recaptcha.json`
4. Inserisci le tue chiavi:

```json
{
  "RECAPTCHA_SITE_KEY": "6Lc...",
  "RECAPTCHA_SECRET_KEY": "6Lc..."
}
```

5. Nel form JSON:

```json
{
  "recaptcha": {
    "enabled": true,
    "version": "v3",
    "action": "submit_contact_form"
  }
}
```

## File Modificati/Creati

### Nuovi File
- `api/controllers/forms/get-form.js` - Controller API
- `api/controllers/forms/view-form.js` - Controller view
- `api/models/Log_FormSubmission.js` - Model database
- `api/data/forms/esempio-1.json` - Form di esempio
- `api/data/forms/README.md` - Documentazione completa
- `views/pages/forms/view-form.ejs` - Template EJS
- `config/custom/private_recaptcha.json.example` - Esempio config reCAPTCHA

### File Modificati
- `config/routes.js` - Aggiunte route per i form
- `config/custom.js` - Aggiunta configurazione reCAPTCHA

## Prossimi Passi (Sviluppi Futuri)

Al momento la funzionalità è completa per quanto riguarda:
- Definizione e visualizzazione form
- Validazione client-side
- Interfaccia utente

### Da Implementare
1. **Controller per submission**: Endpoint POST per salvare i dati nel database
2. **Validazione server-side**: Rivalidare tutti i campi lato server
3. **Verifica reCAPTCHA**: Chiamata API Google per verificare il token
4. **Notifiche email**: Inviare email di conferma/notifica
5. **Dashboard amministrazione**: Visualizzare le submission
6. **Export dati**: CSV/Excel delle submission
7. **Statistiche**: Contatori e analytics sui form

## Testing

Per testare la funzionalità:

1. Avvia il server: `sails lift`
2. Vai a: `http://localhost:1337/forms/esempio-1`
3. Compila il form e testa tutte le funzionalità
4. Prova i diversi temi
5. Testa la navigazione multi-pagina
6. Verifica la validazione dei campi

## Documentazione

La documentazione completa della struttura JSON e di tutte le opzioni è disponibile in:
- `/api/data/forms/README.md`

Include:
- Schema completo JSON
- Descrizione di tutti i tipi di campo
- Esempi per ogni funzionalità
- Best practices
- Troubleshooting

## Branch

Il codice è stato sviluppato nel branch: `feature/dynamic-forms`

Per fare il merge su main:
```bash
git checkout main
git merge feature/dynamic-forms
```

## Note Tecniche

- **Node Version**: ^22.13 (come da package.json)
- **Sails Version**: 1.5.14
- **Framework CSS**: Tailwind CSS (via CDN)
- **Framework JS**: Alpine.js (via CDN)
- **Select Library**: Choices.js (via CDN)
- **reCAPTCHA**: v3

L'uso di CDN per le librerie frontend permette di mantenere il progetto leggero senza dipendenze npm aggiuntive.

## Supporto

Per domande o problemi:
1. Consulta la documentazione in `/api/data/forms/README.md`
2. Verifica l'esempio in `esempio-1.json`
3. Controlla i log del server per errori
