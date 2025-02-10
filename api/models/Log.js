// api/models/Log.js
module.exports = {
  datastore: 'log',
  attributes: {
    level: {
      type: 'string',
      required: true,
      isIn: ['info', 'warn', 'error', 'debug']
    },
    message: {
      type: 'string',
      required: true
    },
    action: {
      type: 'string'
    },
    user: {
      type: 'string',
      allowNull: true
    },
    context: {
      type: 'json',
    },
    ipAddress: {
      type: 'string',
      allowNull: true
    },
    timestamp: {
      type: 'number',
      autoCreatedAt: true
    }
  }
};
