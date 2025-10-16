/**
 * forms/upload-logo.js
 *
 * @description :: Upload and save logo for forms
 */

const path = require('path');
const fs = require('fs');

module.exports = {

  friendlyName: 'Upload logo',

  description: 'Upload logo image for forms',

  inputs: {},

  exits: {
    success: {
      description: 'Logo uploaded successfully'
    },
    badRequest: {
      description: 'Invalid file',
      responseType: 'badRequest'
    }
  },

  fn: async function (inputs, exits) {
    try {
      const targetDir = path.resolve(sails.config.appPath, 'assets/images/forms');

      // Ensure directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Upload file using the receiver pattern
      this.req.file('logo').upload({
        dirname: targetDir,
        maxBytes: 5000000 // 5MB max
      }, async (err, uploadedFiles) => {
        if (err) {
          sails.log.error('Upload error:', err);
          return exits.badRequest({ error: 'Upload failed', message: err.message });
        }

        if (!uploadedFiles || uploadedFiles.length === 0) {
          sails.log.error('No files in upload result');
          return exits.badRequest({ error: 'No file uploaded' });
        }

        try {
          const uploadedFile = uploadedFiles[0];
          const uploadedPath = uploadedFile.fd;
          const ext = path.extname(uploadedPath);
          const targetPath = path.join(targetDir, 'logo' + ext);

          // Delete existing logo files with different extensions
          const existingLogos = fs.readdirSync(targetDir).filter(f => f.startsWith('logo.'));
          existingLogos.forEach(logo => {
            fs.unlinkSync(path.join(targetDir, logo));
          });

          // Move uploaded file to target path
          fs.renameSync(uploadedPath, targetPath);

          const filename = path.basename(targetPath);

          // Log the upload
          await sails.helpers.log.with({
            level: 'info',
            tag: 'FORMS_ADMIN',
            message: 'Logo uploaded for forms',
            action: 'upload_forms_logo',
            ipAddress: this.req.ip,
            user: this.req.user ? this.req.user.id : undefined,
            context: {
              filename: filename
            }
          });

          return exits.success({
            success: true,
            message: 'Logo caricato con successo',
            path: `/images/forms/${filename}`
          });

        } catch (moveErr) {
          sails.log.error('Error moving logo file:', moveErr);
          return exits.badRequest({
            error: 'Upload failed',
            message: moveErr.message
          });
        }
      });

    } catch (err) {
      sails.log.error('Error uploading logo:', err);
      return exits.badRequest({
        error: 'Upload failed',
        message: err.message
      });
    }
  }

};
