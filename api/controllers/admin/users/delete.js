/**
 * Admin users delete controller
 */

module.exports = {
  friendlyName: 'Delete user',
  description: 'Delete a user and all their permissions.',
  swagger: false,
  inputs: {
    id: {
      type: 'number',
      required: true,
      description: 'User ID to delete'
    }


  },
  fn: async function (inputs, exits) {
    try {
      // Find existing user
      const existingUser = await Auth_Utenti.findOne({ id: inputs.id });
      if (!existingUser) {
        return this.res.ApiResponse({
          errType: 'NOT_FOUND',
          errMsg: 'Utente non trovato'
        });
      }

      // Prevent deletion of self
      if (this.req.token && this.req.token.username === existingUser.username) {
        return this.res.ApiResponse({
          errType: 'VALIDATION_ERROR',
          errMsg: 'Non puoi eliminare il tuo stesso account'
        });
      }

      // Delete user scope associations first
      await Auth_UtentiScopi.destroy({ utente: inputs.id });

      // Delete the user
      await Auth_Utenti.destroyOne({ id: inputs.id });

      await sails.helpers.log.with({
        level: 'warn',
        tag: 'ADMIN',
        azione: 'USER_DELETED',
        ip: this.req.ip,
        utente: this.req.token ? this.req.token.username : null,
        req: this.req,
        context: { deletedUserId: inputs.id, deletedUsername: existingUser.username }
      });

      return this.res.ApiResponse({
        data: {
          message: 'Utente eliminato con successo',
          deletedUser: {
            id: existingUser.id,
            username: existingUser.username
          }
        }
      });

    } catch (error) {
      sails.log.error('Error deleting user:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante l\'eliminazione dell\'utente'
      });
    }
  }
};
