/**
 * @swagger
 *
 * /send:
 *   tags:
 *     - Utils
 * tags:
 *   - name: Utils
 *     description: Utility e servizi accessori
 */

const { createTransport } = require('nodemailer');
const { ERROR_TYPES } = require('../../responses/ApiResponse');

// Carica configurazione SMTP e API key
const mailConfig = require('../../../config/custom/private_mail_config.json');

let relayConfig;
try {
  relayConfig = require('../../../config/custom/private_mail_relay_config.json');
} catch (e) {
  relayConfig = null;
}

/**
 * Parsa l'URI SMTP per estrarre host, port e secure
 * Formato atteso: smtp://user:password@host:port?secure=false
 */
function parseSmtpUri(uri) {
  const url = new URL(uri);
  return {
    host: url.hostname,
    port: parseInt(url.port, 10) || 25,
    secure: url.searchParams.get('secure') === 'true',
  };
}

module.exports = {
  friendlyName: 'Send Mail',

  description: 'Invia una email tramite il server SMTP aziendale usando le credenziali fornite. Richiede API key.',

  inputs: {
    username: {
      type: 'string',
      required: true,
      description: 'Username SMTP (senza @asp.messina.it)',
    },
    password: {
      type: 'string',
      required: true,
      description: 'Password SMTP dell\'utente',
    },
    to: {
      type: 'string',
      required: true,
      description: 'Destinatario/i (separati da virgola)',
    },
    subject: {
      type: 'string',
      required: true,
      description: 'Oggetto della mail',
    },
    html: {
      type: 'string',
      required: true,
      description: 'Corpo HTML della mail',
    },
    cc: {
      type: 'string',
      description: 'CC (separati da virgola)',
    },
    bcc: {
      type: 'string',
      description: 'BCC (separati da virgola)',
    },
  },

  exits: {
    success: { description: 'Email inviata con successo' },
  },

  fn: async function (inputs, exits) {
    // --- Verifica API key ---
    if (!relayConfig || !relayConfig.apiKey) {
      return this.res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Mail relay non configurato. Creare config/custom/private_mail_relay_config.json',
      });
    }

    const apiKey = this.req.headers['x-api-key'];
    if (!apiKey || apiKey !== relayConfig.apiKey) {
      return this.res.ApiResponse({
        errType: ERROR_TYPES.NON_AUTORIZZATO,
        errMsg: 'API key mancante o non valida',
      });
    }

    // --- Costruisci transporter con credenziali dell'utente ---
    const smtpBase = parseSmtpUri(mailConfig.uri);
    const fromAddress = `${inputs.username}@asp.messina.it`;

    const transporter = createTransport({
      host: smtpBase.host,
      port: smtpBase.port,
      secure: smtpBase.secure,
      auth: {
        user: inputs.username,
        pass: inputs.password,
      },
      connectionTimeout: 15_000,
      socketTimeout: 20_000,
      tls: { rejectUnauthorized: false },
    });

    // --- Invio ---
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: inputs.to,
        subject: inputs.subject,
        html: inputs.html,
        ...(inputs.cc && { cc: inputs.cc }),
        ...(inputs.bcc && { bcc: inputs.bcc }),
      });

      sails.helpers.log.with({
        level: 'info',
        tag: 'mail-relay',
        action: 'send',
        ip: this.req.ip,
        user: inputs.username,
        params: { to: inputs.to, subject: inputs.subject },
      });

      return this.res.ApiResponse({
        data: {
          messageId: info.messageId || '',
          accepted: info.accepted || [],
          rejected: info.rejected || [],
          from: fromAddress,
        },
      });
    } catch (err) {
      sails.helpers.log.with({
        level: 'error',
        tag: 'mail-relay',
        action: 'send-error',
        ip: this.req.ip,
        user: inputs.username,
        params: { to: inputs.to, error: err.message },
      });

      return this.res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: `Errore SMTP: ${err.message}`,
      });
    }
  },
};
