/**
 * @swagger
 *
 * /get-medici-disponibili-assistito:
 *   tags:
 *     - Cambio Medico
 */
const MediciService = require('../../services/MediciService');
const {Nar2} = require('aziendasanitaria-utils/src/narTsServices/Nar2');

module.exports = {


  friendlyName: 'Get medici disponibili assistito',


  description: 'Ottiene la lista dei medici disponibili per un assistito specifico.',


  inputs: {
    cfAssistito: {
      type: 'string',
      required: true,
      description: 'Codice fiscale dell\'assistito'
    },
    tipoMedico: {
      type: 'string',
      required: true,
      isIn: ['P', 'M'],
      description: 'Tipo di medico: "M" per medico di base, "P" per pediatra'
    }
  },


  exits: {

  },


  fn: async function (inputs) {
    try {

      const ambiti = await MediciService.getAmbitiDomicilioAssistito(inputs.cfAssistito);

      if (ambiti.ok) {
        let ambitiSelezionabili = inputs.tipoMedico === 'M' ? ambiti.data.ambiti.mmg : ambiti.data.ambiti.pediatri;
        // crea un array associativo chiave valore di ambiti, chiave sr_id valore sr_desc
        let ambitiMap = ambitiSelezionabili.reduce((map, ambito) => {
          map[ambito.sr_id] = ambito.sr_desc;
          return map;
        }, {});
        let medici = [];
        for (let ambito of ambitiSelezionabili) {
          let mediciAmbito = await MediciService.getMediciPerAssistito(inputs.cfAssistito,ambito.sr_id, inputs.tipoMedico === 'M' ? Nar2.MEDICO_DI_BASE : Nar2.PEDIATRA);
          if (mediciAmbito.ok && mediciAmbito.data && mediciAmbito.data.liberi.length > 0) {
            for (let medico of mediciAmbito.data.liberi) {
              // remove from each array: rapporto_individuale_attivo
              delete medico.rapporto_individuale_attivo;
              medici.push(medico);
            }
          }
        }
        return this.res.ApiResponse({data: {medici,ambiti: ambitiMap, distretto: ambiti.data.distretto.sr_desc }});
      } else {
        return this.res.ApiResponse({errType: ambiti.errType, errMsg: ambiti.errMsg});
      }
    } catch (err) {
      return this.res.ApiResponse({
        errType: 'exception',
        errMsg: err.message
      });
    }
  }
};
