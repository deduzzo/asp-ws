#!/bin/bash

# Directory del progetto
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_FILE="$APP_DIR/deploy.log"

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
if ./node_modules/.bin/pm2 list | grep -q "sails-app"; then
    log "Riavvio applicazione con PM2..."
    ./node_modules/.bin/pm2 reload sails-app || handle_error "Riavvio PM2 fallito"
else
    # Prima installazione PM2
    log "Configurazione iniziale PM2..."
    ./node_modules/.bin/pm2 start app.js --name "sails-app" || handle_error "Avvio PM2 fallito"
    ./node_modules/.bin/pm2 save || handle_error "Salvataggio configurazione PM2 fallito"
fi

log "Deployment completato con successo"
