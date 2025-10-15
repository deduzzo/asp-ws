# Dynamic Forms - Documentazione

Questa directory contiene le definizioni JSON dei form dinamici.

## Struttura del Form JSON

### Schema Base

```json
{
  "id": "unique-form-id",
  "title": "Titolo del Form",
  "description": "Descrizione opzionale del form",
  "theme": "modern|healthcare",
  "recaptcha": {
    "enabled": true|false,
    "version": "v3",
    "action": "submit_action_name"
  },
  "pages": [...],
  "submitButton": {
    "text": "Testo del bottone",
    "loadingText": "Testo durante l'invio"
  },
  "messages": {
    "success": "Messaggio di successo",
    "error": "Messaggio di errore",
    "validation": "Messaggio di validazione"
  }
}
```

### Campi Obbligatori

- `id`: Identificatore univoco del form (deve corrispondere al nome del file senza .json)
- `title`: Titolo del form
- `pages`: Array di pagine (almeno una)

### Campi Opzionali

- `description`: Descrizione generale del form
- `theme`: Tema visuale (`modern` o `healthcare`, default: `modern`)
- `recaptcha`: Configurazione reCAPTCHA
- `submitButton`: Personalizzazione del bottone di invio
- `messages`: Messaggi personalizzati

## Struttura delle Pagine

Ogni pagina ha la seguente struttura:

```json
{
  "id": "page-id",
  "title": "Titolo della Pagina",
  "description": "Descrizione opzionale",
  "requireAllBeforeNext": true|false,
  "fields": [...]
}
```

### Proprietà delle Pagine

- `id`: Identificatore univoco della pagina (obbligatorio)
- `title`: Titolo della pagina (obbligatorio)
- `description`: Descrizione opzionale della pagina
- `requireAllBeforeNext`: Se `true`, tutti i campi obbligatori devono essere compilati prima di procedere alla pagina successiva
- `fields`: Array di campi del form (obbligatorio)

## Tipi di Campi

### 1. Text (Campo di testo singola linea)

```json
{
  "id": "field-id",
  "type": "text",
  "label": "Etichetta del campo",
  "subtitle": "Sottotitolo opzionale",
  "description": "Descrizione opzionale",
  "placeholder": "Testo placeholder",
  "required": true|false,
  "validation": {
    "type": "text|email|phone|number|url",
    "minLength": 2,
    "maxLength": 100,
    "min": 0,
    "max": 999,
    "pattern": "regex-pattern"
  }
}
```

**Tipi di validazione supportati:**

- `text`: Testo generico
- `email`: Indirizzo email
- `phone`: Numero di telefono
- `number`: Numero (usa `min` e `max` per range)
- `url`: URL valido

### 2. Textarea (Campo di testo multilinea)

```json
{
  "id": "field-id",
  "type": "textarea",
  "label": "Etichetta del campo",
  "subtitle": "Sottotitolo opzionale",
  "description": "Descrizione opzionale",
  "placeholder": "Testo placeholder",
  "required": true|false,
  "validation": {
    "type": "text",
    "minLength": 10,
    "maxLength": 500
  }
}
```

### 3. Radio (Scelta singola esclusiva)

```json
{
  "id": "field-id",
  "type": "radio",
  "label": "Etichetta del campo",
  "subtitle": "Sottotitolo opzionale",
  "description": "Descrizione opzionale",
  "required": true|false,
  "options": [
    {
      "value": "option-value",
      "label": "Etichetta opzione",
      "description": "Descrizione opzionale"
    }
  ]
}
```

### 4. Checkbox (Scelta multipla)

```json
{
  "id": "field-id",
  "type": "checkbox",
  "label": "Etichetta del campo",
  "subtitle": "Sottotitolo opzionale",
  "description": "Descrizione opzionale",
  "required": false,
  "searchable": true|false,
  "options": [
    {
      "value": "option-value",
      "label": "Etichetta opzione",
      "subtitle": "Sottotitolo opzione",
      "description": "Descrizione opzionale"
    }
  ]
}
```

### 5. Checkbox Multiple (Scelta multipla con minimo/massimo)

```json
{
  "id": "field-id",
  "type": "checkbox-multiple",
  "label": "Etichetta del campo",
  "subtitle": "Sottotitolo opzionale",
  "description": "Descrizione opzionale",
  "required": true|false,
  "searchable": true|false,
  "minSelection": 1,
  "maxSelection": 5,
  "options": [
    {
      "value": "option-value",
      "label": "Etichetta opzione",
      "subtitle": "Sottotitolo opzione",
      "description": "Descrizione opzionale"
    }
  ]
}
```

### 6. Select (Menu a tendina)

```json
{
  "id": "field-id",
  "type": "select",
  "label": "Etichetta del campo",
  "subtitle": "Sottotitolo opzionale",
  "description": "Descrizione opzionale",
  "placeholder": "Scegli un'opzione...",
  "required": true|false,
  "searchable": true|false,
  "options": [
    {
      "value": "option-value",
      "label": "Etichetta opzione",
      "description": "Descrizione opzionale"
    }
  ]
}
```

## Proprietà Comuni dei Campi

Tutti i campi supportano le seguenti proprietà:

