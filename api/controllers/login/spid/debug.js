/* eslint-disable camelcase */
/**
 * @swagger
 *
 * /debug:
 *   tags:
 *     - Auth SPID
 */

const jwt = require('jsonwebtoken');

module.exports = {
  friendlyName: 'SpidDebug',

  description: 'Endpoint di debug per il flow SPID/CIE: riceve asp_token in querystring e mostra il payload decodificato. Da rimuovere o restringere in produzione.',

  inputs: {
    asp_token: {type: 'string', required: false},
    expireDate: {type: 'string', required: false},
    error: {type: 'string', required: false},
    error_description: {type: 'string', required: false}
  },

  exits: {},

  fn: async function (inputs) {
    const res = this.res;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (inputs.error) {
      return res.send(`<!DOCTYPE html><html><head><title>SPID debug — errore</title></head><body>
<h1>Errore login SPID/CIE</h1>
<p><strong>error</strong>: <code>${escapeHtml(inputs.error)}</code></p>
${inputs.error_description ? `<p><strong>error_description</strong>: ${escapeHtml(inputs.error_description)}</p>` : ''}
</body></html>`);
    }

    if (!inputs.asp_token) {
      return res.send('<h1>SPID debug</h1><p>Nessun asp_token ricevuto.</p>');
    }

    let payload;
    try {
      payload = jwt.verify(inputs.asp_token, sails.config.custom.jwtSecret);
    } catch (err) {
      return res.status(400).send(`<h1>Token non valido</h1><pre>${escapeHtml(err.message)}</pre>`);
    }

    return res.send(`<!DOCTYPE html><html><head><title>SPID debug — OK</title>
<style>body{font-family:Arial,sans-serif;padding:24px;}pre{background:#f1f5f9;padding:16px;border-radius:8px;overflow-x:auto;}</style>
</head><body>
<h1>Login SPID/CIE riuscito</h1>
<p><strong>expireDate</strong>: ${escapeHtml(inputs.expireDate || '')}</p>
<h2>Payload JWT decodificato</h2>
<pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
<h2>Token (Bearer)</h2>
<pre style="word-break:break-all;white-space:pre-wrap;">${escapeHtml(inputs.asp_token)}</pre>
</body></html>`);
  }
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'
  })[c]);
}
