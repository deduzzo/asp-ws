# Gestione Categorie Extra Data

## API Admin Categorie

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/extra-data-categorie` | Lista tutte le categorie |
| `POST` | `/api/v1/admin/extra-data-categorie` | Crea nuova categoria |
| `PUT` | `/api/v1/admin/extra-data-categorie/:id` | Modifica categoria |
| `DELETE` | `/api/v1/admin/extra-data-categorie/:id` | Disattiva categoria |

## Creare una Nuova Categoria

```json
POST /api/v1/admin/extra-data-categorie
{
  "codice": "MIA_CATEGORIA",
  "descrizione": "Descrizione della categoria",
  "campi": [
    {
      "chiave": "campo_1",
      "tipo": "string",
      "obbligatorio": true,
      "etichetta": "Etichetta campo 1"
    },
    {
      "chiave": "campo_2",
      "tipo": "number",
      "obbligatorio": false,
      "etichetta": "Etichetta campo 2"
    }
  ]
}
```

La creazione genera automaticamente gli scope:
- `anagrafica-mia_categoria-read`
- `anagrafica-mia_categoria-write`

## Tipi di Campo Supportati

| Tipo | Descrizione | Esempio |
|------|-------------|---------|
| `string` | Testo libero | Nome, codice, note |
| `number` | Valore numerico | Peso, pressione, conteggio |
| `boolean` | Vero/falso | Flag si/no |
| `date` | Data in formato YYYY-MM-DD | Data rilevazione |
| `json` | Array/oggetto JSON strutturato | Lista allergie, lista terapie |

## Tipo JSON

Per campi di tipo `json`, e' possibile definire uno schema di validazione che specifica:
- Campi ammessi nell'oggetto JSON
- Tipi di ogni campo
- Valori enum ammessi
- Campi obbligatori
- Formati date

La validazione viene eseguita dal helper `api/helpers/validate-extra-data-json.js`.

## Categorie di Default

Le categorie vengono create automaticamente dalle migrazioni SQL:

| Migrazione | Categorie |
|-----------|-----------|
| `20260323_002` | HL7_CONTATTI_EMERGENZA, HL7_ALLERGIE, HL7_PATOLOGIE_CRONICHE, HL7_ESENZIONI, HL7_TERAPIE_CRONICHE, HL7_PARAMETRI_VITALI, HL7_CONSENSI |
| `20260330_002` | SIAD_PRESA_IN_CARICO, SIAD_VALUTAZIONE_SANITARIA, SIAD_VALUTAZIONE_SOCIALE, HL7_ANAGRAFICA_EXTRA |