- `id`: Identificatore univoco (obbligatorio, deve essere univoco nel form)
- `type`: Tipo di campo (obbligatorio)
- `label`: Etichetta visualizzata (obbligatorio)
- `subtitle`: Sottotitolo opzionale (appare sotto l'etichetta)
- `description`: Descrizione/help text opzionale (appare sotto il campo)
- `required`: Se il campo è obbligatorio (default: false)

## Proprietà delle Opzioni

Per campi con opzioni (radio, checkbox, select):

- `value`: Valore inviato al server (obbligatorio)
- `label`: Etichetta visualizzata all'utente (obbligatorio)
- `subtitle`: Sottotitolo opzionale (solo per checkbox)
- `description`: Descrizione estesa opzionale

## Funzionalità di Ricerca

I campi `checkbox`, `checkbox-multiple` e `select` supportano la proprietà `searchable: true` che abilita:

- **Select**: Menu a tendina con ricerca integrata (usa Choices.js)
- **Checkbox**: Campo di ricerca sopra le opzioni per filtrare in tempo reale

La ricerca funziona su tutti i campi delle opzioni (label, subtitle, description).

## Validazioni Disponibili

### Text/Textarea

- `minLength`: Lunghezza minima
- `maxLength`: Lunghezza massima
- `pattern`: Espressione regolare personalizzata

### Number

- `min`: Valore minimo
- `max`: Valore massimo

### Email

Validazione automatica del formato email.

### Phone

Validazione automatica del formato telefonico italiano.

### URL

Validazione automatica del formato URL.

## Temi Disponibili

### Modern (Default)

Tema moderno con colori blu e design pulito.

```css
--primary: #3b82f6;
--primary-dark: #2563eb;
--secondary: #8b5cf6;
```

### Healthcare

Tema sanitario con colori cyan/teal.

```css
--primary: #0ea5e9;
--primary-dark: #0284c7;
--secondary: #06b6d4;
```

## Configurazione reCAPTCHA

Per abilitare reCAPTCHA v3:

1. Registra il tuo sito su [Google reCAPTCHA](https://www.google.com/recaptcha/admin)
2. Inserisci le chiavi in `/config/custom/private_recaptcha.json`:

```json
{
  "RECAPTCHA_SITE_KEY": "your-site-key",
  "RECAPTCHA_SECRET_KEY": "your-secret-key"
}
```

3. Nel form JSON:

```json
{
  "recaptcha": {
    "enabled": true,
    "version": "v3",
    "action": "submit_form_name"
  }
}
```

## Form Multi-Pagina

Per creare un form su più pagine:

1. Aggiungi più oggetti nell'array `pages`
2. Ogni pagina può avere `requireAllBeforeNext: true` per forzare la compilazione prima di procedere
3. Gli utenti possono navigare avanti/indietro tra le pagine
4. Una progress bar mostra l'avanzamento

## Esempio Completo

Vedi `esempio-1.json` per un esempio completo che include:

- 3 pagine
- Tutti i tipi di campo
- Validazioni
- Campi ricercabili
- reCAPTCHA
- Opzioni con titolo, sottotitolo e descrizione

## API Endpoints

### GET /api/v1/forms/:id

Restituisce la definizione JSON del form.

**Risposta:**
```json
{
  "ok": true,
  "data": { /* form definition */ }
}
```

### GET /forms/:id

Mostra la pagina del form renderizzato.

## Database Schema

Le submission dei form vengono salvate nella tabella `form_submissions` (datastore: log):

- `formId`: ID del form
- `formTitle`: Titolo del form
- `submissionData`: JSON con tutti i valori (chiave-valore)
- `ipAddress`: IP del mittente
- `userAgent`: User agent
- `recaptchaScore`: Score reCAPTCHA (se abilitato)
- `submittedAt`: Data/ora invio

## Best Practices

1. **ID univoci**: Usa ID descrittivi e univoci per form, pagine e campi
2. **Labels chiare**: Usa etichette chiare e concise
3. **Help text**: Aggiungi descrizioni per campi complessi
4. **Validazione**: Specifica sempre le validazioni appropriate
5. **Required fields**: Usa con parsimonia i campi obbligatori
6. **Searchable**: Abilita la ricerca per liste con più di 5-10 opzioni
7. **Multi-page**: Dividi form lunghi in più pagine logiche
8. **Testing**: Testa sempre il form prima del deploy

## Convenzioni di Naming

### Form ID
- Formato: `kebab-case`
- Esempio: `richiesta-certificato`, `cambio-medico-base`

### Page ID
- Formato: `page-1`, `page-2`, ecc. o descrittivo
- Esempio: `page-personal-info`, `page-preferences`

### Field ID
- Formato: `camelCase` o `kebab-case`
- Esempio: `firstName`, `email`, `data-nascita`

### Option Values
- Formato: `kebab-case`
- Esempio: `preferisco-non-specificare`, `medico-di-base`

## Troubleshooting

### Il form non si carica

Verifica che:
- Il file JSON esista in `/api/data/forms/`
- Il nome del file corrisponda all'ID usato nell'URL
- Il JSON sia valido (usa un validatore)
- I campi obbligatori (id, title, pages) siano presenti

### Le select non sono ricercabili

Verifica che:
- La proprietà `searchable: true` sia impostata
- Choices.js sia caricato correttamente
- Non ci siano errori JavaScript nella console

### La validazione non funziona

Verifica che:
- Il tipo di validazione sia supportato
- I campi `required` siano specificati correttamente
- I vincoli (min/max/minLength/maxLength) siano validi

## Roadmap Future Features

- [ ] Conditional fields (mostra/nascondi campi in base ad altri)
- [ ] File upload
- [ ] Date/time pickers
- [ ] Signature fields
- [ ] Auto-save draft
- [ ] Email notifications
- [ ] PDF export
- [ ] Custom CSS themes
- [ ] Field dependencies
- [ ] Multi-language support
