#!/bin/bash

# Deploy produzione ASP-WS
# Uso: ./deploy.sh

APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_FILE="$APP_DIR/deploy.log"
APP_NAME="asp-ws"

# Carica nvm se disponibile
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

handle_error() {
    log "ERRORE: $1"
    exit 1
}

cd "$APP_DIR" || handle_error "Impossibile accedere a $APP_DIR"

log "=== Deploy produzione ASP-WS ==="

# 1. Ripristino file modificati a runtime
log "[1/5] Ripristino file runtime..."
git checkout -- views/layouts/layout.ejs 2>/dev/null || true

# 2. Pull dal repository
log "[2/5] Git pull..."
git pull || handle_error "Git pull fallito"

# 3. Installazione dipendenze
log "[3/5] npm install..."
npm install --production || handle_error "Installazione dipendenze fallita"

# 4. Stop e riavvio pm2
log "[4/5] Riavvio pm2..."
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start npm --name "$APP_NAME" -- start || handle_error "Avvio PM2 fallito"
pm2 save || handle_error "Salvataggio configurazione PM2 fallito"

# 5. Verifica
log "[5/5] Stato pm2:"
pm2 status "$APP_NAME"

log "=== Deploy completato ==="
