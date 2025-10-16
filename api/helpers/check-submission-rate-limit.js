module.exports = {


  friendlyName: 'Check submission rate limit',


  description: 'Verifica rate limiting e reCAPTCHA per prevenire spam e flood',


  inputs: {
    ipAddress: {
      type: 'string',
      required: true,
      description: 'IP address del client'
    },
    formId: {
      type: 'string',
      required: true,
      description: 'ID del form'
    },
    recaptchaToken: {
      type: 'string',
      description: 'Token reCAPTCHA v3'
    }
  },


  exits: {
    success: {
      description: 'Verifica superata',
      outputType: 'ref'
    },
    rateLimitExceeded: {
      description: 'Troppi tentativi, rate limit superato'
    },
    recaptchaFailed: {
      description: 'Verifica reCAPTCHA fallita'
    }
  },


  fn: async function (inputs, exits) {
    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');

    // File per tracking rate limit (in memoria o su file temporaneo)
    const rateLimitFile = path.join(__dirname, '../../.tmp/rate-limit.json');

    // Leggi la configurazione reCAPTCHA
    let recaptchaConfig = null;
    try {
      const configPath = path.join(__dirname, '../../config/custom/private_recaptcha.json');
      if (fs.existsSync(configPath)) {
        recaptchaConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch (err) {
      sails.log.warn('reCAPTCHA config not found, skipping verification');
    }

    // === 1. RATE LIMITING ===
    const rateLimitConfig = {
      maxSubmissionsPerIP: 10,        // Max submissions per IP
      windowMinutes: 60,               // Finestra temporale in minuti
      maxSubmissionsPerForm: 3,        // Max submissions per form per IP
      formWindowMinutes: 15,           // Finestra temporale per form specifico
      blockDurationMinutes: 30         // Durata blocco se supera il limite
    };

    // Carica rate limit data
    let rateLimitData = { ips: {} };
    if (fs.existsSync(rateLimitFile)) {
      try {
        rateLimitData = JSON.parse(fs.readFileSync(rateLimitFile, 'utf8'));
      } catch (err) {
        sails.log.error('Error reading rate limit file:', err);
      }
    }

    const now = Date.now();
    const ipKey = inputs.ipAddress;

    // Inizializza dati IP se non esistono
    if (!rateLimitData.ips[ipKey]) {
      rateLimitData.ips[ipKey] = {
        totalSubmissions: [],
        formSubmissions: {},
        blockedUntil: null
      };
    }

    const ipData = rateLimitData.ips[ipKey];

    // Verifica se l'IP è bloccato
    if (ipData.blockedUntil && now < ipData.blockedUntil) {
      const blockedMinutes = Math.ceil((ipData.blockedUntil - now) / 1000 / 60);
      return exits.rateLimitExceeded({
        error: 'Too many requests',
        message: `IP temporaneamente bloccato. Riprova tra ${blockedMinutes} minuti.`,
        retryAfter: ipData.blockedUntil
      });
    }

    // Pulisci submissions vecchie (fuori dalla finestra temporale)
    const globalWindowMs = rateLimitConfig.windowMinutes * 60 * 1000;
    ipData.totalSubmissions = ipData.totalSubmissions.filter(
      timestamp => now - timestamp < globalWindowMs
    );

    // Verifica limite globale per IP
    if (ipData.totalSubmissions.length >= rateLimitConfig.maxSubmissionsPerIP) {
      // Blocca l'IP
      ipData.blockedUntil = now + (rateLimitConfig.blockDurationMinutes * 60 * 1000);
      saveRateLimitData(rateLimitData, rateLimitFile);

      return exits.rateLimitExceeded({
        error: 'Too many requests',
        message: `Superato il limite di ${rateLimitConfig.maxSubmissionsPerIP} invii per ora. IP bloccato per ${rateLimitConfig.blockDurationMinutes} minuti.`,
        retryAfter: ipData.blockedUntil
      });
    }

    // Verifica limite per form specifico
    if (!ipData.formSubmissions[inputs.formId]) {
      ipData.formSubmissions[inputs.formId] = [];
    }

    const formWindowMs = rateLimitConfig.formWindowMinutes * 60 * 1000;
    ipData.formSubmissions[inputs.formId] = ipData.formSubmissions[inputs.formId].filter(
      timestamp => now - timestamp < formWindowMs
    );

    if (ipData.formSubmissions[inputs.formId].length >= rateLimitConfig.maxSubmissionsPerForm) {
      return exits.rateLimitExceeded({
        error: 'Too many requests for this form',
        message: `Puoi inviare questo modulo solo ${rateLimitConfig.maxSubmissionsPerForm} volte ogni ${rateLimitConfig.formWindowMinutes} minuti.`,
        retryAfter: ipData.formSubmissions[inputs.formId][0] + formWindowMs
      });
    }

    // === 2. RECAPTCHA VERIFICATION ===
    let recaptchaScore = null;

    if (recaptchaConfig && recaptchaConfig.RECAPTCHA_SECRET_KEY && inputs.recaptchaToken) {
      try {
        const verifyURL = 'https://www.google.com/recaptcha/api/siteverify';
        const response = await axios.post(verifyURL, null, {
          params: {
            secret: recaptchaConfig.RECAPTCHA_SECRET_KEY,
            response: inputs.recaptchaToken
          }
        });

        const { success, score, action } = response.data;

        if (!success) {
          sails.log.warn('reCAPTCHA verification failed:', response.data);
          return exits.recaptchaFailed({
            error: 'reCAPTCHA verification failed',
            message: 'Verifica di sicurezza fallita. Riprova.'
          });
        }

        recaptchaScore = score;

        // Soglia di sicurezza (0.0 = bot, 1.0 = umano)
        const minScore = recaptchaConfig.MIN_SCORE || 0.5;

        if (score < minScore) {
          sails.log.warn(`reCAPTCHA score too low: ${score} (min: ${minScore})`);

          // Registra tentativo sospetto
          ipData.totalSubmissions.push(now);
          saveRateLimitData(rateLimitData, rateLimitFile);

          return exits.recaptchaFailed({
            error: 'Suspicious activity detected',
            message: 'Attività sospetta rilevata. Se sei umano, riprova.',
            score: score
          });
        }

        sails.log.info(`reCAPTCHA passed with score: ${score}`);

      } catch (err) {
        sails.log.error('reCAPTCHA verification error:', err.message);
        // Non blocchiamo se c'è un errore nel servizio reCAPTCHA
        // ma logghiamo l'errore
      }
    }

    // === 3. REGISTRA SUBMISSION ===
    ipData.totalSubmissions.push(now);
    ipData.formSubmissions[inputs.formId].push(now);

    // Salva i dati aggiornati
    saveRateLimitData(rateLimitData, rateLimitFile);

    // === 4. CLEANUP PERIODICO ===
    // Rimuovi IP inattivi da più di 24 ore
    cleanupOldEntries(rateLimitData, rateLimitFile);

    return exits.success({
      allowed: true,
      recaptchaScore: recaptchaScore,
      remainingSubmissions: rateLimitConfig.maxSubmissionsPerIP - ipData.totalSubmissions.length,
      remainingFormSubmissions: rateLimitConfig.maxSubmissionsPerForm - ipData.formSubmissions[inputs.formId].length
    });

    // ========== HELPER FUNCTIONS ==========

    function saveRateLimitData(data, filePath) {
      try {
        // Assicurati che la cartella .tmp esista
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      } catch (err) {
        sails.log.error('Error saving rate limit data:', err);
      }
    }

    function cleanupOldEntries(data, filePath) {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      let hasChanges = false;

      Object.keys(data.ips).forEach(ip => {
        const ipData = data.ips[ip];

        // Rimuovi IP se non ha submissions recenti e non è bloccato
        const hasRecentActivity = ipData.totalSubmissions.some(ts => ts > oneDayAgo);
        const isBlocked = ipData.blockedUntil && ipData.blockedUntil > Date.now();

        if (!hasRecentActivity && !isBlocked) {
          delete data.ips[ip];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        saveRateLimitData(data, filePath);
        sails.log.info('Rate limit data cleaned up');
      }
    }
  }


};
