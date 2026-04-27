# API Cambio Medico — Guida per integrazione client/app

> Documento di riferimento per l'istanza Claude (o sviluppatore) che svilupperà l'app frontend di cambio medico, integrandola con i web service `asp-ws`.
>
> **Versione**: 2026-04-27 (compatibile con `aziendasanitaria-utils@1.2.46`).
>
> Tutte le chiamate sono autenticate via JWT Bearer token e richiedono lo scope `cambio-medico` (livello minimo `user`).

---

## 1. Indice

1. [Autenticazione](#2-autenticazione)
2. [Convenzione di risposta](#3-convenzione-di-risposta)
3. [Flusso end-to-end](#4-flusso-end-to-end)
4. [Endpoint di lookup](#5-endpoint-di-lookup-lettura)
5. [Endpoint di submit](#6-endpoint-di-submit-cambio-medico)
6. [Endpoint di verifica](#7-endpoint-di-verifica-multi-sistema-nar2--ts)
7. [Casi particolari ed errori](#8-casi-particolari-ed-errori)
8. [Esempio completo (pseudocodice JS)](#9-esempio-end-to-end-pseudocodice-js)
9. [Dettaglio campi medico in `verifica`](#10-dettaglio-campi-medico-in-verifica)
10. [Metriche Prometheus per il sysop](#11-metriche-prometheus)

---

## 2. Autenticazione

Tutte le chiamate richiedono header:

```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

Il JWT deve avere lo scope `cambio-medico` e livello `user` o superiore.

Ottenimento token: `POST /api/v1/login/get-token` (endpoint pubblico).

---

## 3. Convenzione di risposta

Tutti gli endpoint usano il response handler `ApiResponse`:

```json
{
  "ok": true | false,
  "err": null | { "code": "ERROR_CODE", "msg": "..." },
  "data": { /* payload */ } | null
}
```

In caso di errore validazione Sails (400) il formato è diverso: `{ "problems": [...] }`. Gestire entrambi i casi nel client.

---

## 4. Flusso end-to-end

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. POST /login/get-token                          → JWT                    │
├────────────────────────────────────────────────────────────────────────────┤
│ 2. POST /cambio-medico/get-ambito-domicilio-assistito                     │
│    (input: cfAssistito)                            → ambiti MMG/Pediatra  │
├────────────────────────────────────────────────────────────────────────────┤
│ 3. POST /cambio-medico/get-medici-disponibili-assistito                   │
│    (input: cfAssistito, tipoMedico)                → lista medici liberi  │
├────────────────────────────────────────────────────────────────────────────┤
│ 4. (Opzionale) POST /cambio-medico/get-situazioni-ammesse                 │
│    se serve cambiare il default sa_cod=13                                  │
├────────────────────────────────────────────────────────────────────────────┤
│ 5. POST /cambio-medico/effettua-cambio                                    │
│    {cfAssistito, pfIdMedico, dryRun:true}          → preview payload       │
│    → utente conferma                                                       │
│    {cfAssistito, pfIdMedico, dryRun:false}         → submit reale + pm_id │
├────────────────────────────────────────────────────────────────────────────┤
│ 6. (Differita ~5 min) POST /cambio-medico/verifica                        │
│    {cfAssistito, pfIdAtteso}                       → coerenza NAR2 vs TS  │
└────────────────────────────────────────────────────────────────────────────┘
```

**Importante**: il cambio medico viene scritto su NAR2. Da NAR2 un trigger asincrono propaga la modifica al Sistema TS (Sogei). **Questo trigger può fallire o ritardare di minuti/ore.** Per questo è fondamentale chiamare l'endpoint di verifica dopo qualche minuto e gestire il caso `divergenza === "ts_non_aggiornato"` (riprovare la verifica più tardi).

---

## 5. Endpoint di lookup (lettura)

Tutti `POST` (richiedono Bearer token, scope `cambio-medico`).

### 5.1 `POST /api/v1/cambio-medico/get-ambito-domicilio-assistito`

Restituisce ambiti di domicilio MMG/Pediatra per un assistito (in base al comune di residenza).

**Input:**
```json
{ "cfAssistito": "DDMRRT86A03F158E" }
```

**Output:**
```json
{
  "ok": true,
  "data": {
    "ambiti": {
      "mmg": [
        { "sr_id": "140", "sr_codice": "20502M03", "sr_desc": "MESSINA CITTA' - AMBITO 3" }
      ],
      "pediatri": [ { "sr_id": "...", "sr_desc": "..." } ]
    },
    "distretto": { "sr_desc": "..." }
  }
}
```

### 5.2 `POST /api/v1/cambio-medico/get-medici-disponibili-assistito`

Restituisce i medici **liberi** (non massimalisti) negli ambiti di domicilio dell'assistito.

**Input:**
```json
{ "cfAssistito": "DDMRRT86A03F158E", "tipoMedico": "M" }
```
- `tipoMedico`: `"M"` MMG, `"P"` Pediatra

**Output:**
```json
{
  "ok": true,
  "data": {
    "medici": [
      {
        "pf_id": 10193,
        "pf_nome": "ELIO MARIA",
        "pf_cognome": "ADAMO",
        "codice_reg": "...",
        "massimale": 1500,
        "scelte": 1234,
        "carico": 1234,
        "medico_massimalista": false,
        "deroga": null
      }
    ],
    "ambiti": { "140": "MESSINA CITTA' - AMBITO 3" },
    "distretto": "..."
  }
}
```

> **`pf_id`** è la chiave da passare a `effettua-cambio` come `pfIdMedico`.

### 5.3 `POST /api/v1/cambio-medico/get-situazioni-assistenziali-assistito`

Restituisce lo **storico** delle situazioni assistenziali (sitAss_) del paziente — utile per visualizzazione dello stato attuale del rapporto medico-paziente.

**Input:**
```json
{ "codiceFiscale": "DDMRRT86A03F158E", "includeFullData": false }
```

> **NB:** questo endpoint legge `/PazienteMedico/...` (storico), NON le situazioni ammesse per un nuovo cambio. Per quelle vedi 5.4.

### 5.4 `POST /api/v1/cambio-medico/get-situazioni-ammesse` 🆕

Restituisce le situazioni assistenziali **ammesse per un nuovo cambio medico** (endpoint NAR2 `/getOnlySitAss`). Da usare se l'utente vuole specificare un sa_cod diverso dal default `13` (Cambio medico nell'ASL).

**Input:**
```json
{ "cfAssistito": "DDMRRT86A03F158E", "tipoMedico": "M", "pmId": "36968471" }
```
- `pmId` è opzionale (default `null` per nuova scelta)

**Output:** array di situazioni con `sa_id`, `sa_cod`, `sa_desc`, `motivo_op[]` con `eg_id` e `gentgen[]`. Vedi `CAMBIO_MEDICO_NAR2.md` § 6 per il dettaglio dei campi.

### 5.5 `POST /api/v1/cambio-medico/get-categorie-cittadino` 🆕

Restituisce le categorie cittadino (`sc_id`) ammesse per una specifica `sa_id`.

**Input:** `{ "saId": "4" }` → **Output:** `{ "data": ["44","43","66","132","131"] }`

### 5.6 `POST /api/v1/cambio-medico/search-ambiti` 🆕

Autocomplete ambiti per UI con typeahead.

**Input:**
```json
{ "searchKey": "mess", "azienda": "83", "tipo": "90000000038" }
```
- `tipo`: `"90000000038"` (Ambito MMG, default), `"90000000040"` (Distretto)

### 5.7 `POST /api/v1/cambio-medico/search-medici` 🆕

Autocomplete medici per ambito (con dati estesi: CF, codice regionale, ENPAM, massimali).

**Input:**
```json
{
  "idAmbito": "140",
  "cfAssistito": "DDMRRT86A03F158E",
  "searchKey": "ros",
  "tipoMedico": "M",
  "sitAssistenziale": 4
}
```

### 5.8 `POST /api/v1/cambio-medico/get-situazione-medico`

Restituisce numero scelte/carico/massimale di un singolo medico (dato il `pf_id`).

**Input:** `{ "pf_id": 10193 }`

### 5.9 `POST /api/v1/cambio-medico/get-medici`

Lista completa medici dell'ASL con filtri (MMG/Pediatra, attivi, ecc.). Per pagine di gestione massive — non per il flusso cambio medico.

---

## 6. Endpoint di submit cambio medico

### `POST /api/v1/cambio-medico/effettua-cambio` 🆕

Esegue il submit del cambio medico verso NAR2. **Default `dryRun: true`** per sicurezza: il payload viene costruito ma non inviato a NAR2. Per inviare davvero passare esplicitamente `dryRun: false`.

**Input minimo:**
```json
{
  "cfAssistito": "DDMRRT86A03F158E",
  "pfIdMedico": 10193,
  "dryRun": true
}
```

**Input completo (tutti opzionali tranne i primi due):**
```json
{
  "cfAssistito": "DDMRRT86A03F158E",
  "pfIdMedico": 10193,
  "dryRun": false,
  "tipoMedico": "M",
  "codiceSituazioneAssistenziale": "13",
  "idSituazioneAssistenziale": null,
  "idAmbitoScelta": "140",
  "idAmbitoDomicilio": "140",
  "motivoScelta": "90000000025",
  "tipoOperazioneScelta": "39100000036",
  "forzaSenzaRevoca": false
}
```

**Output (dry-run):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "dryRun": true,
    "payload": {
      "data": {"pm_paz": 1128286, "pm_fstato": "A", "pm_medico": 10193, "pm_dt_enable": "2026-04-27", "pm_mot_scelta": "90000000025"},
      "dett_pazientemedico": {"dm_ambito_dom": "140", "dm_situazione_ass": "4", "dm_eta_scelta": 40, "dm_ambito_scelta": "140", "dm_motivo_scelta": "90000000025", "dm_tipoop_scelta": "39100000036"},
      "revoca_scelta_precedente": {"pm_dt_disable": "2026-04-26", "dm_dt_ins_revoca": "2026-04-27", "dm_motivo_revoca": "90000000025", "dm_tipoop_revoca": "39100000038", "revoca_id": 36968471}
    },
    "response": null,
    "newPmId": null,
    "newPmRMedico": null
  }
}
```

**Output (submit reale OK):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "dryRun": false,
    "payload": { /* stesso del dry-run */ },
    "response": {
      "pm_id": 36968473,
      "pm_paz": 1128286,
      "pm_medico": 10193,
      "pm_r_medico": "66066",
      "pm_dt_ins": "2026-04-27 10:15:00",
      "pm_ut_ins": "roberto.dedomenico"
    },
    "newPmId": 36968473,
    "newPmRMedico": "66066"
  }
}
```

**Output errore:**
```json
{
  "ok": false,
  "err": { "code": "cambio_medico_failed", "msg": "Situazione assistenziale non ammessa per questo paziente..." },
  "data": null
}
```

> ✅ **Best practice client**: prima invocare `effettua-cambio` con `dryRun: true`, mostrare il payload all'utente per conferma, poi inviare con `dryRun: false`.

---

## 7. Endpoint di verifica multi-sistema (NAR2 + TS)

### `POST /api/v1/cambio-medico/verifica` 🆕

Legge in parallelo i dati del medico assegnato all'assistito da **NAR2** e da **Sistema TS (Sogei)**, restituisce i due snapshot e l'esito di coerenza.

**Use case principale**: dopo un `effettua-cambio` con `dryRun:false`, attendere ~5 minuti e chiamare questo endpoint per verificare che il trigger NAR2→TS abbia propagato il cambio.

**Input:**
```json
{
  "cfAssistito": "DDMRRT86A03F158E",
  "pfIdAtteso": 10193,
  "codRegAtteso": "ME12345",
  "cfMedicoAtteso": "RSSMRC70A01F205B"
}
```
- `pfIdAtteso`, `codRegAtteso`, `cfMedicoAtteso` sono **tutti opzionali** — se forniti, viene popolato `matchAtteso` per ciascun sistema.

**Output:**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "cf": "DDMRRT86A03F158E",
    "nar2": {
      "ok": true,
      "medico": {
        "cfMedico": "DMOLMR55A01F158K",
        "codReg": "ME001234",
        "cognome": "ADAMO",
        "nome": "ELIO MARIA",
        "tipo": "MMG",
        "ultimoStato": "A",
        "ultimaOperazione": "1",
        "dataScelta": "2026-04-27",
        "dataRevoca": null
      },
      "errore": null
    },
    "ts": {
      "ok": true,
      "medico": { "cfMedico": "DMOLMR55A01F158K", "codReg": "ME001234", "...": "..." },
      "errore": null
    },
    "coerenti": true,
    "matchAtteso": { "nar2": true, "ts": true },
    "divergenza": null
  }
}
```

### Possibili valori di `divergenza`

| Valore | Significato | Cosa fare |
|---|---|---|
| `null` | NAR2 e TS allineati sullo stesso medico | ✅ Tutto ok |
| `"medici_diversi"` | Entrambi hanno un medico ma è diverso | ⚠️ Anomalia. Probabile race condition o errore di propagazione. Allertare operatore |
| `"ts_non_aggiornato"` | NAR2 ha il medico nuovo, TS non ha medico assegnato | ⏳ Trigger NAR2→TS non ancora completato. **Riprovare la verifica fra qualche minuto** (consiglio: backoff esponenziale 5min, 15min, 1h, 4h, 24h) |
| `"nar2_non_aggiornato"` | TS ha un medico, NAR2 no | 🚨 Inconsistente — molto raro. Allertare operatore |
| `"errore"` | Entrambi i sistemi non hanno restituito dati validi | ❌ Errore comunicazione. Riprovare la verifica |

### Logica di `coerenti`

```
coerenti === true ⇔ entrambi i sistemi hanno un medico
                  AND (medicoNar2.cfMedico === medicoTs.cfMedico
                       OR medicoNar2.codReg === medicoTs.codReg)
```

### Logica di `matchAtteso`

`null` se nessun valore atteso fornito. Altrimenti `{nar2: bool, ts: bool}` dove `true` significa che il medico letto da quel sistema corrisponde al `cfMedicoAtteso` o `codRegAtteso` passato.

---

## 8. Casi particolari ed errori

### 8.1 Prima iscrizione (assistito senza medico precedente)

`storico_medici` di NAR2 è vuoto. Il payload non avrà `revoca_scelta_precedente`. Per situazioni speciali può servire `tipoOperazioneScelta: "39100000037"` (Nuova iscrizione) invece del default `"39100000036"` (Scelta).

### 8.2 Pediatri (`tipoMedico: "P"`)

I parametri `dm_dt_fine_proroga_ped` e `dm_motivo_pror_scad_ped` sono cablati a `null` per MMG. Per Pediatri con proroga oltre il 14° anno andranno passati nel `effettua-cambio` (campi non ancora esposti come input — TODO: aggiungere se necessari).

### 8.3 Situazioni in deroga (`sa_cod` 31, 19, 17)

Richiedono `motivoScelta` differenti (A06=`90000000027`, A19=`90000000140`). Per la deroga territoriale (`sa_cod=31`): `motivoScelta="90000000140"` e `tipoOperazioneScelta="39100000037"` (Nuova iscrizione).

### 8.4 Token JWT scaduto o invalido

Risposta dal middleware `is-token-verified`: HTTP 401 con `{ok:false, err:{code:"token_invalid"}}`. Il client deve rifare login.

### 8.5 Errori comuni

| Sintomo | Causa probabile | Fix |
|---|---|---|
| `cambio_medico_failed` "Situazione assistenziale non ammessa" | `sa_cod` di default non valido per quel paziente | Chiamare `get-situazioni-ammesse` e usare uno dei `sa_id` ammessi via `idSituazioneAssistenziale` |
| `cambio_medico_failed` "Impossibile determinare l'ambito di domicilio" | Paziente senza ambito assegnato | Passare `idAmbitoDomicilio` esplicitamente |
| HTTP 500 su submit reale | `pf_id` non valido o non in quell'ambito | Verificare il `pf_id` con `get-medici-disponibili-assistito` o `search-medici` |
| `divergenza: "ts_non_aggiornato"` persistente >24h | Trigger NAR2→TS rotto/disabilitato | Allertare sysop ASP/Regione |

---

## 9. Esempio end-to-end (pseudocodice JS)

```javascript
const API = 'https://asp-ws.example.it/api/v1';
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function api(path, body) {
  const r = await fetch(`${API}${path}`, {method: 'POST', headers, body: JSON.stringify(body)});
  const j = await r.json();
  if (!j.ok) {throw new Error((j.err && j.err.msg) || 'API error');}
  return j.data;
}

// 1. Mostra ambiti e medici disponibili
const ambiti = await api('/cambio-medico/get-ambito-domicilio-assistito', {cfAssistito: cf});
const {medici} = await api('/cambio-medico/get-medici-disponibili-assistito', {cfAssistito: cf, tipoMedico: 'M'});

// 2. L'utente sceglie un medico dalla UI → otteniamo pfIdMedico
const pfIdMedico = medici[0].pf_id;

// 3. Preview (dry-run)
const preview = await api('/cambio-medico/effettua-cambio', {
  cfAssistito: cf, pfIdMedico, dryRun: true
});
showPreviewToUser(preview.payload);

// 4. Submit reale dopo conferma
const submit = await api('/cambio-medico/effettua-cambio', {
  cfAssistito: cf, pfIdMedico, dryRun: false
});
console.log('Cambio medico salvato, pm_id:', submit.newPmId);

// 5. Verifica subito su NAR2 (sarà ok)
const verifica1 = await api('/cambio-medico/verifica', {cfAssistito: cf, pfIdAtteso: pfIdMedico});
// Probabilmente: { coerenti: false, divergenza: "ts_non_aggiornato" }

// 6. Verifica differita su TS dopo 5 min
setTimeout(async () => {
  const verifica2 = await api('/cambio-medico/verifica', {cfAssistito: cf, pfIdAtteso: pfIdMedico});
  if (verifica2.coerenti) {
    console.log('✅ Cambio medico propagato anche a TS');
  } else if (verifica2.divergenza === 'ts_non_aggiornato') {
    console.warn('⏳ TS ancora non aggiornato — riprovare più tardi');
    // schedule retry con backoff
  } else {
    console.error('🚨 Anomalia:', verifica2.divergenza);
  }
}, 5 * 60 * 1000);
```

---

## 10. Dettaglio campi medico in `verifica`

Lo snapshot `medico` (sia per `nar2` che per `ts`) ha sempre la stessa struttura:

| Campo | Tipo | Descrizione |
|---|---|---|
| `cfMedico` | string\|null | Codice fiscale del medico |
| `codReg` | string\|null | Codice regionale del medico |
| `cognome` | string\|null | Cognome |
| `nome` | string\|null | Nome |
| `tipo` | string\|null | Tipo (es. `"MMG"`, `"PLS"`) |
| `ultimoStato` | string\|null | Stato del rapporto (es. `"A"` attivo) |
| `ultimaOperazione` | string\|null | Codice ultima operazione (es. `"1"` Scelta, `"3"` Revoca) |
| `dataScelta` | string\|null | Data della scelta del medico |
| `dataRevoca` | string\|null | Data revoca (null se attivo) |

Se la fonte non ha restituito dati validi, `medico.cfMedico` e `medico.codReg` sono entrambi `null` e l'oggetto top-level avrà `ok: false` con `errore` valorizzato.

---

## 11. Metriche Prometheus

Per monitorare le operazioni di cambio medico, sono esposte queste metriche su `/metrics` (basic auth):

| Metrica | Label | Esiti |
|---|---|---|
| `cambio_medico_submit_total` | `esito` | `ok`, `ko`, `dry_run` |
| `cambio_medico_verifica_total` | `esito` | `coerenti`, `divergenti`, `ts_non_aggiornato`, `nar2_non_aggiornato`, `errore` |

Allerte consigliate:
- `rate(cambio_medico_submit_total{esito="ko"}[5m]) > 0` — submit falliti
- `rate(cambio_medico_verifica_total{esito="divergenti"}[1h]) > 0` — divergenze persistenti NAR2 vs TS
- `cambio_medico_verifica_total{esito="ts_non_aggiornato"} / sum without(esito)(cambio_medico_verifica_total) > 0.1` — trigger NAR2→TS lento

---

## Appendice A — Riferimento implementazione lato server

| Layer | File |
|---|---|
| Controller submit | `api/controllers/cambio-medico/effettua-cambio.js` |
| Controller verifica | `api/controllers/cambio-medico/verifica.js` |
| Controller lookup nuovi | `api/controllers/cambio-medico/get-situazioni-ammesse.js`, `get-categorie-cittadino.js`, `search-ambiti.js`, `search-medici.js` |
| Service | `api/services/MediciService.js` (`effettuaCambioMedico`, `verificaCambioMedico`, `getSituazioniAssistenzialiAmmesse`, `getCategorieCittadinoBySituazione`, `searchAmbitiAutocomplete`, `searchMediciByAmbitoAutocomplete`) |
| Libreria sottostante | `aziendasanitaria-utils@1.2.46` — `src/narTsServices/Nar2.js` (metodi `aggiornaCambioMedico`, `getDatiAssistitoCompleti`, ecc.) |
| Routes | `config/routes.js` — sezione `cambio-medico/*` |
| Tag log | `api/models/Log.js` — `CAMBIO_MEDICO_SUBMIT_*`, `CAMBIO_MEDICO_VERIFICA_*` |
| Metriche | `api/services/MetricsService.js` (gauge) + counter inline in controller |

## Appendice B — Documento di riferimento NAR2

Per dettagli sulle API NAR2 sottostanti, payload completi, situazioni assistenziali, motivi e codici operazione, vedere:
**`/Users/deduzzo/dev/aziendasanitaria-utils/docs/CAMBIO_MEDICO_NAR2.md`** (autosufficiente).

Quel documento descrive il flusso "raw" verso NAR2; questo documento descrive le API del nostro WS che lo wrappano e lo arricchiscono con la verifica multi-sistema.
