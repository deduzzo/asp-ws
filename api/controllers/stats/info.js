/**
 * @swagger
 *
 * /info:
 *     tags:
 *       - Info
 * tags:
 *   - name: Statistiche
 *     description: Statistiche e informazioni generali
 */
const moment = require('moment');
module.exports = {
  friendlyName: 'Statistiche Anagrafica',
  description: 'Ottieni le statistiche di Anagrafica',
  exits: {},

  fn: async function (inputs) {
    const res = this.res;
    const total_assistiti = await Anagrafica_Assistiti.count();
    const lastAssitito = await Anagrafica_Assistiti.find({
      sort: 'updatedAt DESC',
      limit: 1
    });
    const geoCount = await Anagrafica_Assistiti.count({
      lat: {'!=': null},
    });
    return res.ApiResponse({
      data: {
        totAssistiti: total_assistiti.toLocaleString('it-IT'),
        lastUpdate: moment(lastAssitito[0].updatedAt).format('DD/MM/YYYY HH:mm:ss'),
        geoPerc: ((geoCount / total_assistiti) * 100).toFixed(2) + '%'
      }
    });
  }
};
