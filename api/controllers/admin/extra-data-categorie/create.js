module.exports = {
  friendlyName: 'Create extra data categoria',
  description: 'Crea una nuova categoria di dati extra. Crea automaticamente gli scope di lettura e scrittura.',
  swagger: false,
  inputs: {
    codice: {
      type: 'string',
      required: true,
      maxLength: 50,
      description: 'Codice univoco della categoria (es. CONTATTI)'
    },
    descrizione: {
      type: 'string',
      allowNull: true,
      defaultsTo: '',
      maxLength: 255,
      description: 'Descrizione leggibile'
    },
    campi: {
      type: 'json',
      required: true,
      description: 'Definizione campi: [{chiave, tipo, obbligatorio, etichetta}]'
    },
    attivo: {
      type: 'boolean',
      defaultsTo: true
    }
  },
  fn: async function (inputs, exits) {
    try {
      const codice = inputs.codice.toUpperCase();
      const codiceLower = codice.toLowerCase();

      // Verifica che non esista già
      const existing = await Anagrafica_ExtraDataCategorie.findOne({ codice });
      if (existing) {
        return this.res.ApiResponse({
          errType: 'CATEGORY_EXISTS',
          errMsg: 'Una categoria con questo codice esiste già'
        });
      }

      // Genera scope names (codice lowercase, senza prefissi)
      const scopoLettura = `${codiceLower}-read`;
      const scopoScrittura = `${codiceLower}-write`;

      // Crea gli scope in Auth_Scopi (se non esistono già)
      for (const scopoName of [scopoLettura, scopoScrittura]) {
        const existingScope = await Auth_Scopi.findOne({ scopo: scopoName });
        if (!existingScope) {
          await Auth_Scopi.create({ scopo: scopoName, attivo: true });
        }
      }

      // Crea la categoria
      const categoria = await Anagrafica_ExtraDataCategorie.create({
        codice,
        descrizione: inputs.descrizione || null,
        scopoLettura,
        scopoScrittura,
        campi: inputs.campi,
        attivo: inputs.attivo
      }).fetch();

      await sails.helpers.log.with({
        level: 'info',
        tag: 'ADMIN',
        message: `Extra data categoria creata: ${codice}`,
        action: 'EXTRA_DATA_CATEGORIA_CREATED',
        ipAddress: this.req.ip,
        user: this.req.user || 'null',
        context: { categoriaId: categoria.id, codice, scopoLettura, scopoScrittura }
      });

      return this.res.ApiResponse({
        data: categoria
      });
    } catch (error) {
      sails.log.error('Error creating extra data categoria:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante la creazione della categoria'
      });
    }
  }
};
