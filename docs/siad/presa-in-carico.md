# SIAD - Presa in Carico

## Categoria: SIAD_PRESA_IN_CARICO

Registra l'evento di presa in carico di un paziente per assistenza domiciliare.

## Campi

| Campo | Tipo | Obbl. | Descrizione | Valori |
|-------|------|:-----:|-------------|--------|
| `data_presa_in_carico` | date | Si | Data della presa in carico | YYYY-MM-DD |
| `soggetto_richiedente` | string | Si | Chi ha richiesto la presa in carico | Vedi tabella |
| `tipologia_pic` | string | Si | Tipologia presa in carico | `1` = Cure domiciliari, `2` = UCPDOM |
| `pianificazione_condivisa` | string | No | Pianificazione condivisa cure in cartella | `si` / `no` |
| `patologia_prevalente` | string | Si | Patologia prevalente | Codice ICD9 (max 5 char) |
| `patologia_concomitante` | string | Si | Patologia concomitante | Codice ICD9 (`000` = non presente) |
| `nucleo_familiare` | number | Si | Numero componenti nucleo familiare conviventi | Numero |
| `assistente_non_familiare` | string | Si | Assistente non familiare (badante) convivente | `si` / `no` |
| `note` | string | No | Note aggiuntive | Testo libero |

## Soggetto Richiedente

| Codice | Descrizione |
|--------|-------------|
| `1` | Servizi sociali |
| `2` | MMG/PLS |
| `3` | Ospedale |
| `4` | Ospedale per dimissione protetta |
| `5` | Struttura residenziale extraospedaliera |
| `6` | Utente/familiari (anche tramite Punto unico di accesso) |
| `7` | Apertura amministrativa per riassetto territoriale ASL |
| `8` | Apertura amministrativa della stessa persona presa in carico |
| `9` | Altro |
| `10` | Hospice |
| `11` | Servizi territoriali/distrettuali |
| `12` | Medico specialista |
| `13` | Ambulatorio cure palliative |

## Tipologia Presa in Carico

| Codice | Descrizione |
|--------|-------------|
| `1` | **Cure domiciliari** — DPCM 12 gennaio 2017, art. 22 |
| `2` | **UCPDOM** — Unita di Cure Palliative Domiciliari |

> Per UCPDOM, sono obbligatori anche i campi `pianificazione_condivisa` e i campi UCPDOM nella valutazione sanitaria.

## Esempio

```json
POST /api/v1/anagrafica/extra-data/RSSMRA80A01F158Z
{
  "categoria": "SIAD_PRESA_IN_CARICO",
  "valori": {
    "data_presa_in_carico": "2026-03-15",
    "soggetto_richiedente": "2",
    "tipologia_pic": "1",
    "patologia_prevalente": "250",
    "patologia_concomitante": "401",
    "nucleo_familiare": 3,
    "assistente_non_familiare": "no"
  }
}
```
