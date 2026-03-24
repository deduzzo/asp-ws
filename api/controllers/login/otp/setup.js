/**
 * @swagger
 *
 * /setup:
 *   tags:
 *     - Otp
 * tags:
 *   - name: Otp
 *     description: Gestione OTP (One-Time Password). Setup, verifica e switch tra metodi OTP (mail, authenticator TOTP)
 */

const {ERROR_TYPES} = require('../../../responses/ApiResponse');
const {generateSecret, generateURI} = require('otplib');
const QRCode = require('qrcode');

module.exports = {
  friendlyName: 'OtpSetup',

  description: 'Genera un secret TOTP e restituisce il QR code per configurare l\'app authenticator. Non attiva ancora il TOTP.',

  inputs: {},

  exits: {
    success: {
      description: 'Secret generato e QR code restituito'
    }
  },

  fn: async function (inputs, exits) {
    const req = this.req;
    const res = this.res;

    try {
      const username = req.tokenData.username;

      const utente = await Auth_Utenti.findOne({username});

      if (!utente) {
        return res.ApiResponse({
          errType: ERROR_TYPES.NON_TROVATO,
          errMsg: 'Utente non trovato'
        });
      }

      // Genera il secret TOTP
      const secret = generateSecret();

      // Salva il secret (non attiva ancora il TOTP)
      await Auth_Utenti.updateOne({id: utente.id}).set({
        otp_key: secret
      });

      // Genera l'URI otpauth:// per il QR code
      const otpauthUrl = generateURI({secret, issuer: 'ASP Messina', label: username});

      // Genera il QR code come data URL
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

      await sails.helpers.log.with({
        level: 'info',
        tag: 'OTP_SETUP',
        message: 'Secret TOTP generato',
        action: 'otp-setup',
        ipAddress: req.ip,
        user: username
      });

      return res.ApiResponse({
        data: {
          qrCode: qrCodeDataUrl,
          secret: secret,
          otpauthUrl: otpauthUrl
        }
      });

    } catch (err) {
      sails.log.error('Errore OTP setup:', err);
      return res.ApiResponse({
        errType: ERROR_TYPES.ERRORE_DEL_SERVER,
        errMsg: 'Errore durante il setup OTP'
      });
    }
  }
};
