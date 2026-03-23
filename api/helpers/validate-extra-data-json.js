module.exports = {
  friendlyName: 'Validate extra data JSON',

  description: 'Valida un valore JSON rispetto a uno schema di definizione campi. ' +
    'Verifica tipo, obbligatorietà e valori ammessi per ciascun campo dello schema.',

  sync: true,

  inputs: {
    value: {
      type: 'ref',
      required: true,
      description: 'Valore da validare (stringa JSON o array)'
    },
    schema: {
      type: 'ref',
      required: true,
      description: 'Array di definizioni campo: {chiave, tipo, obbligatorio, etichetta, valori}'
    }
  },

  fn: function (inputs, exits) {
    const { value, schema } = inputs;

    let arr = value;

    // Parse se stringa
    if (typeof arr === 'string') {
      try {
        arr = JSON.parse(arr);
      } catch (e) {
        return exits.success({ valid: false, errors: ['Il valore non è un JSON valido'] });
      }
    }

    // Deve essere un array
    if (!Array.isArray(arr)) {
      return exits.success({ valid: false, errors: ['Il valore deve essere un array'] });
    }

    const errors = [];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    arr.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Elemento [${index}]: deve essere un oggetto`);
        return;
      }

      for (const campo of schema) {
        const val = item[campo.chiave];

        // Controllo obbligatorietà
        if (campo.obbligatorio && (val === undefined || val === null || val === '')) {
          errors.push(`Elemento [${index}]: il campo '${campo.chiave}' (${campo.etichetta}) è obbligatorio`);
          continue;
        }

        // Se il valore non è presente, skip validazione tipo
        if (val === undefined || val === null || val === '') {
          continue;
        }

        // Controllo tipo
        switch (campo.tipo) {
          case 'enum':
            if (Array.isArray(campo.valori) && !campo.valori.includes(val)) {
              errors.push(`Elemento [${index}]: il campo '${campo.chiave}' (${campo.etichetta}) deve essere uno tra: ${campo.valori.join(', ')}`);
            }
            break;

          case 'number':
            if (typeof val !== 'number' && isNaN(Number(val))) {
              errors.push(`Elemento [${index}]: il campo '${campo.chiave}' (${campo.etichetta}) deve essere un valore numerico`);
            }
            break;

          case 'date':
            if (!dateRegex.test(val)) {
              errors.push(`Elemento [${index}]: il campo '${campo.chiave}' (${campo.etichetta}) deve essere una data in formato YYYY-MM-DD`);
            }
            break;

          // 'string' - nessuna validazione aggiuntiva
        }
      }
    });

    if (errors.length > 0) {
      return exits.success({ valid: false, errors });
    }

    return exits.success({ valid: true });
  }
};
