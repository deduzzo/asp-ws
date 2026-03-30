# Dashboard Admin

## Accesso

La dashboard admin e' accessibile all'indirizzo `/admin` ed e' protetta da:
- **Basic Auth** — Credenziali configurate in `config/custom/private_ui_users.json`
- **JWT** — Token con livello `superAdmin` (99)

## Sezioni

### Gestione Utenti
- Creazione, modifica, disabilitazione utenti
- Assegnazione scope e domini
- Reset password
- Configurazione OTP

### Gestione Categorie Extra Data
- Visualizzazione categorie attive
- Creazione nuove categorie con schema campi
- Modifica schema e scope
- Attivazione/disattivazione

### Gestione Extra Data per Assistito
- Ricerca assistito per codice fiscale
- Visualizzazione valori extra data con definizioni campi
- Modifica/inserimento valori
- Storico completo modifiche

### Applicazioni MPI
- Registrazione nuove applicazioni
- Modifica dati applicazione (codice, nome, versione, contatto)
- Attivazione/disattivazione

### Record MPI
- Ricerca avanzata con filtri (CF, cognome, nome, stato, app, codice, UUID)
- Dettaglio record con confronto dati MPI vs Anagrafica
- Collegamento (link) a un assistito
- Annullamento record
- Storico completo operazioni
- Rilevamento collisioni (duplicati potenziali)

## Rilevamento Collisioni MPI

Il sistema evidenzia automaticamente i record con **stesso cognome e nome** provenienti da applicazioni diverse. Questo aiuta gli operatori a identificare possibili duplicati e procedere con il collegamento o il futuro merge.
