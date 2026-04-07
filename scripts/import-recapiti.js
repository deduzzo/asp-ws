#!/usr/bin/env node

/**
 * Script di importazione recapiti da file JSON verso extra data ANAGRAFICA_CONTATTI.
 *
 * Per ogni CF nel file:
 * 1. Ricerca l'assistito con forzaAggiornamentoTs (lo importa da TS se non presente)
 * 2. Controlla se ha già dati nella categoria ANAGRAFICA_CONTATTI (campo per campo)
 * 3. Se non presenti, carica i contatti e verifica l'esito rileggendo
 *
 * Salva un file di checkpoint (import-recapiti-checkpoint.json) per riprendere
 * da dove si era rimasti in caso di interruzione.
 *
 * Requisiti utente API:
 *   - ambito: api
 *   - scopi: asp5-anagrafica, anagrafica_contatti-read, anagrafica_contatti-write
 *   - livello: user (1)
 *
 * Uso:
 *   node scripts/import-recapiti.js --token <JWT> [--file recapiti.json] [--base-url http://localhost:1337] [--concurrency 5] [--dry-run] [--reset]
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const axios = require('axios');

// --- Parsing argomenti CLI ---
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultVal;
  return args[idx + 1];
}
const hasFlag = (name) => args.includes(`--${name}`);

const TOKEN = getArg('token');
const FILE = getArg('file', '/Users/deduzzo/Downloads/recapiti.json');
const BASE_URL = getArg('base-url', 'https://ws1.asp.messina.it');
const CONCURRENCY = parseInt(getArg('concurrency', '5'), 10);
const DRY_RUN = hasFlag('dry-run');
const RESET = hasFlag('reset');

const UI_PORT = parseInt(getArg('ui-port', '3939'), 10);
const CHECKPOINT_FILE = path.join(path.dirname(FILE), 'import-recapiti-checkpoint.json');

if (!TOKEN) {
  console.error('Errore: --token è obbligatorio');
  console.error('Uso: node scripts/import-recapiti.js --token <JWT> [--file recapiti.json] [--base-url http://localhost:1337] [--concurrency 5] [--dry-run] [--reset]');
  process.exit(1);
}

const CATEGORIA = 'ANAGRAFICA_CONTATTI';

// --- Validazione ---
const FAKE_EMAILS = new Set([
  'nessunamail@nomail.it', 'nono@no.it', 'no@no.noi', 'no@no.it',
  'e@gmail.com', 'nomail@nomail.it', 'no@nomail.it', 'nessuna@nomail.it',
  'no@no.no', 'nomail@nomail.com', 'noemail@noemail.it'
]);

function isValidEmail(v) {
  if (!v) return false;
  const lower = v.toLowerCase().trim();
  if (FAKE_EMAILS.has(lower)) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lower);
}

/**
 * Classifica un numero come 'cellulare', 'fisso' o null (invalido).
 * Ignora il "tipo" originale del file e decide in base al formato reale.
 */
function classificaNumero(valore) {
  if (!valore) return null;
  // Rimuovi spazi, trattini, punti, prefisso SMS
  let v = valore.replace(/[\s\-\.]/g, '').replace(/^SMS/i, '');
  // Deve contenere solo cifre
  if (!/^\d+$/.test(v)) return null;
  // Cellulare: inizia con 3, 10 cifre
  if (v.startsWith('3') && v.length === 10) return { tipo: 'cellulare', valore: v };
  // Fisso: inizia con 0, almeno 6 cifre, max 11
  if (v.startsWith('0') && v.length >= 6 && v.length <= 11) return { tipo: 'fisso', valore: v };
  // Tutto il resto è invalido (troppo corto, 9 cifre, prefissi strani)
  return null;
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

// --- UI Web con Server-Sent Events ---
let totalEntries = 0;
let startTime = null;
const logBuffer = []; // ultimi N messaggi di log
const MAX_LOG_LINES = 200;
const sseClients = [];

function addLog(level, msg) {
  const entry = { time: new Date().toISOString(), level, msg };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_LINES) logBuffer.shift();
  broadcastSSE({ type: 'log', ...entry });
  // Stampa anche su console
  if (level === 'error') console.error(msg);
  else console.log(msg);
}

function broadcastSSE(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try { sseClients[i].write(payload); } catch { sseClients.splice(i, 1); }
  }
}

