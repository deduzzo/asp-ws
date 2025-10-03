/**
 * Auth_utenti.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'auth',
  tableName: 'utenti',
  attributes: {
    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝
    username: {type: 'string', columnType: 'varchar(100)', allowNull: false},
    allow_domain_login: {type: 'boolean', defaultsTo: false},
    domain: {type: 'string', columnType: 'varchar(100)', allowNull: true},
    mail: {type: 'string', columnType: 'varchar(200)', allowNull: true},
    ambito: {model: 'auth_ambiti', allowNull: false},
    hash_password: {type: 'string', columnType: 'varchar(100)', allowNull: true},
    livello: {model: 'auth_livelli', allowNull: false},
    attivo: {type: 'boolean', defaultsTo: false},
    data_disattivazione: {allowNull: true, type:'number'},
    refresh_token: {type: 'string', columnType: 'varchar(2048)', allowNull: true},
    token_revocato: {type: 'boolean', defaultsTo: false},
    otp_enabled: {type: 'boolean', defaultsTo: false},
    otp_key: {type: 'string', columnType: 'varchar(200)', allowNull: true},
    otp: {type: 'string', columnType: 'varchar(100)', allowNull: true},
    otp_exp: {type: 'number', allowNull: true},
    otp_type: {type: 'string', columnType: 'varchar(10)', allowNull: true},
    scopi: {
      collection: 'auth_scopi',
      via : 'utente',
      through: 'auth_utentiScopi'
    },

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝


    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

  },

};

