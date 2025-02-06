module.exports['swagger-generator'] = {
  disabled: false,
  swaggerJsonPath: './swagger/swagger.json',
  swagger: {
    openapi: '3.0.0',
    info: {
      title: 'ASP-ws Doc',
      description: 'Documentazione delle API del progetto ASP-WS v.1\n\n Numero totale assistiti: <b>{{TOTAL_ASSISTITI}}</b>\n\nUltimo aggiornamento: <b>{{LAST_UPDATE}}</b>\n',
      termsOfService: 'http://example.com/terms',
      contact: {
        name: 'Roberto De Domenico',
        url: 'http://github.com/deduzzo',
        email: 'deduzzo@gmail.com'
      },
      license: {
        name: 'Apache 2.0',
        url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
      },
      version: '1.0.0'
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:1337'
      }
    ],
    // -- Aggiungi la sezione 'components' con i securitySchemes
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
      }
    },
    // -- Definisci la security a livello globale
    security: [
      {
        bearerAuth: []
      }
    ],
    externalDocs: {
      url: 'https://www.asp.messina.it'
    }
  },
  defaults: {
    responses: {
      '200': {
        description: 'The requested resource'
      },
      '404': {
        description: 'Resource not found'
      },
      '500': {
        description: 'Internal server error'
      }
    }
  },
  excludeDeprecatedPutBlueprintRoutes: true,
};
