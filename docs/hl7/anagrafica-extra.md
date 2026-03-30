# Anagrafica Extra (HL7)

## Categoria: HL7_ANAGRAFICA_EXTRA

Questa categoria contiene i dati anagrafici aggiuntivi previsti dallo standard HL7 che non sono presenti come campi diretti nel modello `Anagrafica_Assistiti`.

## Campi

| Campo | Tipo | Descrizione | Valori ammessi |
|-------|------|-------------|----------------|
| `stato_civile` | string | Stato civile dell'assistito | `1` = celibe/nubile, `2` = coniugato, `3` = separato, `4` = divorziato, `5` = vedovo, `9` = non dichiarato |
| `titolo_studio` | string | Titolo di studio | Codice da tabella (HL7 Table 360) |
| `professione` | string | Professione | Codice da tabella (HL7 Table 327) |
| `condizione_lavorativa` | string | Condizione lavorativa | Codice da tabella (HL7 Table 311) |

## Riferimenti HL7

| Campo | Segmento HL7 | Note |
|-------|-------------|------|
| Stato civile | PID-16 (Marital Status) | Tabella 0002 |
| Titolo studio | PID-5.6 (Degree) | Tabella 360 |
| Professione | NK1-11 (Job Code) con NK1-7=PR | Tabella 327 |
| Condizione lavorativa | NK1-34 (Job Status) con NK1-7=PR | Tabella 311 |

## Riferimenti SIAD

Il flusso SIAD v7.4 prevede anche i seguenti campi nei dati anagrafici:

| Campo SIAD | Mapping |
|-----------|---------|
| Stato Civile | `stato_civile` (stessi codici) |
| Cittadinanza | Gia presente in `comuneNascita` per stranieri (codice ISO 3166 Alpha-2) |

## Esempio

```json
POST /api/v1/anagrafica/extra-data/RSSMRA80A01F158Z
{
  "categoria": "HL7_ANAGRAFICA_EXTRA",
  "valori": {
    "stato_civile": "2",
    "professione": "MEDICO",
    "condizione_lavorativa": "OCCUPATO"
  }
}
```
