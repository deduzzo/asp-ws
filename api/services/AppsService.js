// api/services/AppsService.js
const fs = require('fs-extra');
const path = require('path');
const Docker = require('dockerode');
const AdmZip = require('adm-zip');
const simpleGit = require('simple-git');
const os = require('os');
const {execSync} = require('child_process');

const APPS_CONFIG_PATH = path.join(sails.config.appPath, 'data', 'apps.json');
const APPS_DIR = path.join(sails.config.appPath, '.apps');
const DOCKER_SETTINGS_PATH = path.join(sails.config.appPath, 'config', 'custom', 'docker_settings.json');

// Read Docker settings
const getDockerSettings = async () => {
  try {
    if (await fs.pathExists(DOCKER_SETTINGS_PATH)) {
      return await fs.readJson(DOCKER_SETTINGS_PATH);
    }
  } catch (err) {
    sails.log.warn('Error reading Docker settings:', err);
  }
  return { useSudo: false, sudoPassword: null };
};

// Initialize Docker based on platform and settings
const getDockerInstance = async () => {
  const settings = await getDockerSettings();

  if (settings.useSudo) {
    // If using sudo, we'll use shell commands instead of dockerode
    return null;
  }

  if (os.platform() === 'win32') {
    // On Windows, connect to Docker via WSL
    return new Docker({ socketPath: '//./pipe/docker_engine' });
  } else {
    // On Unix, use default socket
    return new Docker({ socketPath: '/var/run/docker.sock' });
  }
};

