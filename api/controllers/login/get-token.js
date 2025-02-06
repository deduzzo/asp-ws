/**
 * @swagger
 *
 * /get-token:
 *   tags:
 *     - Auth
 */




module.exports = {

  friendlyName: 'GetToken',


  description: 'Genera un token JWT per l\'utente specificato con scopo e ambito specificati. L\'utente deve essere abilitato ed avere il permesso sullo scopo e lo stesso ambito d\'utenza',


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
      description: 'Scopo del token, almeno uno obbligatorio, separati da spazi.'
    },
    ambito: {
      type: 'string',
      required: false,
      description: 'Ambito d\'utenza del token. In caso di campo vuoto il valore di default e "generale"'
    },
  },


  exits: {
    success: {
      statusCode: 200,
      description: 'Token generato con successo.'
    },
    error: {
      statusCode: 400,
      responseType: 'badRequest',
      description: 'Errore generico o dati non validi'
    },
    unauthorized: {
      statusCode: 401,
      responseType: 'unauthorized',
      description: 'L\'utente non è autorizzato a generare il token.'
    }
  },


  fn: async function (inputs, exits) {
    let fakeToken = 'fakeToken';
    return exits.success({token: fakeToken});

  }


};
