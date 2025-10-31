# Docker Apps Management Feature

This feature allows you to deploy and manage containerized Node.js and Dart/Flutter applications within the ASP Webservices platform. Apps are served through the same Sails.js server using reverse proxy.

## Overview

The Docker Apps feature provides:
- **Upload apps** from ZIP files
- **Clone apps** from GitHub repositories
- **Manage app lifecycle** (start, stop, restart)
- **Update apps** from GitHub
- **View logs** from running containers
- **Proxy apps** through `/apps/<app-id>` URLs

## Architecture

### Components

1. **AppsService** (`api/services/AppsService.js`)
   - Core service for app lifecycle management
   - Docker container operations
   - File system operations (ZIP extraction, Git cloning)
   - Configuration management

2. **Admin Panel** (`/admin/apps`)
   - Web UI for managing apps
   - Protected by basic auth (same as main admin panel)
   - Built with Bootstrap 5 and Axios

3. **API Endpoints** (`/api/v1/admin/apps/*`)
   - RESTful API for app operations
   - Protected by JWT authentication (superAdmin level required)
   - Scopes: `admin-manage`

4. **Reverse Proxy Hook** (`api/hooks/apps-proxy.js`)
   - Automatically routes `/apps/<app-id>/*` to running containers
   - Uses `http-proxy-middleware`

### File Structure

```
.apps/                              # App storage directory (git-ignored)
├── app-name-1/                     # Individual app directory
│   ├── package.json
│   └── ...
└── app-name-2/
    └── ...

config/custom/
├── apps.json                       # App configurations (git-ignored)
└── example_apps.json               # Example configuration

api/
├── controllers/admin/apps/         # App management controllers
│   ├── index.js                    # Admin panel view
│   ├── list.js                     # List all apps
│   ├── get.js                      # Get app details
│   ├── clone.js                    # Clone from GitHub
│   ├── upload.js                   # Upload ZIP
│   ├── update.js                   # Update from GitHub
│   ├── start.js                    # Start container
│   ├── stop.js                     # Stop container
│   ├── restart.js                  # Restart container
│   ├── delete.js                   # Delete app
│   └── logs.js                     # Get container logs
├── services/
│   └── AppsService.js              # Core app management service
└── hooks/
    └── apps-proxy.js               # Reverse proxy hook

views/pages/admin/apps/
└── index.ejs                       # Admin panel UI
```

## Requirements

### System Requirements
- Docker installed and running
- Node.js 22+ (as per project requirements)
- Git (for cloning repositories)

### Windows-Specific
- Docker Desktop for Windows
- WSL2 with Docker integration enabled

### Unix/Linux-Specific
- Docker daemon running
- User has permissions to access Docker socket

## Installation

Dependencies are already installed via npm. The following packages are used:
- `dockerode`: Docker API client
- `http-proxy-middleware`: Reverse proxy
- `adm-zip`: ZIP file handling
- `simple-git`: Git operations
- `fs-extra`: Enhanced file system operations

## Configuration

### App Configuration Format

Apps are stored in `config/custom/apps.json`:

```json
[
  {
    "id": "app-name",
    "name": "Display Name",
    "description": "App description",
    "type": "nodejs",
    "source": "github",
    "githubUrl": "https://github.com/user/repo",
    "branch": "main",
    "status": "running",
    "port": 3100,
    "containerId": "abc123...",
    "dockerImage": "node:22-alpine",
    "buildCommand": "npm install",
    "startCommand": "npm start",
    "environmentVars": {},
    "path": "/path/to/.apps/app-name",
    "createdAt": "2025-10-31T00:00:00.000Z",
    "updatedAt": "2025-10-31T00:00:00.000Z"
  }
]
```

### Docker Images

Default images by app type:
- **Node.js**: `node:22-alpine`
- **Dart/Flutter**: `dart:stable`

You can customize the Docker image per app in the configuration.

### Port Assignment

Ports are automatically assigned starting from 3100. The system finds the next available port when starting a new container.

## Usage

### Access Admin Panel

1. Navigate to `/admin/apps`
2. Login with admin credentials (from `config/custom/private_ui_users.json`)

### Deploy from GitHub

1. Click "Clone from GitHub"
2. Enter repository URL (e.g., `https://github.com/deduzzo/personale-convenzionato-presidi`)
3. Specify branch (default: `main`)
4. Optionally provide custom name and description
5. Click "Clone & Deploy"

The system will:
- Clone the repository
- Read `package.json` to get app ID
- Detect app type (Node.js or Dart)
- Save configuration
- App will be in "stopped" state

### Deploy from ZIP

1. Click "Upload ZIP"
2. Select ZIP file containing your app
3. Optionally provide custom name and description
4. Click "Upload & Deploy"

Requirements for ZIP:
- Must contain `package.json` in root or first subdirectory
- `package.json` must have a `name` field (used as app ID)

### Start an App

