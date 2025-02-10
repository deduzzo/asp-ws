// api/helpers/log.js
const {TAGS} = require('../models/Log');
module.exports = {
  friendlyName: 'Log to database',

  inputs: {
    level: {
      type: 'string',
      description: 'Livello di log',
      required: true,
      isIn: ['info', 'warn', 'error', 'debug']
    },
    tag: {
      type: 'string',
      description: 'Tag associato al log',
      isIn: [...Object.keys(TAGS)]
    },
    message: {
      type: 'string',
      description: 'Messaggio di log',
      required: true
    },
    action: {
      type: 'string',
      description: 'Azione associata al log',
    },
    user: {
      type: 'string',
      description: 'Utente associato al log',
    },
    context: {
      type: 'json',
      description: 'Metadati aggiuntivi',
    },
    ipAddress: {
      type: 'string',
      description: 'Indirizzo IP associato al log',
    },
  },

  async fn(inputs, exits) {
    try {
      // Crea il log nel database
      const logEntry = await Log.create({...inputs}).fetch();

      return exits.success(logEntry);
    } catch (error) {
      // Log dell'errore di logging (meta-logging!)
      sails.log.error('Errore durante la registrazione del log:', error);
      return exits.error(error);
    }
  }
};
