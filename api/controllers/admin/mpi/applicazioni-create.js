module.exports = {
  friendlyName: 'Create MPI applicazione',
  description: 'Registra una nuova applicazione MPI. Crea automaticamente gli scope read/write.',
  swagger: false,
  inputs: {
    codice: {
      type: 'string',
      required: true,
      maxLength: 50,
      description: 'Codice univoco applicazione (es. PS_PAPARDO)'
    },
    nome: {
      type: 'string',
      required: true,
      maxLength: 255,
      description: 'Nome leggibile dell\'applicazione'
    },
    descrizione: {
      type: 'string',
      allowNull: true,
      description: 'Descrizione dell\'applicazione'
    },
    versione: {
      type: 'string',
      allowNull: true,
      maxLength: 20,
      description: 'Versione dell\'applicazione'
    },
    contatto: {
      type: 'string',
      allowNull: true,
      maxLength: 255,
      description: 'Contatto di riferimento'
    }
  },
  fn: async function (inputs, exits) {
    try {
      const codice = inputs.codice.toUpperCase();
      const codiceLower = codice.toLowerCase();

      const existing = await Anagrafica_MpiApplicazioni.findOne({codice});
      if (existing) {
        return this.res.ApiResponse({
          errType: 'ALREADY_EXISTS',
          errMsg: 'Un\'applicazione con questo codice esiste già'
        });
      }

      // Auto-crea scopi read/write per questa app
      const scopoRead = `mpi-${codiceLower}-read`;
      const scopoWrite = `mpi-${codiceLower}-write`;

      for (const scopoName of [scopoRead, scopoWrite]) {
        const existingScope = await Auth_Scopi.findOne({scopo: scopoName});
        if (!existingScope) {
          await Auth_Scopi.create({scopo: scopoName, attivo: true});
        }
      }

      const app = await Anagrafica_MpiApplicazioni.create({
        codice,
        nome: inputs.nome,
        descrizione: inputs.descrizione || null,
        versione: inputs.versione || null,
        contatto: inputs.contatto || null,
      }).fetch();

      await sails.helpers.log.with({
        level: 'info',
        tag: 'MPI_ADMIN',
        message: `Applicazione MPI creata: ${codice}`,
        action: 'MPI_APP_CREATED',
        ipAddress: this.req.ip,
        user: this.req.user || 'null',
        context: {appId: app.id, codice, scopoRead, scopoWrite}
      });

      return this.res.ApiResponse({data: app});
    } catch (error) {
      sails.log.error('Error creating MPI applicazione:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante la creazione dell\'applicazione MPI'
      });
    }
  }
};
