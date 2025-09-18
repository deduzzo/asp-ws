const { createTransport } = require('nodemailer');
const configData = require('../../config/custom/private_mail_config.json');

module.exports = {
  /**
   * Invia una mail HTML
   * @param {string} to - destinatario (o lista separata da virgole)
   * @param {string} subject - oggetto della mail
   * @param {string} html - corpo HTML
   */
  sendMail: async function (to, subject, html) {
    if (!configData.uri || !configData.from || !to || !subject || !html) {
      throw new Error("Parametri mancanti: servono configUri, from, to, subject, html.");
    }

    // Crea il transporter a partire dall'URI
    const transporter = createTransport(configData.uri, {
      connectionTimeout: 15_000,
      socketTimeout: 20_000,
    });

    // (opzionale) verifica connessione SMTP
    try {
      await transporter.verify();
    } catch (e) {
      // Alcuni server rifiutano VERIFY: puoi ignorare
    }

    const info = await transporter.sendMail({
      from:configData.from,
      to,
      subject,
      html,
    });

    return {
      messageId: info.messageId || "",
      accepted: info.accepted || [],
      rejected: info.rejected || [],
    };
  }
};