const AppsService = {
  /**
   * Get all apps from configuration file
   * @returns {Array} Array of app objects
   */
  getAllApps: async () => {
    try {
      if (!await fs.pathExists(APPS_CONFIG_PATH)) {
        await fs.writeJson(APPS_CONFIG_PATH, []);
        return [];
      }
      return await fs.readJson(APPS_CONFIG_PATH);
    } catch (err) {
      sails.log.error('Error reading apps config:', err);
      return [];
    }
  },

  /**
   * Get app by ID
   * @param {string} appId - App ID
   * @returns {Object|null} App object or null if not found
   */
  getAppById: async (appId) => {
    const apps = await AppsService.getAllApps();
    return apps.find(app => app.id === appId) || null;
  },

  /**
   * Save apps to configuration file
   * @param {Array} apps - Array of app objects
   * @returns {boolean} Success status
   */
  saveApps: async (apps) => {
    try {
      await fs.writeJson(APPS_CONFIG_PATH, apps, { spaces: 2 });
      return true;
    } catch (err) {
      sails.log.error('Error saving apps config:', err);
      return false;
    }
  },

  /**
   * Add or update an app
   * @param {Object} appData - App data
   * @returns {Object} Updated app object
   */
  saveApp: async (appData) => {
    const apps = await AppsService.getAllApps();
    const existingIndex = apps.findIndex(app => app.id === appData.id);

    const now = new Date().toISOString();
    const app = {
      ...appData,
      updatedAt: now,
      createdAt: existingIndex >= 0 ? apps[existingIndex].createdAt : now
    };

    if (existingIndex >= 0) {
      apps[existingIndex] = app;
    } else {
      apps.push(app);
    }

    await AppsService.saveApps(apps);
    return app;
  },

  /**
   * Delete an app
   * @param {string} appId - App ID
   * @returns {boolean} Success status
   */
  deleteApp: async (appId) => {
    const apps = await AppsService.getAllApps();
    const filteredApps = apps.filter(app => app.id !== appId);

    if (filteredApps.length === apps.length) {
      return false; // App not found
    }

    // Clean up app directory
    const appPath = path.join(APPS_DIR, appId);
    if (await fs.pathExists(appPath)) {
      await fs.remove(appPath);
    }

    await AppsService.saveApps(filteredApps);
    return true;
  },

  /**
   * Extract ZIP file to app directory
   * @param {string} zipPath - Path to ZIP file
   * @param {string} appId - App ID
   * @returns {string} Path to extracted app
   */
  extractZip: async (zipPath, appId) => {
    const extractPath = path.join(APPS_DIR, appId);

    // Ensure directory exists
    await fs.ensureDir(extractPath);

    // Extract ZIP
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    return extractPath;
  },

  /**
   * Clone GitHub repository
   * @param {string} githubUrl - GitHub repository URL
   * @param {string} appId - App ID
   * @param {string} branch - Branch name (default: main)
   * @returns {string} Path to cloned repository
   */
  cloneGithub: async (githubUrl, appId, branch = 'main') => {
    const clonePath = path.join(APPS_DIR, appId);

    // Remove existing directory if exists
    if (await fs.pathExists(clonePath)) {
      await fs.remove(clonePath);
    }

    // Ensure parent directory exists
    await fs.ensureDir(APPS_DIR);

    // Clone repository
    const git = simpleGit();
    await git.clone(githubUrl, clonePath, ['--branch', branch, '--single-branch']);

    return clonePath;
  },

  /**
   * Update app from GitHub
   * @param {string} appId - App ID
   * @returns {boolean} Success status
   */
  updateFromGithub: async (appId) => {
    const appPath = path.join(APPS_DIR, appId);

    if (!await fs.pathExists(appPath)) {
      throw new Error('App directory not found');
    }

    // Pull latest changes
    const git = simpleGit(appPath);
    await git.pull();

    return true;
  },

  /**
   * Read package.json from app directory
   * @param {string} appPath - Path to app directory
   * @returns {Object} package.json contents
   */
  readPackageJson: async (appPath) => {
    const packageJsonPath = path.join(appPath, 'package.json');

    if (!await fs.pathExists(packageJsonPath)) {
      throw new Error('package.json not found in app directory');
    }

    return await fs.readJson(packageJsonPath);
  },

  /**
   * Detect app type from package.json or pubspec.yaml
   * @param {string} appPath - Path to app directory
   * @returns {string} App type (nodejs, dart)
   */
  detectAppType: async (appPath) => {
    // Check for package.json (Node.js)
    if (await fs.pathExists(path.join(appPath, 'package.json'))) {
      return 'nodejs';
    }

    // Check for pubspec.yaml (Dart/Flutter)
    if (await fs.pathExists(path.join(appPath, 'pubspec.yaml'))) {
      return 'dart';
    }

    throw new Error('Unable to detect app type');
  },

  /**
   * Find available port for Docker container
   * @returns {number} Available port
   */
  findAvailablePort: async () => {
    const apps = await AppsService.getAllApps();
    const usedPorts = apps.map(app => app.port).filter(Boolean);

    // Start from port 3100 and find first available
    let port = 3100;
    while (usedPorts.includes(port)) {
      port++;
    }

    return port;
  },

  /**
   * Create and start Docker container for app
   * @param {Object} app - App object
   * @returns {Object} Container info
   */
  startContainer: async (app) => {
    const docker = getDockerInstance();
    const appPath = path.join(APPS_DIR, app.id);

    if (!await fs.pathExists(appPath)) {
      throw new Error('App directory not found');
    }

    // Determine Docker image based on app type
    let dockerImage = 'node:22-alpine';
    if (app.type === 'dart') {
      dockerImage = 'dart:stable';
    } else if (app.dockerImage) {
      dockerImage = app.dockerImage;
    }

    // Pull image if not exists
    try {
      await docker.pull(dockerImage);
    } catch (err) {
      sails.log.warn('Error pulling Docker image:', err);
    }

    // Find available port
    const port = await AppsService.findAvailablePort();

    // Prepare environment variables
    const envArray = Object.entries(app.environmentVars || {}).map(
      ([key, value]) => `${key}=${value}`
    );

    // Create container
    const container = await docker.createContainer({
      Image: dockerImage,
      name: `asp-app-${app.id}`,
      Env: envArray,
      ExposedPorts: {
        '3000/tcp': {}
      },
      HostConfig: {
        Binds: [`${appPath}:/app`],
        PortBindings: {
          '3000/tcp': [{ HostPort: port.toString() }]
        },
        RestartPolicy: {
          Name: 'unless-stopped'
        }
      },
      WorkingDir: '/app',
      Cmd: ['sh', '-c', `${app.buildCommand || 'npm install'} && ${app.startCommand || 'npm start'}`]
    });

    // Start container
    await container.start();

    // Get container info
    const containerInfo = await container.inspect();

    return {
      containerId: containerInfo.Id,
      port: port,
      status: 'running'
    };
  },

  /**
   * Stop Docker container
   * @param {string} containerId - Container ID
   * @returns {boolean} Success status
   */
  stopContainer: async (containerId) => {
    try {
      const docker = getDockerInstance();
      const container = docker.getContainer(containerId);
      await container.stop();
      return true;
    } catch (err) {
      sails.log.error('Error stopping container:', err);
      return false;
    }
  },

  /**
   * Remove Docker container
   * @param {string} containerId - Container ID
   * @returns {boolean} Success status
   */
  removeContainer: async (containerId) => {
    try {
      const docker = getDockerInstance();
      const container = docker.getContainer(containerId);
      await container.remove({ force: true });
      return true;
    } catch (err) {
      sails.log.error('Error removing container:', err);
      return false;
    }
  },

  /**
   * Get container status
   * @param {string} containerId - Container ID
   * @returns {Object} Container status
   */
  getContainerStatus: async (containerId) => {
    try {
      const docker = getDockerInstance();
      const container = docker.getContainer(containerId);
      const info = await container.inspect();

      return {
        status: info.State.Status,
        running: info.State.Running,
        startedAt: info.State.StartedAt,
        finishedAt: info.State.FinishedAt
      };
    } catch (err) {
      sails.log.error('Error getting container status:', err);
      return { status: 'error', running: false };
    }
  },

  /**
   * Get container logs
   * @param {string} containerId - Container ID
   * @param {number} tail - Number of lines to tail (default: 100)
   * @returns {string} Container logs
   */
  getContainerLogs: async (containerId, tail = 100) => {
    try {
      const docker = getDockerInstance();
      const container = docker.getContainer(containerId);

      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: tail,
        timestamps: true
      });

      return logs.toString('utf8');
    } catch (err) {
      sails.log.error('Error getting container logs:', err);
      return '';
    }
  }
};

module.exports = AppsService;
