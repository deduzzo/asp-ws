/* eslint-disable camelcase */
/**
 * Auth_spidConsumers.js
 *
 * Whitelist dinamica delle redirect_uri ammesse per il flow SPID/CIE server-side.
 * Gestita da pannello admin (sostituisce il file private_spid_login.json per
 * questa parte). Una riga per ogni app/consumer che integra il login SPID.
 */

module.exports = {
  datastore: 'auth',
  tableName: 'spid_consumers',
  attributes: {
    nome: {type: 'string', columnType: 'varchar(100)', required: true},
    redirect_uri: {type: 'string', columnType: 'varchar(500)', required: true, unique: true},
    ambito: {model: 'auth_ambiti', allowNull: true},
    attivo: {type: 'boolean', defaultsTo: true},
    note: {type: 'string', columnType: 'varchar(500)', allowNull: true},
  },
};
