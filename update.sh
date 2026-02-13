#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== Aggiornamento ASP-WS ==="
echo ""

# 1. Scarta modifiche locali ai file runtime
echo "[1/5] Ripristino file modificati a runtime..."
git checkout -- views/layouts/layout.ejs 2>/dev/null || true

# 2. Pull dal repository
echo "[2/5] git pull..."
git pull

# 3. Installa dipendenze
echo "[3/5] npm install..."
npm install

# 4. Riavvio pm2
echo "[4/5] Riavvio pm2..."
pm2 delete asp-ws 2>/dev/null || true
pm2 start npm --name "asp-ws" -- start

# 5. Verifica
echo "[5/5] Stato pm2:"
pm2 status asp-ws

echo ""
echo "=== Aggiornamento completato ==="
