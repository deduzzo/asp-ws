# Guida per lo Sviluppo di App Docker - ASP-WS

Questo documento contiene le istruzioni da fornire a un'istanza Claude Code per sviluppare app conformi al sistema di apps management di ASP-WS.

---

## Prompt da copiare per Claude Code

Copia il seguente blocco e incollalo come contesto quando chiedi a Claude Code di sviluppare una nuova app:

---

### Architettura Richiesta

L'app deve rispettare i seguenti vincoli per funzionare nel sistema ASP-WS:

1. **Framework**: Express.js (o altro framework Node.js/Dart)
2. **Porta**: Il server deve ascoltare sulla **porta 3000** (o `process.env.PORT || 3000`)
3. **BASE_PATH**: La variabile d'ambiente `BASE_PATH` viene iniettata automaticamente nel container con il valore `/apps/<app-id>` (es. `/apps/my-dashboard`)
4. **File statici**: Serviti con `express.static('public')` o equivalente
5. **Docker**: L'app gira in un container Docker con l'immagine `node:22-alpine` (di default)

### Gestione BASE_PATH

Il BASE_PATH e' fondamentale perche' l'app non e' servita dalla root ma da `/apps/<app-id>/`.

#### Server-side

```javascript
const BASE_PATH = process.env.BASE_PATH || '';

// Il proxy rimuove automaticamente il prefisso /apps/:appId dalle richieste.
// Quindi il server riceve le richieste come se fossero alla root.
// NON serve montare le route sotto BASE_PATH lato server.

// Questo funziona correttamente:
app.get('/api/data', (req, res) => { ... });
app.use(express.static('public'));
```

#### Client-side (Browser)

```javascript
// Il browser deve aggiungere BASE_PATH alle richieste perche' il reverse proxy
// intercetta solo le richieste che iniziano con /apps/:appId/

const pathMatch = window.location.pathname.match(/^\/apps\/([^\/]+)/);
const APP_ID = pathMatch ? pathMatch[1] : '';
const BASE_PATH = APP_ID ? `/apps/${APP_ID}` : '';

// Usa BASE_PATH per tutte le chiamate fetch/axios
fetch(`${BASE_PATH}/api/data`);

// Per link e risorse HTML, usa path relativi:
// <link rel="stylesheet" href="./style.css">
// <script src="./app.js"></script>
// <img src="./images/logo.png">
```

### WebSocket con Socket.io

Se l'app necessita di connessioni real-time:

#### Server

```javascript
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const BASE_PATH = process.env.BASE_PATH || '';

const io = new Server(httpServer, {
  path: `${BASE_PATH}/socket.io/`,
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  // gestione eventi
});

// IMPORTANTE: usare httpServer.listen, NON app.listen
httpServer.listen(process.env.PORT || 3000);
```

#### Client

```javascript
const pathMatch = window.location.pathname.match(/^\/apps\/([^\/]+)/);
const BASE_PATH = pathMatch ? `/apps/${pathMatch[1]}` : '';

const socket = io({
  path: `${BASE_PATH}/socket.io/`
});
```

### WebSocket Nativo (ws)

```javascript
// Server
const { WebSocketServer } = require('ws');
const server = createServer(app);
const wss = new WebSocketServer({ server });
// ws non richiede configurazione del path, il proxy gestisce tutto

// Client
const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//${location.host}${BASE_PATH}/`);
```

### Struttura package.json

```json
{
  "name": "nome-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

Lo script `start` e' obbligatorio. Lo script `build` (se presente) viene eseguito prima di `start`. I comandi di build e start possono essere personalizzati dall'interfaccia admin.

### Vincoli e Best Practices

1. **NON usare path assoluti** per risorse statiche nell'HTML (es. `/style.css`). Usa path relativi (`./style.css`) oppure costruisci il path con BASE_PATH
2. **NON fare hardcode** dell'app-id o del BASE_PATH. Leggili sempre dinamicamente
3. **Porta 3000**: sia HTTP che WebSocket devono usare la stessa porta
4. **Un singolo entry point**: `server.js` (o il file specificato in `scripts.start`)
5. **No variabili globali**: se servono dati condivisi, usa variabili d'ambiente tramite l'interfaccia admin
6. **Logging**: usa `console.log/error/warn` - i log sono visibili nell'interfaccia admin
7. **SPA routing**: se l'app usa client-side routing, aggiungi un fallback catch-all:
   ```javascript
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, 'public', 'index.html'));
   });
   ```

### Esempio Completo Funzionante

```
my-app/
├── package.json
├── server.js
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

**server.js:**
```javascript
const express = require('express');
const path = require('path');
const app = express();

const BASE_PATH = process.env.BASE_PATH || '';
console.log(`Starting app with BASE_PATH: ${BASE_PATH}`);

app.use(express.json());
app.use(express.static('public'));

app.get('/api/info', (req, res) => {
  res.json({ name: 'My App', version: '1.0.0' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
```

**public/index.html:**
```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App</title>
  <link rel="stylesheet" href="./style.css">
</head>
<body>
  <h1>My App</h1>
  <div id="content">Loading...</div>
  <script src="./app.js"></script>
</body>
</html>
```

**public/app.js:**
```javascript
const pathMatch = window.location.pathname.match(/^\/apps\/([^\/]+)/);
const BASE_PATH = pathMatch ? `/apps/${pathMatch[1]}` : '';

async function init() {
  const res = await fetch(`${BASE_PATH}/api/info`);
  const data = await res.json();
  document.getElementById('content').textContent =
    `${data.name} v${data.version}`;
}

init();
```

### Testing Locale

```bash
# Senza BASE_PATH
npm start
# Apri http://localhost:3000

# Con BASE_PATH (simula il deploy)
BASE_PATH=/apps/test npm start
# Apri http://localhost:3000 (il server riceve richieste senza prefisso)
```
