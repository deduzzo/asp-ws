module.exports = {


  friendlyName: 'Domain login',


  description: 'Heper per l\'autenticazione del dominio.',


  inputs: {
    username: {
      type: 'string',
      required: true,
      description: 'Username',
    },
    password: {
      type: 'string',
      required: true,
      description: 'Password del dominio.',
    },
    domain: {
      type: 'string',
      required: true,
      description: 'Dominio',
    }
  },


  exits: {
    success: {
      description: 'All done.',
    },
    forbidden: {
      description: 'Accesso negato.',
    }
  },


  fn: async function (inputs) {
    switch (inputs.domain) {
      case 'asp.messina.it': {
        // url: http://192.168.250.78/flussi/site/login-internal?username={{ this.params.username}}&password={{ this.params.password}}
        const url = `http://192.168.250.78/flussi/site/login-internal?username=${inputs.username}&password=${inputs.password}`;
        const response = await sails.helpers.http.get(url);
        if (response) {
          if (response.success) {
            return true;
          } else {return false;}
        }
        else
          return false;
      }
      break;
    }
    return false;
  }


};

