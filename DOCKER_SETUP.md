# Docker Setup Guide

Questa guida spiega come configurare Docker per la funzionalità di gestione app containerizzate in ASP-WS.

## Prerequisiti

- Docker installato sul server
- Utente con cui viene eseguita l'applicazione (es. `aspme`)

## Configurazione Permessi Docker

L'applicazione necessita di eseguire comandi Docker. Ci sono due modalità di configurazione:

### Opzione 1: Sudo senza password (Consigliata per produzione)

Questa è la configurazione attualmente in uso. Permette all'applicazione di eseguire comandi Docker tramite sudo senza richiedere password.

1. **Configurare sudoers per Docker:**

```bash
sudo visudo
```

2. **Aggiungere la seguente riga alla fine del file:**

```
aspme ALL=(ALL) NOPASSWD: /usr/bin/docker
```

Sostituire `aspme` con il nome dell'utente che esegue l'applicazione.

3. **Salvare e uscire:**
   - In nano: `Ctrl+X`, poi `Y`, poi `Enter`
   - In vim: `Esc`, poi `:wq`, poi `Enter`

4. **Verificare la configurazione:**

```bash
# Provare a eseguire un comando docker con sudo senza password
sudo docker ps
# Non dovrebbe richiedere password
```

### Opzione 2: Gruppo Docker (Alternativa)

Se si preferisce non usare sudo, è possibile aggiungere l'utente al gruppo docker:

1. **Aggiungere l'utente al gruppo docker:**

```bash
sudo usermod -aG docker aspme
```

2. **Verificare l'aggiunta al gruppo:**

```bash
groups aspme
# Dovrebbe includere "docker"
```

3. **Applicare i cambiamenti:**

È necessario fare logout/login o riavviare completamente PM2:

```bash
# Se si usa PM2
pm2 kill
# Poi riavviare l'applicazione
pm2 start app.js --name asp-ws
```

**Nota:** Con questa opzione, modificare anche il file `api/services/AppsService.js` rimuovendo `sudo` dai comandi docker (linee 294, 403, 429, 455, 495).

## Riavvio dell'Applicazione

Dopo aver configurato i permessi Docker, è **necessario riavviare completamente l'applicazione**:

```bash
# Se si usa PM2
pm2 restart asp-ws

# Oppure riavvio completo di PM2
pm2 kill
pm2 start ecosystem.config.js  # o il comando di avvio appropriato
```

## Verifica Funzionamento

1. **Verificare che Docker sia accessibile:**

```bash
# Con sudo
sudo docker ps

# Senza sudo (solo se si usa Opzione 2)
docker ps
```

2. **Verificare i log dell'applicazione:**

```bash
pm2 logs asp-ws
```

Cercare i messaggi:
- `Initializing apps-proxy hook...`
- `Apps proxy middleware configured successfully`

3. **Testare la creazione di un'app:**

Accedere all'interfaccia di gestione app e provare a creare e avviare un'app di test.

## Configurazione Docker Settings (Opzionale)

È possibile creare un file di configurazione per gestire le impostazioni Docker:

```bash
# Creare il file di configurazione
sudo nano /path/to/asp-ws/config/custom/docker_settings.json
```

Contenuto:

```json
{
  "useSudo": true,
  "sudoPassword": null
}
```

- `useSudo`: `true` per usare sudo, `false` per gruppo docker
- `sudoPassword`: lasciare `null` (non supportato per motivi di sicurezza)

## Troubleshooting

### Errore: "permission denied while trying to connect to Docker daemon socket"

**Soluzione:** L'utente non ha i permessi per accedere a Docker. Seguire i passaggi dell'Opzione 1 o 2 sopra.

### Errore: "sudo: a password is required"

**Soluzione:** La configurazione sudoers non è corretta. Verificare che la riga in `/etc/sudoers` sia corretta e includa `NOPASSWD:`.

### L'applicazione non riesce a fare pull delle immagini

**Soluzione:** Verificare la connessione internet e che Docker sia avviato:

```bash
sudo systemctl status docker
sudo systemctl start docker  # se non è avviato
```

### I container non si avviano

**Soluzione:** Verificare i log del container:

```bash
sudo docker logs <container_id>
```

E controllare i log dell'applicazione:

```bash
pm2 logs asp-ws
```

## Porte Utilizzate

L'applicazione assegna automaticamente porte ai container a partire da **3100**. Assicurarsi che queste porte siano disponibili e non bloccate da firewall.

Per verificare le porte in uso:

```bash
sudo docker ps
# oppure
sudo netstat -tulpn | grep LISTEN
```

## Sicurezza

- **NON memorizzare mai password sudo** nei file di configurazione
- Limitare i permessi sudo **solo al comando docker**: `/usr/bin/docker`
- Considerare l'uso di Docker in modalità rootless per maggiore sicurezza
- Verificare regolarmente i container in esecuzione: `sudo docker ps`

## Riferimenti

- [Docker Documentation](https://docs.docker.com/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Sudoers Manual](https://www.sudo.ws/docs/man/sudoers.man/)
