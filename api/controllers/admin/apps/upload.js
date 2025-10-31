module.exports = {
  friendlyName: 'Upload app from ZIP',
  description: 'Upload and deploy an app from a ZIP file',

  files: ['zipFile'],

  inputs: {
    name: {
      type: 'string',
      required: false,
      description: 'App name (optional, will be read from package.json)'
    },
    description: {
      type: 'string',
      required: false,
      description: 'App description'
    }
  },

  exits: {
    success: {
      description: 'App uploaded successfully',
    },
  },

  fn: async function (inputs, exits) {
    const req = this.req;
    const res = this.res;

    try {
      const path = require('path');
      const fs = require('fs-extra');
      const AdmZip = require('adm-zip');
      const tmpDir = path.join(sails.config.appPath, '.tmp', 'uploads');

      // Ensure directory exists
      await fs.ensureDir(tmpDir);

      // Upload file using the receiver pattern
      req.file('zipFile').upload({
        dirname: tmpDir,
        maxBytes: 100000000 // 100MB max
      }, async (err, uploadedFiles) => {
        if (err) {
          sails.log.error('Upload error:', err);
          return res.ApiResponse({
            errType: 'SERVER_ERROR',
            errMsg: 'Upload failed: ' + err.message
          });
        }

        if (!uploadedFiles || uploadedFiles.length === 0) {
          return res.ApiResponse({
            errType: 'BAD_REQUEST',
            errMsg: 'No file uploaded'
          });
        }

        try {
          const zipPath = uploadedFiles[0].fd;

          // Extract to temporary location first to read package.json
          const tempExtractPath = path.join(
            sails.config.appPath,
            '.tmp',
            'extract-' + Date.now()
          );

          const zip = new AdmZip(zipPath);
          zip.extractAllTo(tempExtractPath, true);

          // Find package.json (might be in root or subdirectory)
          let packageJsonPath;
          let appRootPath = tempExtractPath;

          // Check if package.json is in root
          if (await fs.pathExists(path.join(tempExtractPath, 'package.json'))) {
            packageJsonPath = path.join(tempExtractPath, 'package.json');
          } else {
            // Check in first subdirectory (common for GitHub archives)
            const dirs = await fs.readdir(tempExtractPath);
            for (const dir of dirs) {
              const dirPath = path.join(tempExtractPath, dir);
              const stat = await fs.stat(dirPath);
              if (stat.isDirectory()) {
                const pkgPath = path.join(dirPath, 'package.json');
                if (await fs.pathExists(pkgPath)) {
                  packageJsonPath = pkgPath;
                  appRootPath = dirPath;
                  break;
                }
              }
            }
          }

          if (!packageJsonPath) {
            // Clean up
            await fs.remove(tempExtractPath);
            await fs.remove(zipPath);

            return res.ApiResponse({
              errType: 'BAD_REQUEST',
              errMsg: 'package.json not found in ZIP file'
            });
          }

          // Read package.json
          const packageJson = await fs.readJson(packageJsonPath);
          const appId = packageJson.name;

          if (!appId) {
            // Clean up
            await fs.remove(tempExtractPath);
            await fs.remove(zipPath);

            return res.ApiResponse({
              errType: 'BAD_REQUEST',
              errMsg: 'package.json must contain a "name" field'
            });
          }

          // Check if app already exists
          const existingApp = await AppsService.getAppById(appId);
          if (existingApp) {
            // Clean up
            await fs.remove(tempExtractPath);
            await fs.remove(zipPath);

            return res.ApiResponse({
              errType: 'CONFLICT',
              errMsg: 'App with this ID already exists'
            });
          }

          // Move to final location
          const finalPath = path.join(sails.config.appPath, '.apps', appId);
          await fs.ensureDir(path.dirname(finalPath));
          await fs.move(appRootPath, finalPath, { overwrite: true });

          // Detect app type
          const appType = await AppsService.detectAppType(finalPath);

          // Create app configuration
          const app = {
            id: appId,
            name: inputs.name || packageJson.name,
            description: inputs.description || packageJson.description || '',
            type: appType,
            source: 'zip',
            status: 'stopped',
            port: null,
            containerId: null,
            dockerImage: appType === 'nodejs' ? 'node:22-alpine' : 'dart:stable',
            buildCommand: 'npm install',
            startCommand: packageJson.scripts?.start ? 'npm start' : 'node index.js',
            environmentVars: {},
            path: finalPath
          };

          await AppsService.saveApp(app);

          // Clean up temporary files
          await fs.remove(tempExtractPath).catch(() => {});
          await fs.remove(zipPath);

          return res.ApiResponse({
            data: { app }
          });

        } catch (err) {
          sails.log.error('Error processing uploaded file:', err);
          return res.ApiResponse({
            errType: 'SERVER_ERROR',
            errMsg: 'Error processing uploaded file: ' + err.message
          });
        }
      });

    } catch (err) {
      sails.log.error('Error uploading app:', err);
      return res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error uploading app: ' + err.message
      });
    }
  }
};
