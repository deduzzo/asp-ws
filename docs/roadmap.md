# Roadmap - Funzionalita Future

## 1. Timeline Paziente
Vista cronologica unificata per assistito: modifiche anagrafiche, extra data, valutazioni SIAD, prese in carico, link MPI — tutto in una timeline. Sia via API che nel pannello admin.

```
2026-03-15  CLINICO_PRESA_IN_CARICO creata (MMG, cure domiciliari)
2026-03-15  CLINICO_VALUTAZIONE_SANITARIA compilata (12 bisogni attivi)
2026-03-20  CLINICO_ALLERGIE aggiornata (+Penicillina)
2026-03-25  Record MPI PS_PAPARDO collegato
```

**Effort**: Basso | **Valore**: Alto

---

## 2. MPI Merge/Unmerge
Completare il flusso MPI: due record MPI della stessa persona vengono unificati sotto un unico assistito, con gestione conflitti extra data e possibilita di rollback.

- Merge: collega piu record allo stesso assistito
- Unmerge: annulla un merge errato
- Unlink: scollega un record identificato, torna aperto
- Gestione conflitti extra data (valori diversi nei due record)

**Effort**: Medio | **Valore**: Alto

---

## 3. Report e Statistiche Avanzate
Dashboard con statistiche operative:

- Assistiti per comune/distretto (con mappa)
- Prese in carico attive per tipologia
- Distribuzione patologie prevalenti (ICD9)
- Record MPI: aperti vs identificati, per app
- Valutazioni sanitarie: bisogni piu frequenti
- Trend temporali (nuove prese in carico per mese)
- Esportazione in CSV/PDF

**Effort**: Medio | **Valore**: Alto

---

## 4. Webhook/Notifiche
Notificare applicazioni esterne via webhook quando un dato cambia (nuovo link MPI, nuova allergia, presa in carico).

- Registrazione endpoint webhook per app
- Filtro per tipo evento (es. "solo link MPI", "solo allergie")
- Retry con backoff in caso di fallimento
- Log di tutte le notifiche inviate

**Effort**: Medio | **Valore**: Alto

---

## 5. Sistema Alerting Clinico
Regole automatiche sui dati extra data:

- Paziente con >3 patologie croniche + nessuna presa in carico → alert
- Allergia critica senza contatto di emergenza → alert
- Valutazione sanitaria con >10 bisogni attivi → flag fragilita
- Esenzione in scadenza entro 30 giorni → notifica
- Configurabili dall'admin

**Effort**: Alto | **Valore**: Alto

---

## 6. Import/Export Massivo
- Import CSV/Excel di assistiti o extra data (per migrazione dati)
- Export filtrato in CSV/Excel/JSON
- Validazione pre-import con report errori
- Job asincrono con progress bar

**Effort**: Medio | **Valore**: Medio

---

## 7. API Pubblica con Rate Limiting e API Key
Per integrazioni machine-to-machine:

- API key dedicate per applicazione
- Rate limiting per key (es. 100 req/min)
- Dashboard utilizzo API per app
- Documentazione Swagger per-app

**Effort**: Medio | **Valore**: Medio-Alto

---

## 8. Gestione Documenti/Allegati
Associare documenti (PDF, immagini) agli assistiti:

- Referti, certificati, consensi firmati, documenti identita
- Upload con categorizzazione
- Scope-based access
- Preview nel pannello admin

**Effort**: Medio | **Valore**: Medio

---

## 9. Modulo Cambio Medico Evoluto
- Workflow approvazione (richiesta → verifica → conferma)
- Notifica al vecchio e nuovo medico
- Storico cambi completo
- Verifica automatica capienza massimale medico

**Effort**: Medio | **Valore**: Medio

---

## 10. Portale Medico (MMG/PLS)
Frontend dedicato per i medici di base:

- Vede solo i propri assistiti
- Consulta/compila extra data (allergie, terapie, parametri vitali)
- Compila valutazioni SIAD
- Riceve notifiche su modifiche ai propri pazienti

**Effort**: Alto | **Valore**: Molto alto

---

## 11. Integrazione Keycloak SPID/CIE

Nuovo endpoint di autenticazione che accetta un JWT Keycloak (dopo login SPID o CIE) e rilascia lo stesso authtoken del sistema attuale. Keycloak fa da broker SAML: autentica via SPID/CIE, estrae il codice fiscale, emette un JWT. Il nostro backend verifica il JWT, cerca l'utente per CF, e rilascia il token con i permessi configurati.

- Endpoint: `POST /api/v1/login/get-token-spid`
- Verifica firma JWT Keycloak via JWKS
- Ricerca utente per codice fiscale + ambito
- Stesso token output del login classico
- Nessun auto-provisioning (admin crea l'utente)
- [Documento di progetto completo](auth/keycloak-spid.md)

**Effort**: Medio | **Valore**: Molto alto

---

## 12. User Vault - Credenziali Esterne Sicure

Sistema per memorizzare credenziali utente per servizi esterni (portali regionali, Sistema TS) con cifratura a 3 fattori: PIN utente + server secret + blob cifrato nel DB. Nessun singolo punto di compromissione puo rivelare i segreti.

- PIN dedicato (indipendente dalla password AD/LDAP)
- Doppio livello cifratura: PIN cifra Vault Key, Vault Key cifra i segreti
- Derivazione chiave: PBKDF2 + HKDF con server pepper
- Recovery key per reset PIN
- AES-256-GCM con IV unico per ogni cifratura
- [Documento di progetto completo](auth/vault.md)

**Effort**: Medio | **Valore**: Alto

---

## Priorita suggerita

| # | Feature | Effort | Valore |
|---|---------|--------|--------|
| 1 | Timeline Paziente | Basso | Alto |
| 2 | MPI Merge/Unmerge | Medio | Alto |
| 3 | Report/Statistiche | Medio | Alto |
| 4 | Webhook | Medio | Alto |
| 5 | Alerting Clinico | Alto | Alto |
| 6 | Import/Export | Medio | Medio |
| 7 | API Key + Rate Limit | Medio | Medio-Alto |
| 8 | Documenti/Allegati | Medio | Medio |
| 9 | Cambio Medico Evoluto | Medio | Medio |
| 10 | Portale Medico | Alto | Molto alto |
| 11 | Keycloak SPID/CIE | Medio | Molto alto |
| 12 | User Vault | Medio | Alto |
