module.exports = {
  friendlyName: 'List MPI applicazioni',
  description: 'Lista tutte le applicazioni MPI registrate.',
  swagger: false,
  inputs: {},
  fn: async function (inputs, exits) {
    try {
      const apps = await Anagrafica_MpiApplicazioni.find().sort('codice ASC');
      return this.res.ApiResponse({data: apps});
    } catch (error) {
      sails.log.error('Error listing MPI applicazioni:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante il recupero delle applicazioni MPI'
      });
    }
  }
};
