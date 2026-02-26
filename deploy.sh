#!/bin/bash

# Directory del progetto
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_FILE="$APP_DIR/deploy.log"
APP_NAME="asp-ws"

# Funzione di logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
    echo "$1"
}

# Gestione errori
handle_error() {
    log "ERRORE: $1"
    exit 1
}

cd $APP_DIR || handle_error "Impossibile accedere a $APP_DIR"

# Installazione dipendenze
log "Installazione dipendenze npm..."
npm install --production || handle_error "Installazione dipendenze fallita"

# Riavvio PM2 se usato
if pm2 list | grep -q "$APP_NAME"; then
    log "Riavvio applicazione con PM2..."
    pm2 reload $APP_NAME || handle_error "Riavvio PM2 fallito"
else
    # Prima installazione PM2
    log "Configurazione iniziale PM2..."
    pm2 start app.js --name "$APP_NAME" || handle_error "Avvio PM2 fallito"
    pm2 save || handle_error "Salvataggio configurazione PM2 fallito"
fi

log "Deployment completato con successo"