1. Click "Start" button on app card
2. System will:
   - Create Docker container
   - Run build command (`npm install`)
   - Run start command (`npm start`)
   - Assign port
   - Start container

### Access Running App

Once running, apps are accessible at:
```
http://your-domain/apps/<app-id>/
```

Example:
```
http://localhost:1337/apps/personale-convenzionato-presidi/
```

### Update from GitHub

For apps cloned from GitHub:
1. Click "Update" button
2. System pulls latest changes from the configured branch
3. Restart the app to apply changes

### View Logs

1. Click on any app card to view details
2. Logs show last 50 lines from container stdout/stderr

### Stop/Restart App

- **Stop**: Stops the Docker container
- **Restart**: Stops, removes old container, and creates new one

### Delete App

1. Click trash icon
2. Confirm deletion
3. Container and app files are removed

## API Endpoints

All endpoints require JWT authentication with `superAdmin` level and `admin-manage` scope.

### List Apps
```
GET /api/v1/admin/apps/list
Response: { ok: true, data: { apps: [...] } }
```

### Get App Details
```
GET /api/v1/admin/apps/get?id=<app-id>
Response: { ok: true, data: { app: {...} } }
```

### Clone from GitHub
```
POST /api/v1/admin/apps/clone
Body: {
  githubUrl: "https://github.com/user/repo",
  branch: "main",
  name: "Optional Name",
  description: "Optional Description"
}
```

### Upload ZIP
```
POST /api/v1/admin/apps/upload
Content-Type: multipart/form-data
Form fields:
  - zipFile: <file>
  - name: "Optional Name"
  - description: "Optional Description"
```

### Start App
```
POST /api/v1/admin/apps/start
Body: { id: "app-id" }
```

### Stop App
```
POST /api/v1/admin/apps/stop
Body: { id: "app-id" }
```

### Restart App
```
POST /api/v1/admin/apps/restart
Body: { id: "app-id" }
```

### Update from GitHub
```
POST /api/v1/admin/apps/update
Body: { id: "app-id" }
```

### Delete App
```
POST /api/v1/admin/apps/delete
Body: { id: "app-id" }
```

### Get Logs
```
GET /api/v1/admin/apps/logs?id=<app-id>&tail=100
Response: { ok: true, data: { logs: "..." } }
```

## Testing

### Test with Example Repository

The feature can be tested with:
```
https://github.com/deduzzo/personale-convenzionato-presidi
```

Steps:
1. Access `/admin/apps`
2. Click "Clone from GitHub"
3. Enter the URL above
4. Click "Clone & Deploy"
5. Once cloned, click "Start"
6. Wait for container to start (check logs for progress)
7. Access at `/apps/personale-convenzionato-presidi/`

### Manual Testing with Docker

Check running containers:
```bash
docker ps
```

View container logs:
```bash
docker logs <container-id>
```

Stop container:
```bash
docker stop <container-id>
```

### Troubleshooting

**Container fails to start:**
- Check Docker is running
- Check app's package.json has valid scripts
- View logs in admin panel or via `docker logs`

**App not accessible:**
- Ensure container is in "running" status
- Check port is not blocked by firewall
- Verify app listens on port 3000 inside container

**Upload fails:**
- Check ZIP file contains valid package.json
- Ensure file size < 100MB
- Check app ID doesn't already exist

**Windows-specific issues:**
- Ensure Docker Desktop is running
- Check WSL2 integration is enabled
- Verify Docker socket path in `AppsService.js`

## Security Considerations

1. **Admin Panel**: Protected by basic auth (same credentials as main admin)
2. **API Endpoints**: Require JWT with superAdmin level
3. **App Access**: Apps served at `/apps/<id>` are **publicly accessible** (no auth required)
4. **Docker Isolation**: Each app runs in isolated Docker container
5. **File System**: App files stored in `.apps/` directory (git-ignored)

## Limitations

1. Apps must expose HTTP server on port 3000 inside container
2. Only Node.js and Dart apps currently supported
3. No support for apps requiring databases (yet)
4. No persistent volumes (app data lost on container restart)
5. Build and start commands are executed in single Docker CMD

## Future Enhancements

- [ ] Support for environment variables per app
- [ ] Database integration (MySQL, PostgreSQL)
- [ ] Persistent volumes for app data
- [ ] Health checks and automatic restarts
- [ ] Resource limits (CPU, memory)
- [ ] Multiple instances per app (load balancing)
- [ ] Custom domains per app
- [ ] SSL/TLS support
- [ ] Webhook support for auto-updates from GitHub
- [ ] Build logs separate from runtime logs
- [ ] Support for other app types (Python, PHP, etc.)

## Branch Information

This feature is developed in the `feature/docker-apps` branch.

To merge into main:
```bash
git checkout main
git merge feature/docker-apps
```

## Credits

Implemented as part of ASP di Messina webservices platform.
