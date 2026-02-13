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

  try {
    let docker;
    if (os.platform() === 'win32') {
      // On Windows, connect to Docker via WSL
      docker = new Docker({ socketPath: '//./pipe/docker_engine' });
    } else {
      // On Unix, use default socket
      docker = new Docker({ socketPath: '/var/run/docker.sock' });
    }

    // Test connection
    await docker.ping();
    return docker;
  } catch (err) {
    sails.log.warn('Cannot connect to Docker daemon via socket, will use shell commands:', err.message);
    // If connection fails, return null to use shell commands
    return null;
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

    // Clean up app directory (may be owned by root from Docker)
    const appPath = path.join(APPS_DIR, appId);
    if (await fs.pathExists(appPath)) {
      try {
        await fs.remove(appPath);
      } catch (err) {
        if (err.code === 'EACCES') {
          // Files created by Docker are owned by root, use Docker to remove
          sails.log.info(`[deleteApp] Using Docker to remove root-owned directory: ${appPath}`);
          execSync(`sudo docker run --rm -v "${APPS_DIR}:/apps" node:22-alpine rm -rf "/apps/${appId}"`, { stdio: 'pipe' });
        } else {
          throw err;
        }
      }
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
   * Get ports actually bound by Docker containers (not just apps.json)
   * @returns {Set<number>} Set of used host ports
   */
  getDockerUsedPorts: async () => {
    const usedPorts = new Set();
    try {
      const docker = await getDockerInstance();
      const settings = await getDockerSettings();

      let containers;
      if (settings.useSudo || !docker) {
        const output = execSync('sudo docker ps --format "{{.Ports}}"', { encoding: 'utf8' });
        // Parse lines like "0.0.0.0:3100->3000/tcp, ..."
        const portRegex = /0\.0\.0\.0:(\d+)->/g;
        let match;
        while ((match = portRegex.exec(output)) !== null) {
          usedPorts.add(parseInt(match[1]));
        }
      } else {
        containers = await docker.listContainers({ all: false });
        for (const c of containers) {
          if (c.Ports) {
            for (const p of c.Ports) {
              if (p.PublicPort) usedPorts.add(p.PublicPort);
            }
          }
        }
      }
    } catch (err) {
      sails.log.warn('Error listing Docker ports:', err.message);
    }
    return usedPorts;
  },

  /**
   * Find available port for Docker container
   * Checks both apps.json AND actual Docker containers
   * @returns {number} Available port
   */
  findAvailablePort: async () => {
    const apps = await AppsService.getAllApps();
    const appPorts = apps.map(app => app.port).filter(Boolean);
    const dockerPorts = await AppsService.getDockerUsedPorts();

    // Merge both sources
    const usedPorts = new Set([...appPorts, ...dockerPorts]);

    // Start from port 3100 and find first available
    let port = 3100;
    while (usedPorts.has(port)) {
      port++;
    }

    return port;
  },

  /**
   * Sync apps.json with actual Docker container states.
   * Called at server startup to recover state after restart.
   */
  syncContainerStates: async () => {
    const apps = await AppsService.getAllApps();
    if (apps.length === 0) return;

    let changed = false;
    for (const app of apps) {
      const containerName = `asp-app-${app.id}`;
      try {
        const docker = await getDockerInstance();
        const settings = await getDockerSettings();
        let info;

        if (settings.useSudo || !docker) {
          const output = execSync(`sudo docker inspect ${containerName}`, { encoding: 'utf8', stdio: 'pipe' });
          info = JSON.parse(output)[0];
        } else {
          const container = docker.getContainer(containerName);
          info = await container.inspect();
        }

        const running = info.State.Running;
        // Extract host port from PortBindings
        let port = null;
        const bindings = info.HostConfig && info.HostConfig.PortBindings && info.HostConfig.PortBindings['3000/tcp'];
        if (bindings && bindings[0] && bindings[0].HostPort) {
          port = parseInt(bindings[0].HostPort);
        }

        const newStatus = running ? 'running' : 'stopped';
        if (app.status !== newStatus || app.port !== port || app.containerId !== info.Id) {
          app.status = newStatus;
          app.port = running ? port : null;
          app.containerId = info.Id;
          app.updatedAt = new Date().toISOString();
          changed = true;
          sails.log.info(`[apps-sync] App "${app.id}" synced: status=${newStatus}, port=${port}`);
        }
      } catch (err) {
        // Container doesn't exist
        if (app.status !== 'stopped') {
          app.status = 'stopped';
          app.port = null;
          app.containerId = null;
          app.updatedAt = new Date().toISOString();
          changed = true;
          sails.log.info(`[apps-sync] App "${app.id}" container not found, marked stopped`);
        }
      }
    }

    if (changed) {
      await AppsService.saveApps(apps);
      sails.log.info('[apps-sync] Apps state synchronized with Docker');
    }
  },

  /**
   * Create and start Docker container for app
   * @param {Object} app - App object
   * @returns {Object} Container info
   */
  startContainer: async (app) => {
    const docker = await getDockerInstance();
    const settings = await getDockerSettings();
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

    // Find available port
    const port = await AppsService.findAvailablePort();

    // Prepare environment variables
    const basePath = `/apps/${app.id}`;
    const envVars = {
      BASE_PATH: basePath,
      ...(app.environmentVars || {})
    };
    const envArray = Object.entries(envVars).map(
      ([key, value]) => `${key}=${value}`
    );

    if (settings.useSudo || !docker) {
      // Use shell commands for Docker operations
      // Always use sudo if dockerode connection failed
      const dockerPrefix = 'sudo docker';

      try {
        // Pull image
        sails.log.info(`Pulling Docker image: ${dockerImage}`);
        execSync(`${dockerPrefix} pull ${dockerImage}`, {
          stdio: 'pipe',
          encoding: 'utf8',
          timeout: 300000 // 5 minutes timeout
        });
        sails.log.info(`Successfully pulled image: ${dockerImage}`);
      } catch (err) {
        sails.log.warn(`Error pulling Docker image ${dockerImage}:`, err.message);
        // Continue anyway, image might already exist
      }

      // Build docker run command
      const envFlags = envArray.length > 0 ? envArray.map(env => `-e "${env}"`).join(' ') : '';
      const containerName = `asp-app-${app.id}`;

      // Remove existing container if exists
      try {
        execSync(`${dockerPrefix} rm -f ${containerName}`, { stdio: 'ignore' });
      } catch (err) {
        // Container doesn't exist, ignore
      }

      // Run container
      const dockerCmd = `${dockerPrefix} run -d --name ${containerName} ${envFlags} -v "${appPath}:/app" -p ${port}:3000 --restart unless-stopped -w /app ${dockerImage} sh -c "${app.buildCommand || 'npm install'} && ${app.startCommand || 'npm start'}"`;

      sails.log.info(`Starting container with command: ${dockerCmd}`);
      const containerId = execSync(dockerCmd, {
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim();

      return {
        containerId: containerId,
        port: port,
        status: 'running'
      };
    } else {
      // Use dockerode
      // Pull image if not exists
      try {
        await new Promise((resolve, reject) => {
          docker.pull(dockerImage, (err, stream) => {
            if (err) {
              return reject(err);
            }
            docker.modem.followProgress(stream, (err, output) => {
              if (err) {
                return reject(err);
              }
              resolve(output);
            });
          });
        });
      } catch (err) {
        sails.log.warn('Error pulling Docker image:', err);
      }

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
    }
  },

  /**
   * Stop Docker container
   * @param {string} containerId - Container ID
   * @returns {boolean} Success status
   */
  stopContainer: async (containerId) => {
    try {
      const docker = await getDockerInstance();
      const settings = await getDockerSettings();

      if (settings.useSudo || !docker) {
        // Use shell command with sudo
        execSync(`sudo docker stop ${containerId}`, { stdio: 'inherit' });
        return true;
      } else {
        // Use dockerode
        const container = docker.getContainer(containerId);
        await container.stop();
        return true;
      }
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
      const docker = await getDockerInstance();
      const settings = await getDockerSettings();

      if (settings.useSudo || !docker) {
        // Use shell command with sudo
        execSync(`sudo docker rm -f ${containerId}`, { stdio: 'inherit' });
        return true;
      } else {
        // Use dockerode
        const container = docker.getContainer(containerId);
        await container.remove({ force: true });
        return true;
      }
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
      const docker = await getDockerInstance();
      const settings = await getDockerSettings();

      if (settings.useSudo || !docker) {
        // Use shell command with sudo
        const output = execSync(`sudo docker inspect ${containerId}`, { encoding: 'utf8' });
        const info = JSON.parse(output)[0];

        return {
          status: info.State.Status,
          running: info.State.Running,
          startedAt: info.State.StartedAt,
          finishedAt: info.State.FinishedAt
        };
      } else {
        // Use dockerode
        const container = docker.getContainer(containerId);
        const info = await container.inspect();

        return {
          status: info.State.Status,
          running: info.State.Running,
          startedAt: info.State.StartedAt,
          finishedAt: info.State.FinishedAt
        };
      }
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
      const docker = await getDockerInstance();
      const settings = await getDockerSettings();

      if (settings.useSudo || !docker) {
        // Use shell command with sudo
        const logs = execSync(`sudo docker logs --tail ${tail} --timestamps ${containerId}`, {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });
        return logs;
      } else {
        // Use dockerode
        const container = docker.getContainer(containerId);

        const logs = await container.logs({
          stdout: true,
          stderr: true,
          tail: tail,
          timestamps: true
        });

        return logs.toString('utf8');
      }
    } catch (err) {
      sails.log.error('Error getting container logs:', err);
      return '';
    }
  }
};

module.exports = AppsService;
