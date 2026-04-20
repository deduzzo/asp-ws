module.exports = {


  friendlyName: 'Submit form',


  description: 'Invia una submission del form dinamico con antiflood e reCAPTCHA',


  inputs: {
    formValues: {
      type: 'ref',
      required: true,
      description: 'Valori dei campi del form'
    },
    recaptchaToken: {
      type: 'string',
      description: 'Token reCAPTCHA v3'
    }
  },


  exits: {
    success: {
      description: 'Submission salvata con successo'
    },
    badRequest: {
      description: 'Dati mancanti o invalidi',
      responseType: 'badRequest'
    },
    rateLimitExceeded: {
      description: 'Rate limit superato',
      responseType: 'tooManyRequests'
    },
    recaptchaFailed: {
      description: 'Verifica reCAPTCHA fallita',
      responseType: 'forbidden'
    }
  },


  fn: async function (inputs, exits) {
    const formId = this.req.param('id');

    if (!formId) {
      return exits.badRequest({ error: 'formId is required' });
    }

    if (!inputs.formValues) {
      return exits.badRequest({ error: 'formValues is required' });
    }

    // Ottieni IP e User Agent del client
    const ipAddress = this.req.ip || this.req.connection.remoteAddress;
    const userAgent = this.req.get('User-Agent');

    try {
      // === 1. VERIFICA RATE LIMIT E RECAPTCHA ===
      const rateLimitCheck = await sails.helpers.checkSubmissionRateLimit.with({
        ipAddress: ipAddress,
        formId: formId,
        recaptchaToken: inputs.recaptchaToken
      }).intercept('rateLimitExceeded', 'rateLimitExceeded')
        .intercept('recaptchaFailed', 'recaptchaFailed');

      sails.log.info('Rate limit check passed:', {
        ip: ipAddress,
        formId: formId,
        recaptchaScore: rateLimitCheck.recaptchaScore,
        remainingSubmissions: rateLimitCheck.remainingSubmissions
      });

      // === 2. VALIDA I DATI DEL FORM ===
      // Carica la definizione del form per validazione
      const fs = require('fs');
      const path = require('path');
      const formPath = path.join(__dirname, '../../../api/data/forms/template', `${formId}.json`);

      if (!fs.existsSync(formPath)) {
        return exits.badRequest({ error: 'Form not found' });
      }

      const formDefinition = JSON.parse(fs.readFileSync(formPath, 'utf8'));

      // Valida i campi required
      const validationErrors = validateFormData(inputs.formValues, formDefinition);
      if (validationErrors.length > 0) {
        return exits.badRequest({
          error: 'Validation failed',
          errors: validationErrors
        });
      }

      // === 3. SALVA NEL DATABASE ===
      const submissionData = {
        formValues: inputs.formValues,
        metadata: {
          ipAddress: ipAddress,
          userAgent: userAgent,
          recaptchaScore: rateLimitCheck.recaptchaScore
        }
      };

      const result = await sails.helpers.formDb.with({
        formId: formId,
        action: 'insert',
        data: submissionData
      });

      // === 4. LOG L'EVENTO ===
      await sails.helpers.log.with({
        level: 'info',
        tag: 'FORM_SUBMISSION',
        message: `Form ${formId} submitted`,
        action: `submit_form_${formId}`,
        ipAddress: ipAddress,
        context: {
          submissionId: result.id,
          formId: formId,
          recaptchaScore: rateLimitCheck.recaptchaScore
        }
      });

      // === 5. INVIA EMAIL DI NOTIFICA (opzionale) ===
      if (formDefinition.notifications && formDefinition.notifications.email) {
        try {
          await sendNotificationEmail(formDefinition, inputs.formValues, result.id);
        } catch (emailErr) {
          sails.log.error('Error sending notification email:', emailErr);
          // Non blocchiamo il submit se l'email fallisce
        }
      }

      // === 6. INVIA EMAIL DI CONFERMA ALL'UTENTE (se abilitato) ===
      if (formDefinition.notifications && formDefinition.notifications.sendEmailConfirmation) {
        // Cerca automaticamente il primo campo email nel form
        let userEmail = null;

        if (formDefinition.pages) {
          formDefinition.pages.forEach(page => {
            if (!userEmail) {  // Trova solo il primo campo email
              page.fields.forEach(field => {
                if (!userEmail && field.validation && field.validation.type === 'email') {
                  userEmail = inputs.formValues[field.id];
                }
              });
            }
          });
        }

        // Invia email se trovato un indirizzo email valido
        if (userEmail) {
          try {
            await sendUserConfirmationEmail(formDefinition, userEmail, result.id);
            sails.log.info(`Confirmation email sent to: ${userEmail}`);
          } catch (emailErr) {
            sails.log.error('Error sending user confirmation email:', emailErr);
            // Non blocchiamo il submit se l'email fallisce
          }
        } else {
          sails.log.warn(`Email confirmation enabled for form ${formId} but no email field found`);
        }
      }

      return exits.success({
        success: true,
        message: formDefinition.messages?.success || 'Grazie! Il modulo è stato inviato con successo.',
        submissionId: result.id,
        createdAt: result.createdAt
      });

    } catch (err) {
      sails.log.error('Error submitting form:', err);

      // Log errore
      await sails.helpers.log.with({
        level: 'error',
        tag: 'FORM_SUBMISSION_ERROR',
        message: `Form ${formId} submission failed`,
        action: `submit_form_${formId}_error`,
        ipAddress: ipAddress,
        context: {
          error: err.message,
          formId: formId
        }
      });

      return exits.badRequest({
        error: 'Submission failed',
        message: 'Si è verificato un errore durante l\'invio. Riprova.'
      });
    }

    // ========== HELPER FUNCTIONS ==========

    function validateFormData(formValues, formDefinition) {
      const errors = [];

      if (!formDefinition.pages) {
        return errors;
      }

      formDefinition.pages.forEach(page => {
        page.fields.forEach(field => {
          const value = formValues[field.id];

          // Check if field is conditional and if condition is met
          const isConditional = field.conditionalOn;
          const conditionMet = isConditional ?
            (formValues[field.conditionalOn] && formValues[field.conditionalOn].includes('si')) :
            true;

          // Skip validation if field is conditional and condition not met
          if (isConditional && !conditionMet) {
            return;
          }

          // For conditional fields, make them required when condition is met
          const isRequired = field.required || (isConditional && conditionMet);

          // Verifica campi required
          if (isRequired) {
            if (Array.isArray(value)) {
              if (value.length === 0) {
                errors.push({
                  field: field.id,
                  message: `${field.label} è obbligatorio`
                });
              }
            } else if (!value || (typeof value === 'string' && value.trim() === '')) {
              errors.push({
                field: field.id,
                message: `${field.label} è obbligatorio`
              });
            }
          }

          // Verifica validazione avanzata
          if (value && field.validation) {
            const validation = field.validation;

            // Length validation
            if (typeof value === 'string') {
              if (validation.minLength && value.length < validation.minLength) {
                errors.push({
                  field: field.id,
                  message: `${field.label} deve avere almeno ${validation.minLength} caratteri`
                });
              }
              if (validation.maxLength && value.length > validation.maxLength) {
                errors.push({
                  field: field.id,
                  message: `${field.label} deve avere massimo ${validation.maxLength} caratteri`
                });
              }
            }

            // Email validation
            if (validation.type === 'email') {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(value)) {
                errors.push({
                  field: field.id,
                  message: `${field.label} non è un'email valida`
                });
              }
            }

            // Phone validation
            if (validation.type === 'phone') {
              const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
              if (!phoneRegex.test(value.replace(/\s/g, ''))) {
                errors.push({
                  field: field.id,
                  message: `${field.label} non è un numero di telefono valido`
                });
              }
            }

            // URL validation
            if (validation.type === 'url') {
              try {
                new URL(value);
              } catch (e) {
                errors.push({
                  field: field.id,
                  message: `${field.label} non è un URL valido`
                });
              }
            }

            // Number validation
            if (validation.type === 'number') {
              const num = parseFloat(value);
              if (isNaN(num)) {
                errors.push({
                  field: field.id,
                  message: `${field.label} deve essere un numero`
                });
              } else {
                if (validation.min !== undefined && num < validation.min) {
                  errors.push({
                    field: field.id,
                    message: `${field.label} deve essere almeno ${validation.min}`
                  });
                }
                if (validation.max !== undefined && num > validation.max) {
                  errors.push({
                    field: field.id,
                    message: `${field.label} deve essere massimo ${validation.max}`
                  });
                }
              }
            }

            // Whitelist validation (allowedValues)
            if (validation.allowedValues && Array.isArray(validation.allowedValues)) {
              const normalizedValue = typeof value === 'string' ? value.trim().toUpperCase() : value;
              const normalizedAllowedValues = validation.allowedValues.map(v =>
                typeof v === 'string' ? v.trim().toUpperCase() : v
              );

              if (!normalizedAllowedValues.includes(normalizedValue)) {
                errors.push({
                  field: field.id,
                  message: `${field.label} non è valido o non autorizzato`
                });
              }
            }
          }
        });
      });

      return errors;
    }

    async function sendNotificationEmail(formDefinition, formValues, submissionId) {
      // Prepara il corpo dell'email
      let emailBody = `<h2>Nuova submission per: ${formDefinition.title}</h2>`;
      emailBody += `<p><strong>ID Submission:</strong> ${submissionId}</p>`;
      emailBody += `<p><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>`;
      emailBody += '<hr>';

      // Aggiungi i valori dei campi
      if (formDefinition.pages) {
        formDefinition.pages.forEach(page => {
          page.fields.forEach(field => {
            let value = formValues[field.id];

            // Formatta array
            if (Array.isArray(value)) {
              if (field.options) {
                value = value.map(v => {
                  const opt = field.options.find(o => o.value === v);
                  return opt ? opt.label : v;
                }).join(', ');
              } else {
                value = value.join(', ');
              }
            }

            // Formatta select
            if (value && field.type === 'select' && field.options) {
              const opt = field.options.find(o => o.value === value);
              if (opt) {
                value = opt.label;
              }
            }

            emailBody += `<p><strong>${field.label}:</strong> ${value || '<em>non specificato</em>'}</p>`;
          });
        });
      }

      // Invia email
      await sails.helpers.mail.with({
        to: formDefinition.notifications.email,
        subject: `Nuova submission: ${formDefinition.title}`,
        html: emailBody
      });
    }

    async function sendUserConfirmationEmail(formDefinition, userEmail, submissionId) {
      const MailService = require('../../services/MailService');

      // Prepara email di conferma per l'utente
      let emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0ea5e9;">Conferma Ricezione Richiesta</h2>
          <p>Gentile utente,</p>
          <p>Abbiamo ricevuto correttamente la tua richiesta: <strong>${formDefinition.title}</strong></p>
          <p><strong>Numero di riferimento:</strong> ${submissionId}</p>
          <p><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p>Ti risponderemo al più presto all'indirizzo email fornito.</p>
          <p style="color: #6b7280; font-size: 0.875rem;">
            Questo è un messaggio automatico, ti preghiamo di non rispondere a questa email.
          </p>
          <p style="color: #6b7280; font-size: 0.875rem;">
            <strong>ASP di Messina</strong><br>
            Servizi Sanitari Territoriali
          </p>
        </div>
      `;

      await MailService.sendMail(
        userEmail,
        `Conferma ricezione: ${formDefinition.title}`,
        emailBody
      );
    }
  }


};
