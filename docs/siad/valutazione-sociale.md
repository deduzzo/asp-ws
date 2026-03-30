# SIAD - Valutazione Sociale

## Categoria: SIAD_VALUTAZIONE_SOCIALE

Valutazione dei bisogni sociali dell'assistito, complementare alla valutazione sanitaria.

## Campi

| Campo | Tipo | Obbl. | Descrizione | Valori |
|-------|------|:-----:|-------------|--------|
| `data_valutazione` | date | Si | Data della valutazione | YYYY-MM-DD |
| `supporto_sociale` | string | Si | Supporto da rete formale e informale | `1` = Presenza, `2` = Presenza parziale/temporanea, `3` = Non presenza |
| `fragilita_familiare` | string | Si | Presenza di fragilita familiare | `si` / `no` |
| `disturbi_cognitivi` | string | Si | Disturbi cognitivi (memoria, orientamento, attenzione) | `1` = Assenti/lievi, `2` = Moderati, `3` = Gravi |
| `disturbi_comportamentali` | string | Si | Disturbi comportamentali | `1` = Assenti/lievi, `2` = Moderati, `3` = Gravi |
| `responsabilita_genitoriale` | string | No | Solo per minori (eta <= 17 anni) | Vedi tabella |
| `note` | string | No | Note aggiuntive | Testo libero |

## Supporto Sociale

Il supporto sociale include:
- Supporto da parte della **famiglia** e della **rete informale**
- Supporto per pratiche burocratiche e diritti di legge
- Inserimento scolastico
- Comunita di pari

## Responsabilita Genitoriale

Obbligatorio solo se l'assistito e' **minorenne** (eta <= 17 alla data presa in carico):

| Codice | Descrizione |
|--------|-------------|
| `1` | Materna |
| `2` | Paterna |
| `3` | Condivisa |
| `4` | Da tutore |
| `5` | Struttura pubblica o convenzionata |
| `9` | Non disponibile |

## Esempio

```json
POST /api/v1/anagrafica/extra-data/RSSMRA80A01F158Z
{
  "categoria": "SIAD_VALUTAZIONE_SOCIALE",
  "valori": {
    "data_valutazione": "2026-03-15",
    "supporto_sociale": "2",
    "fragilita_familiare": "si",
    "disturbi_cognitivi": "2",
    "disturbi_comportamentali": "1"
  }
}
```

## Mapping SIAD

| Nostro valore | Codice SIAD | Descrizione SIAD |
|---------------|-------------|------------------|
| `si` (fragilita) | `1` | Presente |
| `no` (fragilita) | `2` | Assente |
