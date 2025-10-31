module.exports = {
  friendlyName: 'Clone app from GitHub',
  description: 'Clone and deploy an app from a GitHub repository',

  inputs: {
    githubUrl: {
      type: 'string',
      required: true,
      description: 'GitHub repository URL'
    },
    branch: {
      type: 'string',
      required: false,
      defaultsTo: 'main',
      description: 'Branch to clone'
    },
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
      description: 'App cloned successfully',
    },
  },

  fn: async function (inputs, exits) {
    try {
      const fs = require('fs-extra');
      const path = require('path');

      // Create temporary clone path
      const tempId = 'temp-' + Date.now();
      const clonePath = await AppsService.cloneGithub(
        inputs.githubUrl,
        tempId,
        inputs.branch
      );

      // Read package.json to get app ID
      const packageJson = await AppsService.readPackageJson(clonePath);
      const appId = packageJson.name;

      if (!appId) {
        // Clean up
        await fs.remove(clonePath);

        return this.res.ApiResponse({
          errType: 'BAD_REQUEST',
          errMsg: 'package.json must contain a "name" field'
        });
      }

      // Check if app already exists
      const existingApp = await AppsService.getAppById(appId);
      if (existingApp) {
        // Clean up
        await fs.remove(clonePath);

        return this.res.ApiResponse({
          errType: 'CONFLICT',
          errMsg: 'App with this ID already exists'
        });
      }

      // Move to final location with correct app ID
      const finalPath = path.join(sails.config.appPath, '.apps', appId);
      await fs.move(clonePath, finalPath, { overwrite: true });

      // Detect app type
      const appType = await AppsService.detectAppType(finalPath);

      // Create app configuration
      const app = {
        id: appId,
        name: inputs.name || packageJson.name,
        description: inputs.description || packageJson.description || '',
        type: appType,
        source: 'github',
        githubUrl: inputs.githubUrl,
        branch: inputs.branch,
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

      return this.res.ApiResponse({
        data: { app }
      });

    } catch (err) {
      sails.log.error('Error cloning app:', err);
      return this.res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error cloning app: ' + err.message
      });
    }
  }
};
