# SIAD - Valutazione Sanitaria

## Categoria: CLINICO_VALUTAZIONE_SANITARIA

Valutazione dei bisogni sanitari dell'assistito al momento della presa in carico o della rivalutazione. Comprende 37 campi clinici.

## Campi Generali

| Campo | Tipo | Obbl. | Descrizione | Valori |
|-------|------|:-----:|-------------|--------|
| `data_valutazione` | date | Si | Data della valutazione | YYYY-MM-DD |
| `autonomia` | string | No | Livello autonomia (dai 6 anni) | `1` = autonomo, `2` = parz. dipendente, `3` = totalmente dipendente |
| `grado_mobilita` | string | No | Grado mobilita (dai 3 anni) | `1` = si sposta da solo, `2` = si sposta assistito, `3` = non si sposta |

## Bisogni Assistenziali (si/no)

Tutti i seguenti campi accettano `si` o `no`:

### Area Respiratoria

| Campo | Descrizione |
|-------|-------------|
| `broncorespirazione_drenaggio` | Broncorespirazione / Drenaggio posturale |
| `ossigeno_terapia` | Ossigeno terapia |
| `ventiloterapia` | Ventiloterapia |
| `tracheostomia` | Tracheostomia |

### Area Alimentazione

| Campo | Descrizione |
|-------|-------------|
| `alimentazione_assistita` | Alimentazione assistita |
| `alimentazione_enterale` | Alimentazione enterale |
| `alimentazione_parenterale` | Alimentazione parenterale |

### Area Eliminazione e Cute

| Campo | Descrizione |
|-------|-------------|
| `gestione_stomia` | Gestione stomia |
| `eliminazione_urinaria_intestinale` | Eliminazione urinaria / intestinale (anche cateterismo) |
| `lesioni_cute` | Lesioni della cute |
| `ulcere_cutanee_1_2_grado` | Cura ulcere cutanee 1-2 grado |
| `ulcere_cutanee_3_4_grado` | Cura ulcere cutanee 3-4 grado |

### Area Diagnostica e Terapeutica

| Campo | Descrizione |
|-------|-------------|
| `prelievi_venosi` | Prelievi venosi non occasionali |
| `ecg` | ECG |
| `telemetria` | Telemetria |
| `terapia_sottocutanea_im_infusionale` | Terapia sottocutanea / intramuscolare / infusionale |
| `gestione_catetere_centrale` | Gestione catetere centrale |
| `trasfusioni` | Trasfusioni |
| `controllo_dolore` | Controllo dolore |
| `educazione_terapeutica` | Interventi di educazione terapeutica |

### Area Riabilitativa

| Campo | Descrizione |
|-------|-------------|
| `trattamento_riab_neurologico` | Trattamento riabilitativo neurologico (disabilita) |
| `trattamento_riab_motorio` | Trattamento riabilitativo motorio |
| `trattamento_riab_mantenimento` | Trattamento riabilitativo di mantenimento (disabilita) |

### Area Assistenziale

| Campo | Descrizione |
|-------|-------------|
| `ritmo_sonno_veglia` | Alterazione ritmo sonno / veglia |
| `supervisione_continua` | Supervisione continua (disabilita) |
| `assistenza_iadl` | Assistenza IADL (disabilita) |
| `assistenza_adl` | Assistenza ADL (disabilita) |
| `supporto_care_giver` | Supporto care giver |

### Area Rischio e Palliativa

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `rischio_infettivo` | si/no | Rischio infettivo |
| `rischio_sanguinamento_acuto` | si/no | Rischio sanguinamento acuto |
| `cure_palliative` | si/no | Cure palliative (Karnofsky < 30) |

### Campi UCPDOM (obbligatori solo per tipologia PIC = 2)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `segno_sintomo_clinico` | string | Codice ICD9-CM (Tabella Segni Sintomi Clinici) |
| `strumento_bisogno_cp` | si/no | Utilizzo strumento identificazione bisogno cure palliative |
| `strumento_val_multidimensionale` | si/no | Utilizzo strumento valutazione multidimensionale |

### Note

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `note` | string | Note aggiuntive alla valutazione |

## Mapping SIAD → Nostro Sistema

I valori `si`/`no` corrispondono ai codici SIAD:
- `si` → `1` (Bisogno presente)
- `no` → `2` (Bisogno assente)

Per i campi con valore `9` (non disponibile) nel SIAD, usare il campo vuoto/null.