function getStatsPayload() {
  const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
  const rate = elapsed > 0 ? (stats.totale / elapsed).toFixed(1) : 0;
  const remaining = totalEntries - stats.totale;
  const eta = rate > 0 ? Math.ceil(remaining / rate) : 0;
  return {
    type: 'stats',
    ...stats,
    totalEntries,
    completedCfs: completedCfs.size,
    elapsed: Math.floor(elapsed),
    rate: parseFloat(rate),
    eta
  };
}

// Broadcast stats ogni secondo
let statsBroadcastInterval;

const UI_HTML = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Import Recapiti - Live</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
  h1 { font-size: 1.4rem; margin-bottom: 16px; color: #38bdf8; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .card { background: #1e293b; border-radius: 10px; padding: 14px; text-align: center; }
  .card .value { font-size: 1.8rem; font-weight: 700; color: #f8fafc; }
  .card .label { font-size: .75rem; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: .05em; }
  .card.ok .value { color: #4ade80; }
  .card.warn .value { color: #fbbf24; }
  .card.fail .value { color: #f87171; }
  .card.info .value { color: #38bdf8; }
  .progress-wrap { background: #1e293b; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
  .progress-bar { background: #334155; border-radius: 6px; height: 28px; overflow: hidden; position: relative; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #0ea5e9, #22d3ee); border-radius: 6px; transition: width .3s; min-width: 0; }
  .progress-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: .85rem; font-weight: 600; color: #f8fafc; text-shadow: 0 1px 2px rgba(0,0,0,.5); }
  .meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: .8rem; color: #94a3b8; }
  .log-wrap { background: #1e293b; border-radius: 10px; padding: 16px; }
  .log-title { font-size: .9rem; font-weight: 600; margin-bottom: 8px; color: #94a3b8; }
  #log { height: 300px; overflow-y: auto; font-family: 'SF Mono', 'Fira Code', monospace; font-size: .75rem; line-height: 1.6; }
  #log div { padding: 1px 0; }
  .log-error { color: #f87171; }
  .log-info { color: #94a3b8; }
  .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; background: #4ade80; animation: pulse 1.5s infinite; }
  .status-dot.done { background: #94a3b8; animation: none; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
</style>
</head>
<body>
<h1><span class="status-dot" id="statusDot"></span>Import Recapiti &rarr; ANAGRAFICA_CONTATTI</h1>

<div class="progress-wrap">
  <div class="progress-bar">
    <div class="progress-fill" id="pbar" style="width:0%"></div>
    <div class="progress-text" id="ptxt">0%</div>
  </div>
  <div class="meta">
    <span id="elapsed">Tempo: --</span>
    <span id="rate">Velocit&agrave;: --</span>
    <span id="eta">ETA: --</span>
  </div>
</div>

<div class="grid">
  <div class="card info"><div class="value" id="sTotale">0</div><div class="label">Processati</div></div>
  <div class="card ok"><div class="value" id="sRicercaOk">0</div><div class="label">Ricerca OK</div></div>
  <div class="card fail"><div class="value" id="sRicercaFail">0</div><div class="label">Ricerca Fail</div></div>
  <div class="card warn"><div class="value" id="sGia">0</div><div class="label">Gi&agrave; presenti</div></div>
  <div class="card ok"><div class="value" id="sImportati">0</div><div class="label">Importati</div></div>
  <div class="card fail"><div class="value" id="sImportFail">0</div><div class="label">Import Fail</div></div>
  <div class="card fail"><div class="value" id="sVerificaFail">0</div><div class="label">Verifica Fail</div></div>
  <div class="card info"><div class="value" id="sSkipped">0</div><div class="label">Skipped</div></div>
</div>

<div class="log-wrap">
  <div class="log-title">Log in tempo reale</div>
  <div id="log"></div>
</div>

<script>
function fmt(s) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  return h > 0 ? h+'h '+m+'m' : m > 0 ? m+'m '+sec+'s' : sec+'s';
}
const logEl = document.getElementById('log');
const src = new EventSource('/events');
src.onmessage = (e) => {
  const d = JSON.parse(e.data);
  if (d.type === 'stats') {
    document.getElementById('sTotale').textContent = d.totale.toLocaleString();
    document.getElementById('sRicercaOk').textContent = d.ricercaOk.toLocaleString();
    document.getElementById('sRicercaFail').textContent = d.ricercaFail.toLocaleString();
    document.getElementById('sGia').textContent = d.gi\\u00e0Presenti.toLocaleString();
    document.getElementById('sImportati').textContent = d.importati.toLocaleString();
    document.getElementById('sImportFail').textContent = d.importFail.toLocaleString();
    document.getElementById('sVerificaFail').textContent = d.verificaFail.toLocaleString();
    document.getElementById('sSkipped').textContent = d.skipped.toLocaleString();
    const pct = d.totalEntries > 0 ? ((d.totale / d.totalEntries) * 100).toFixed(1) : 0;
    document.getElementById('pbar').style.width = pct + '%';
    document.getElementById('ptxt').textContent = pct + '%';
    document.getElementById('elapsed').textContent = 'Tempo: ' + fmt(d.elapsed);
    document.getElementById('rate').textContent = 'Velocit\\u00e0: ' + d.rate + '/s';
    document.getElementById('eta').textContent = 'ETA: ' + (d.eta > 0 ? fmt(d.eta) : '--');
  } else if (d.type === 'log') {
    const div = document.createElement('div');
    div.className = d.level === 'error' ? 'log-error' : 'log-info';
    div.textContent = d.time.substr(11,8) + ' ' + d.msg;
    logEl.appendChild(div);
    if (logEl.children.length > 500) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
  } else if (d.type === 'done') {
    document.getElementById('statusDot').classList.add('done');
  }
};
</script>
</body>
</html>`;

function startUIServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });
        sseClients.push(res);
        req.on('close', () => {
          const idx = sseClients.indexOf(res);
          if (idx >= 0) sseClients.splice(idx, 1);
        });
        // Invia stato iniziale
        res.write(`data: ${JSON.stringify(getStatsPayload())}\n\n`);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(UI_HTML);
    });
    server.listen(UI_PORT, () => {
      console.log(`UI live disponibile su: http://localhost:${UI_PORT}`);
      resolve(server);
    });
  });
}

// --- Contatori ---
const stats = {
  totale: 0,
  ricercaOk: 0,
  ricercaFail: 0,
  giàPresenti: 0,
  importati: 0,
  importFail: 0,
  verificaFail: 0,
  skipped: 0
};

// --- Checkpoint ---
let completedCfs = new Set();

function loadCheckpoint() {
  if (RESET) {
    console.log('Reset checkpoint richiesto, si riparte da zero.');
    return;
  }
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
      completedCfs = new Set(data.completedCfs || []);
      console.log(`Checkpoint caricato: ${completedCfs.size} CF già processati, si riprende da dove eravamo.`);
    }
  } catch {
    console.log('Nessun checkpoint trovato, si parte da zero.');
  }
}

function saveCheckpoint() {
  const data = {
    lastSave: new Date().toISOString(),
    totalCompleted: completedCfs.size,
    stats: { ...stats },
    completedCfs: Array.from(completedCfs)
  };
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data), 'utf8');
}

// Salvataggio periodico e su interruzione
let checkpointDirty = false;
function markDirty() { checkpointDirty = true; }

function periodicSave() {
  if (checkpointDirty) {
    saveCheckpoint();
    checkpointDirty = false;
  }
}
const saveInterval = setInterval(periodicSave, 5000);

// Salva su SIGINT/SIGTERM
function gracefulShutdown(signal) {
  console.log(`\n${signal} ricevuto. Salvataggio checkpoint...`);
  saveCheckpoint();
  clearInterval(saveInterval);
  console.log(`Checkpoint salvato: ${completedCfs.size} CF completati.`);
  console.log('Puoi riprendere rieseguendo lo stesso comando.');
  process.exit(0);
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Converte l'array di contatti dal file nel formato valori extra data.
 * Riclassifica i numeri in base al formato reale (non al "tipo" del file):
 *   - Inizia con 3 + 10 cifre → cellulare
 *   - Inizia con 0 + 6-11 cifre → fisso
 *   - Tutto il resto → scartato
 * Cellulari multipli: 1° → cellulare_privato, 2° → cellulare_altro
 * Fissi multipli: 1° → fisso_privato, 2° → fisso_altro
 */
function mapContatti(contatti) {
  const valori = {};
  const cellulari = [];
  const fissi = [];

  for (const c of contatti) {
    if (!c.valore || !c.valore.trim()) continue;

    if (c.tipo === 'email') {
      if (isValidEmail(c.valore)) {
        valori.email = c.valore.trim();
      }
      continue;
    }

    if (c.tipo === 'pec') {
      if (isValidEmail(c.valore)) {
        valori.pec = c.valore.trim();
      }
      continue;
    }

    // cellulare o telefono: classifica in base al formato reale
    const classificato = classificaNumero(c.valore);
    if (!classificato) continue;

    if (classificato.tipo === 'cellulare') {
      cellulari.push(classificato.valore);
    } else {
      fissi.push(classificato.valore);
    }
  }

  if (cellulari[0]) valori.cellulare_privato = cellulari[0];
  if (cellulari[1]) valori.cellulare_altro = cellulari[1];
  if (fissi[0]) valori.fisso_privato = fissi[0];
  if (fissi[1]) valori.fisso_altro = fissi[1];

  return valori;
}

/**
 * Ricerca assistito: prima senza forzare TS (veloce), poi con forzaAggiornamentoTs se non trovato.
 */
async function ricercaAssistito(cf) {
  try {
    // Prima ricerca veloce nel DB locale
    const resp = await apiClient.post('/api/v1/anagrafica/ricerca', {
      codiceFiscale: cf
    });
    if (resp.data && resp.data.ok && resp.data.data && resp.data.data.totalCount > 0) {
      return true;
    }
  } catch { /* ignora */ }

  // Non trovato localmente: prova con aggiornamento TS
  try {
    const resp = await apiClient.post('/api/v1/anagrafica/ricerca', {
      codiceFiscale: cf,
      forzaAggiornamentoTs: true
    });
    return resp.data && resp.data.ok && resp.data.data && resp.data.data.totalCount > 0;
  } catch {
    return false;
  }
}

/**
 * Recupera i dati extra esistenti per ANAGRAFICA_CONTATTI.
 * Ritorna l'oggetto con i campi esistenti, o null se nessun dato.
 */
async function getExtraData(cf) {
  try {
    const resp = await apiClient.get(`/api/v1/anagrafica/extra-data/${cf}`);
    if (resp.data && resp.data.ok && resp.data.data && resp.data.data.extraData) {
      const catData = resp.data.data.extraData[CATEGORIA];
      if (catData && Object.keys(catData).length > 0) {
        return catData;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Carica i contatti per un assistito.
 */
async function setExtraData(cf, valori) {
  try {
    const resp = await apiClient.post(`/api/v1/anagrafica/extra-data/${cf}`, {
      categoria: CATEGORIA,
      valori
    });
    return resp.data && resp.data.ok;
  } catch {
    return false;
  }
}

/**
 * Processa un singolo CF.
 */
async function processaCf(cf, contatti) {
  stats.totale++;

  // Già processato in una run precedente
  if (completedCfs.has(cf)) {
    stats.skipped++;
    return;
  }

  const valoriDaImportare = mapContatti(contatti);
  if (Object.keys(valoriDaImportare).length === 0) {
    stats.skipped++;
    completedCfs.add(cf);
    markDirty();
    return;
  }

  // 1. Ricerca con aggiornamento TS
  const trovato = await ricercaAssistito(cf);
  if (!trovato) {
    stats.ricercaFail++;
    addLog('error', `[FAIL-RICERCA] ${cf} - Non trovato nemmeno su TS`);
    return; // Non segniamo come completato: si riprova alla prossima run
  }
  stats.ricercaOk++;

  // 2. Recupera dati esistenti e filtra solo i campi mancanti
  const esistenti = await getExtraData(cf);
  if (esistenti) {
    // Rimuovi dai valori da importare quelli che esistono già
    for (const chiave of Object.keys(valoriDaImportare)) {
      if (esistenti[chiave] !== undefined && esistenti[chiave] !== null && esistenti[chiave] !== '') {
        delete valoriDaImportare[chiave];
      }
    }
    if (Object.keys(valoriDaImportare).length === 0) {
      stats.giàPresenti++;
      addLog('info', `[GIÀ-PRESENTE] ${cf} - Tutti i campi già valorizzati`);
      completedCfs.add(cf);
      markDirty();
      return;
    }
  }

  // 3. Carica i contatti
  if (DRY_RUN) {
    addLog('info', `[DRY-RUN] ${cf} → ${JSON.stringify(valoriDaImportare)}`);
    stats.importati++;
    completedCfs.add(cf);
    markDirty();
    return;
  }

  const ok = await setExtraData(cf, valoriDaImportare);
  if (!ok) {
    stats.importFail++;
    addLog('error', `[FAIL-SET] ${cf} - Errore nel salvataggio extra data`);
    return;
  }

  // 4. Verifica rileggendo i dati appena scritti
  const verifica = await getExtraData(cf);
  if (!verifica) {
    stats.verificaFail++;
    addLog('error', `[FAIL-VERIFICA] ${cf} - Dati non trovati dopo scrittura`);
    return;
  }

  let verificaOk = true;
  for (const [chiave, valore] of Object.entries(valoriDaImportare)) {
    if (verifica[chiave] !== valore) {
      verificaOk = false;
      addLog('error', `[FAIL-VERIFICA] ${cf} - Campo ${chiave}: atteso "${valore}", trovato "${verifica[chiave]}"`);
    }
  }

  if (verificaOk) {
    stats.importati++;
    addLog('info', `[OK] ${cf} → ${JSON.stringify(valoriDaImportare)}`);
    completedCfs.add(cf);
    markDirty();
  } else {
    stats.verificaFail++;
  }
}

/**
 * Esecuzione parallela con limite di concorrenza.
 */
async function runWithConcurrency(entries, fn, concurrency) {
  let index = 0;
  const total = entries.length;

  async function worker() {
    while (index < total) {
      const i = index++;
      const [cf, contatti] = entries[i];
      await fn(cf, contatti);

      if (stats.totale % 500 === 0) {
        addLog('info', `Progresso: ${stats.totale}/${total} | OK: ${stats.ricercaOk} | Già presenti: ${stats.giàPresenti} | Importati: ${stats.importati} | Fail: ${stats.ricercaFail + stats.importFail}`);
      }
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
}

async function main() {
  // Avvia UI web
  const uiServer = await startUIServer();

  console.log('=== Import Recapiti → ANAGRAFICA_CONTATTI ===');
  console.log(`File: ${FILE}`);
  console.log(`Checkpoint: ${CHECKPOINT_FILE}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Concorrenza: ${CONCURRENCY}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log('');

  loadCheckpoint();

  addLog('info', 'Caricamento file JSON...');
  const raw = fs.readFileSync(FILE, 'utf8');
  const data = JSON.parse(raw);
  const entries = Object.entries(data);
  totalEntries = entries.length;

  const daProcessare = entries.filter(([cf]) => !completedCfs.has(cf)).length;
  addLog('info', `CF totali: ${entries.length} | Da processare: ${daProcessare} | Checkpoint: ${completedCfs.size}`);

  if (daProcessare === 0) {
    addLog('info', 'Tutti i CF sono già stati processati. Usa --reset per ripartire da zero.');
    broadcastSSE({ type: 'done' });
    return;
  }

  startTime = Date.now();

  // Broadcast stats ogni secondo
  statsBroadcastInterval = setInterval(() => broadcastSSE(getStatsPayload()), 1000);

  await runWithConcurrency(entries, processaCf, CONCURRENCY);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Salvataggio finale
  clearInterval(saveInterval);
  clearInterval(statsBroadcastInterval);
  saveCheckpoint();

  // Broadcast finale
  broadcastSSE(getStatsPayload());
  broadcastSSE({ type: 'done' });

  addLog('info', '=== Completato ===');
  addLog('info', `Tempo: ${elapsed}s | Processati: ${stats.totale} | Importati: ${stats.importati} | Già presenti: ${stats.giàPresenti} | Fail: ${stats.ricercaFail + stats.importFail + stats.verificaFail} | Skipped: ${stats.skipped}`);
  addLog('info', `Checkpoint salvato: ${completedCfs.size} CF completati`);

  // Tieni il server UI attivo 60s dopo il completamento per consultare i risultati
  addLog('info', 'UI ancora disponibile per 60s...');
  setTimeout(() => { uiServer.close(); process.exit(0); }, 60000);
}

main().catch(err => {
  console.error('Errore fatale:', err.message);
  saveCheckpoint();
  process.exit(1);
});
