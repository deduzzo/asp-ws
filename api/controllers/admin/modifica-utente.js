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
  description: 'Modifica gli scopi assegnati a un utente. Supporta modalità chmod (+nome aggiunge, -nome rimuove) o sostituzione completa per nome.',
  inputs: {
    id: {
      type: 'number',
      required: true,
      description: 'ID dell\'utente da modificare (ottenibile da /admin-op/search-user)'
    },
    scopi: {
      type: 'string',
      required: true,
      description: 'Scopi separati da spazio. Con +/- (es. "+flusso-m -esenzioni"): modalità incrementale. Senza prefisso (es. "flusso-m esenzioni"): sostituzione completa.'
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

      // Helper: risolvi nome o ID scopo → record
      const resolveScopo = async (nomeOId) => {
        // Prova prima come ID numerico
        const asNum = parseInt(nomeOId, 10);
        if (!isNaN(asNum) && String(asNum) === nomeOId) {
          return await Auth_Scopi.findOne({id: asNum});
        }
        // Altrimenti cerca per nome
        return await Auth_Scopi.findOne({scopo: nomeOId});
      };

      const avvisi = [];
      const scopiAttualiIds = utente.scopi.map(s => s.id);
      let scopiFinali;

      const entries = inputs.scopi.trim().split(/\s+/).filter(s => s.length > 0);

      if (entries.length === 0) {
        scopiFinali = [];
      } else {
        const isChmodMode = entries.some(s => s.startsWith('+') || s.startsWith('-'));

        if (isChmodMode) {
          scopiFinali = [...scopiAttualiIds];

          for (const entry of entries) {
            if (entry.startsWith('+')) {
              const nome = entry.substring(1);
              const scopoRecord = await resolveScopo(nome);
              if (!scopoRecord) {
                return this.res.ApiResponse({
                  errType: ERROR_TYPES.NON_TROVATO,
                  errMsg: `Scopo "${nome}" non trovato`
                });
              }
              if (scopiFinali.includes(scopoRecord.id)) {
                avvisi.push(`Lo scopo "${scopoRecord.scopo}" era già assegnato`);
              } else {
                scopiFinali.push(scopoRecord.id);
              }
            } else if (entry.startsWith('-')) {
              const nome = entry.substring(1);
              const scopoRecord = await resolveScopo(nome);
              if (!scopoRecord) {
                return this.res.ApiResponse({
                  errType: ERROR_TYPES.NON_TROVATO,
                  errMsg: `Scopo "${nome}" non trovato`
                });
              }
              if (!scopiFinali.includes(scopoRecord.id)) {
                avvisi.push(`Lo scopo "${scopoRecord.scopo}" non era assegnato`);
              } else {
                scopiFinali = scopiFinali.filter(id => id !== scopoRecord.id);
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
            const scopoRecord = await resolveScopo(entry);
            if (!scopoRecord) {
              return this.res.ApiResponse({
                errType: ERROR_TYPES.NON_TROVATO,
                errMsg: `Scopo "${entry}" non trovato`
              });
            }
            scopiFinali.push(scopoRecord.id);
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
          oldScopi: scopiAttualiIds,
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
