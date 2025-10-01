/**
 * Admin levels list controller
 */

module.exports = {
  friendlyName: 'List levels',
  description: 'List all available access levels.',
  swagger: false,
  inputs: {},

  exits: {
    success: {
      statusCode: 200
    }
  },

  fn: async function (inputs, exits) {
    try {
      const levels = await Auth_Livelli.find({
        sort: 'livello ASC'
      });

      // Get user count for each level
      const levelsWithUserCount = await Promise.all(levels.map(async (level) => {
        const userCount = await Auth_Utenti.count({ livello: level.id });
        return {
          id: level.id,
          livello: level.livello,
          descrizione: level.descrizione,
          isSuperAdmin: level.isSuperAdmin,
          userCount: userCount,
          createdAt: level.createdAt,
          updatedAt: level.updatedAt
        };
      }));

      return this.res.ApiResponse({
        data: {
          levels: levelsWithUserCount
        }
      });

    } catch (error) {
      sails.log.error('Error listing levels:', error);
      return this.res.ApiResponse({
        errType: 'INTERNAL_ERROR',
        errMsg: 'Errore durante il recupero dei livelli'
      });
    }
  }
};
