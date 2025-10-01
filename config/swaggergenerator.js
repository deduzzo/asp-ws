module.exports['swagger-generator'] = {
  disabled: false,
  swaggerJsonPath: './swagger/swagger.json',
  swagger: {
    openapi: '3.0.0',
    info: {
      title: 'ASP-ws Doc',
      description: 'Documentazione delle API del progetto ASP-WS v.1\n\n Numero assistiti: <b>{{TOTAL_ASSISTITI}}</b>\n\nUltimo record aggiornato il: <b>{{LAST_UPDATE}}</b>\n\n Percentuale di geolocalizzazione: <b>{{GEO_PERC}}</b>\n',
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
    includeRoute: function(routeInfo) {
      console.log('Route path:', routeInfo.path);
      console.log('Route info:', routeInfo);

      if (routeInfo.path && routeInfo.path.includes('/admin')) {
        return false;
      }

      return true;
    },
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
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: {type: 'boolean', example: true},
                err: {type: 'null', example: null},
                data: {type: 'object', example: {chiave: 'valore', chiave2: 'valore2'}}
              }
            }
          }
        }
      },
      '400': {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: {type: 'boolean', example: false},
                err: {
                  type: 'object',
                  properties: {
                    code: {type: 'string', example: 'BAD_REQUEST'},
                    msg: {type: 'string', example: 'Messaggio di errore'}
                  }
                },
                data: {type: 'null', example: null}
              }
            }
          }
        }
      },
      '401': {
        description: 'Non autorizzato',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: {type: 'boolean', example: false},
                err: {
                  type: 'object',
                  properties: {
                    code: {type: 'string', example: 'NON_AUTORIZZATO | TOKEN_SCADUTO | TOKEN_NON_VALIDO'},
                    msg: {type: 'string', example: 'Messaggio di errore'}
                  }
                },
                data: {type: 'null', example: null}
              }
            }
          }
        }
      },
      '404': {
        description: 'Non trovato',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: {type: 'boolean', example: false},
                err: {
                  type: 'object',
                  properties: {
                    code: {type: 'string', example: 'NOT_FOUND'},
                    msg: {type: 'string', example: 'Messaggio di errore'}
                  }
                },
                data: {type: 'null', example: null}
              }
            }
          }
        }
      },
      '409': {
        description: 'Dato in conflitto con un dato già presente',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: {type: 'boolean', example: false},
                err: {
                  type: 'object',
                  properties: {
                    code: {type: 'string', example: 'ALREADY_EXISTS'},
                    msg: {type: 'string', example: 'Messaggio di errore'}
                  }
                },
                data: {type: 'null', example: null}
              }
            }
          }
        }
      },
      '500': {
        description: 'Errore del server',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: {type: 'boolean', example: false},
                err: {
                  type: 'object',
                  properties: {
                    code: {type: 'string', example: 'ERRORE_DEL_SERVER || ERRORE_GENERICO'},
                    msg: {type: 'string', example: 'Messaggio di errore'}
                  }
                },
                data: {type: 'null', example: null}
              }
            }
          }
        }
      },
      '300': {
        description: 'Richieste multiple',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: {type: 'boolean', example: false},
                err: {
                  type: 'object',
                  properties: {
                    code: {type: 'string', example: 'MULTIPLE_RESULTS'},
                    responses: [
                      {type: 'array', example: 'Array di response'},
                    ]
                  }
                },
                data: {type: 'null', example: null}
              }
            }
          }
        }
      },
      '503': {
        description: 'Servizio momentaneamente non disponibile',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: {type: 'boolean', example: false},
                err: {
                  type: 'object',
                  properties: {
                    code: {type: 'string', example: 'SERVIZIO_NON_DISPONIBILE'},
                    msg: {type: 'string', example: 'Messaggio di errore'}
                  }
                },
                data: {type: 'null', example: null}
              }
            }
          }
        }
      },
      '504': {
        description: 'Timeout',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: {type: 'boolean', example: false},
                err: {
                  type: 'object',
                  properties: {
                    code: {type: 'string', example: 'TIMEOUT'},
                    msg: {type: 'string', example: 'Messaggio di errore'}
                  }
                },
                data: {type: 'null', example: null}
              }
            }
          }
        }
      }
    }
  },
  excludeDeprecatedPutBlueprintRoutes: true,
};
