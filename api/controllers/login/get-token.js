/**
 * @swagger
 *
 * /get-token:
 *   tags:
 *     - Auth
 * tags:
 *   - name: Auth
 *     description: Gestione autenticazione e autorizzazione. Include eventuale richiesta di autenticazione OTP
 */

const {generateToken} = require('../../services/JwtService');
const {ERROR_TYPES} = require('../../responses/ApiResponse');
const moment = require('moment');
const {sendMail} = require('../../services/MailService');
const {utils} = require("aziendasanitaria-utils/src/Utils");
const OTP_MIN_OTHER_REQUEST= 2;
const OTP_EXPIRE_MINUTES = 10;

module.exports = {
  friendlyName: 'GetToken',

  description:
    'Genera un token JWT per l\'utente specificato con scopo e ambito specificati. L\'utente deve essere abilitato ed avere il permesso sullo scopo e lo stesso ambito d\'utenza',

  inputs: {
    login: {
      type: 'string',
      required: true,
      description: 'Login utente'
    },
    password: {
      type: 'string',
      required: true,
      description: 'Password utente'
    },
    scopi: {
      type: 'string',
      required: true,
      description:
        'Scopo del token, almeno uno obbligatorio, separati da spazi.'
    },
    ambito: {
      type: 'string',
      required: false,
      description:
        'Ambito d\'utenza del token. In caso di campo vuoto il valore di default è "generale"'
    },
    otp: {
      type: 'string',
      required: false,
      description:
        'OTP di autenticazione'
    },
    domain: {
      type: 'string',
      required: false,
      minLength: 3,
      description: 'Se valorizzato e valido, effettua il login con il dominio specificato.'
    }
  },

  exits: {},

  fn: async function (inputs, exits) {
    const res = this.res;
    let utente = null;
    let domain = null;
    try {
      if (inputs.domain) {
        utente = await Auth_Utenti.findOne({username: inputs.login, domain: inputs.domain})
          .populate('scopi')
          .populate('ambito');
        domain = inputs.domain;
      } else {
        // Cerca l'utente in base al login e popola i campi relazionati
        utente = await Auth_Utenti.findOne({username: inputs.login, domain: null})
          .populate('scopi')
          .populate('ambito');
      }

      if (!utente) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_AUTORIZZATO,
          errMsg: 'Utente non trovato'
        });
      }

      if (!utente.attivo) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_AUTORIZZATO,
          errMsg: 'Utente non attivo'
        });
      }

      // Se la data di disattivazione è passata, disattiva l'utente
      if (utente.data_disattivazione && utente.data_disattivazione <= Date.now()) {
        await Auth_Utenti.updateOne({username: inputs.login}).set({attivo: false});
        return res.ApiResponse({
          errType: ERROR_TYPES.ERRORE_GENERICO,
          errMsg: 'Utente non attivo'
        });
      }

      // Verifica la password
      if (!domain) {
        await sails.helpers.passwords.checkPassword(inputs.password, utente.hash_password);
      } else {
        let verificaDominio = await sails.helpers.domainLogin.with({
          username: inputs.login,
          password: inputs.password,
          domain: domain
        });
        if (!verificaDominio) {
          return res.ApiResponse({
            errType: ERROR_TYPES.NON_AUTORIZZATO,
            errMsg: 'Utente non abilitato o password errata nel dominio'
          });
        }
      }

      // Verifica l'OTP
      if (utente.otp_enabled) {
        switch (utente.otp_type) {
          case 'mail':
            if (utente.mail) {
              if (!inputs.otp) {
                // richiede un nuovo token, lo inviamo solo se non ha richiesto un otp nell'ultimo minuto
                if (!utente.otp || (utente.otp_exp && moment().isAfter(moment(utente.otp_exp).subtract(OTP_EXPIRE_MINUTES - OTP_MIN_OTHER_REQUEST, 'minutes')))) {
                  // invia l'otp
                  // genera un numero casuale di 6 cifre
                  const otp = Math.floor(100000 + Math.random() * 900000).toString();
                  const otpExpire = moment().add(OTP_EXPIRE_MINUTES, 'minute').valueOf();
                  // salva l'otp nel database
                  await Auth_Utenti.updateOne({id: utente.id}).set({otp: await utils.hashPasswordArgon2(otp),otp_exp: otpExpire});
                  // invia l'otp al mail
                  const HTML = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  </head>
                  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
                      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; margin-top: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                          <div style="text-align: center; margin-bottom: 30px;">
                              <h1 style="color: #333333; margin: 0;">Codice di Autenticazione</h1>
                          </div>

                          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin-bottom: 20px;">
                              <h2 style="margin: 0; color: #333333; letter-spacing: 5px; font-size: 32px;">${otp}</h2>
                          </div>

                          <div style="color: #666666; font-size: 14px; line-height: 1.6;">
                              <p>Il tuo codice di autenticazione OTP è riportato sopra. Questo codice scadrà tra ${OTP_EXPIRE_MINUTES} minuti.</p>
                              <p>Se non hai richiesto questo codice, puoi ignorare questa email.</p>
                          </div>

                          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee; color: #999999; font-size: 12px; text-align: center;">
                              <p>Questo è un messaggio automatico, si prega di non rispondere.</p>
                          </div>
                      </div>
                  </body>
                  </html>`;
                  let mail = await sendMail(
                    utente.mail,
                    'Codice OTP di sicurezza',
                    HTML
                  );
                  if (mail.accepted.length > 0) {
                    return res.ApiResponse({
                      data: {
                        otpExpire: utils.convertUnixTimestamp(otpExpire,'Europe/Rome', "YYYY-MM-DD HH:mm:ss"),
                      }
                    });
                  } else {
                    return res.ApiResponse({
                      errType: ERROR_TYPES.NON_AUTORIZZATO,
                      errMsg: 'Errore invio OTP'
                    });
                  }
                }
                else // attendere
                {
                  return res.ApiResponse({
                    errType: ERROR_TYPES.NON_AUTORIZZATO,
                    errMsg: 'E\' necessario attendere prima di richiedere un nuovo token'
                  });
                }
              }
              else if (utente.otp) {
                let valid = false;
                // verifica token
                // verifica se il token è expired
                const expired = moment().isAfter(moment(utente.otp_exp));
                if (expired) {
                  await Auth_Utenti.updateOne({id: utente.id}).set({otp: null, otp_exp: null});
                  return res.ApiResponse({
                    errType: ERROR_TYPES.NON_AUTORIZZATO,
                    errMsg: 'Token OTP scaduto'
                  });
                }
                // verifica se il token è valido
                valid = await utils.verifyPasswordArgon2(utente.otp, inputs.otp);
                if (!valid) {
                  return res.ApiResponse({
                    errType: ERROR_TYPES.NON_AUTORIZZATO,
                    errMsg: 'Token OTP non valido'
                  });
                }
                else
                  await Auth_Utenti.updateOne({id: utente.id}).set({otp: null, otp_exp: null});
              }
              else {
                return res.ApiResponse({
                  errType: ERROR_TYPES.NON_AUTORIZZATO,
                  errMsg: 'Nessun OTP richiesto. Procedi a richiedere un nuovo otp'
                });
              }
            } else {
              return res.ApiResponse({
                errType: ERROR_TYPES.NON_AUTORIZZATO,
                errMsg: 'Mail non disponibile per inviare l\'otp'
              });
            }
            break;
          default: // errore, tipo otp non valido
            return res.ApiResponse({
              errType: ERROR_TYPES.NON_AUTORIZZATO,
              errMsg: 'Tipo di otp non valido'
            });
        }
      }

      // Verifica l'ambito
      if (!inputs.ambito || utente.ambito.ambito !== inputs.ambito) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_AUTORIZZATO,
          errMsg: 'Ambito non autorizzato'
        });
      }

      // Controlla che tutti gli scopi richiesti siano presenti in utente.scopi
      const scopi = inputs.scopi.split(' ').map(s => s.trim()).filter(s => s.length > 0);
      const scopiUtenteAttivi = utente.scopi.filter(s => s.attivo).map(s => s.scopo);
      const utenteHaAutorizzazioneAScopoToken = scopi.every(s => scopiUtenteAttivi.includes(s));
      if (!utenteHaAutorizzazioneAScopoToken) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_AUTORIZZATO,
          errMsg: 'Scopo non autorizzato'
        });
      }

      // Genera il token
      const token = generateToken({
        username: utente.username,
        scopi: scopi,
        ambito: utente.ambito.ambito,
        livello: utente.livello
      });
      if (!token) {
        return res.ApiResponse({
          errType: ERROR_TYPES.ERRORE_DEL_SERVER,
          errMsg: 'Errore generazione token'
        });
      }

      // Restituisce il token generato con exit success
      return res.ApiResponse({
        data: token
      });
    } catch
      (err) {
      // if is incorrect
      if (err.code === 'incorrect' && err.exit === 'incorrect') {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_AUTORIZZATO,
          errMsg: 'Password errata'
        });
      }
      return res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore generico'
      });
    }
  }
};
