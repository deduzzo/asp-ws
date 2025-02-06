#!/bin/bash

# Directory del progetto (quella in cui risiede app.js)
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_FILE="$APP_DIR/deploy.log"

# Funzione di logging
log() {
  # Scrive sia sullo stdout che sul file di log con timestamp
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Gestione errori
handle_error() {
  log "ERRORE: $1"
  exit 1
}

# Entra nella cartella del progetto
cd "$APP_DIR" || handle_error "Impossibile accedere a $APP_DIR"
log "$APP_DIR"

# Installazione dipendenze in produzione
log "Installazione dipendenze npm..."
npm install --production || handle_error "Installazione dipendenze fallita"

# Controlla se l'app sails-app è già in esecuzione
pm2 show sails-app &>/dev/null
if [ $? -eq 0 ]; then
    # Processo trovato: ricarico
    log "Riavvio applicazione con PM2..."
    pm2 reload sails-app || handle_error "Riavvio PM2 fallito"
else
    # Processo non trovato: avvio per la prima volta
    log "Configurazione iniziale PM2..."
    pm2 start app.js --name "sails-app" || handle_error "Avvio PM2 fallito"
    pm2 save || handle_error "Salvataggio configurazione PM2 fallito"
fi

log "Deployment completato con successo"
