/**
 * @swagger
 *
 * /modifica-utente:
 *   tags:
 *     - Admin
 */

const {ERROR_TYPES} = require('../../responses/ApiResponse');

module.exports = {
  friendlyName: 'Admin modifica utente',
  description: 'Modifica gli scopi assegnati a un utente. Supporta modalità chmod (+id aggiunge, -id rimuove) o sostituzione completa.',
  inputs: {
    id: {
      type: 'number',
      required: true,
      description: 'ID dell\'utente da modificare (ottenibile da /admin-op/search-user)'
    },
    scopi: {
      type: 'string',
      required: true,
      description: 'Scopi separati da spazio. Con +/- (es. "+1 -3 +8"): modalità incrementale. Senza prefisso (es. "1 5 8"): sostituzione completa.'
    }
  },

  fn: async function (inputs) {
    try {
      const utente = await Auth_Utenti.findOne({id: inputs.id})
        .populate('ambito')
        .populate('livello')
        .populate('scopi');

      if (!utente) {
        return this.res.ApiResponse({
          errType: ERROR_TYPES.NON_TROVATO,
          errMsg: 'Utente non trovato'
        });
      }

      const avvisi = [];
      const scopiAttuali = utente.scopi.map(s => s.id);
      let scopiFinali;

      // Parsing: split per spazi
      const entries = inputs.scopi.trim().split(/\s+/).filter(s => s.length > 0);

      if (entries.length === 0) {
        // Stringa vuota o solo spazi: rimuovi tutti gli scopi
        scopiFinali = [];
      } else {
        // Determina modalità: se almeno un elemento ha +/-, modalità chmod
        const isChmodMode = entries.some(s => s.startsWith('+') || s.startsWith('-'));

        if (isChmodMode) {
          scopiFinali = [...scopiAttuali];

          for (const entry of entries) {
            if (entry.startsWith('+')) {
              const scopoId = parseInt(entry.substring(1), 10);
              if (isNaN(scopoId)) {
                return this.res.ApiResponse({
                  errType: ERROR_TYPES.ERRORE_GENERICO,
                  errMsg: `Formato non valido: ${entry}`
                });
              }
              const scopoRecord = await Auth_Scopi.findOne({id: scopoId});
              if (!scopoRecord) {
                return this.res.ApiResponse({
                  errType: ERROR_TYPES.NON_TROVATO,
                  errMsg: `Scopo con id ${scopoId} non trovato`
                });
              }
              if (scopiFinali.includes(scopoId)) {
                avvisi.push(`Lo scopo ${scopoId} (${scopoRecord.scopo}) era già assegnato`);
              } else {
                scopiFinali.push(scopoId);
              }
            } else if (entry.startsWith('-')) {
              const scopoId = parseInt(entry.substring(1), 10);
              if (isNaN(scopoId)) {
                return this.res.ApiResponse({
                  errType: ERROR_TYPES.ERRORE_GENERICO,
                  errMsg: `Formato non valido: ${entry}`
                });
              }
              if (!scopiFinali.includes(scopoId)) {
                const scopoRecord = await Auth_Scopi.findOne({id: scopoId});
                const nome = scopoRecord ? scopoRecord.scopo : scopoId;
                avvisi.push(`Lo scopo ${scopoId} (${nome}) non era assegnato`);
              } else {
                scopiFinali = scopiFinali.filter(id => id !== scopoId);
              }
            } else {
              return this.res.ApiResponse({
                errType: ERROR_TYPES.ERRORE_GENERICO,
                errMsg: `In modalità incrementale ogni elemento deve iniziare con + o -. Trovato: ${entry}`
              });
            }
          }
        } else {
          // Modalità sostituzione completa
          scopiFinali = [];
          for (const entry of entries) {
            const id = parseInt(entry, 10);
            if (isNaN(id)) {
              return this.res.ApiResponse({
                errType: ERROR_TYPES.ERRORE_GENERICO,
                errMsg: `ID scopo non valido: ${entry}`
              });
            }
            const scopoRecord = await Auth_Scopi.findOne({id});
            if (!scopoRecord) {
              return this.res.ApiResponse({
                errType: ERROR_TYPES.NON_TROVATO,
                errMsg: `Scopo con id ${id} non trovato`
              });
            }
            scopiFinali.push(id);
          }
        }
      }

      // Applica le modifiche
      await Auth_UtentiScopi.destroy({utente: utente.id});
      for (const scopoId of scopiFinali) {
        await Auth_UtentiScopi.create({
          utente: utente.id,
          scopo: scopoId
        });
      }

      const updatedUser = await Auth_Utenti.findOne({id: utente.id})
        .populate('ambito')
        .populate('livello')
        .populate('scopi');

      await sails.helpers.log.with({
        level: 'info',
        tag: 'ADMIN',
        message: `Scopi modificati per utente ${utente.username} (id: ${utente.id})`,
        action: 'ADMIN_MODIFICA_UTENTE',
        ipAddress: this.req.ip,
        user: this.req.tokenData.username,
        context: {
          targetUserId: utente.id,
          targetUsername: utente.username,
          modalita: entries.some(s => s.startsWith('+') || s.startsWith('-')) ? 'incrementale' : 'sostituzione',
          oldScopi: scopiAttuali,
          newScopi: scopiFinali
        }
      });

      const risposta = {
        id: updatedUser.id,
        username: updatedUser.username,
        mail: updatedUser.mail,
        domain: updatedUser.domain,
        allow_domain_login: updatedUser.allow_domain_login,
        attivo: updatedUser.attivo,
        otp_enabled: updatedUser.otp_enabled,
        otp_type: updatedUser.otp_type,
        otp_required: updatedUser.otp_required,
        ambito: updatedUser.ambito,
        livello: updatedUser.livello,
        scopi: updatedUser.scopi
      };

      if (avvisi.length > 0) {
        risposta.avvisi = avvisi;
      }

      return this.res.ApiResponse({data: risposta});

    } catch (err) {
      sails.log.error('Errore admin modifica utente:', err);
      return this.res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante la modifica dell\'utente'
      });
    }
  }
};
