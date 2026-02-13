/**
 * apps-proxy hook
 *
 * Reverse proxy for Docker apps at /apps/:id/*
 * Supports both HTTP and WebSocket connections.
 * Uses cached proxy instances per app for efficient WebSocket upgrade handling.
 */

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function defineAppsProxyHook(sails) {
  // Cache of proxy instances keyed by `appId:port`
  const proxyCache = new Map();

  /**
   * Get or create a cached proxy instance for the given app.
   * Cache key includes the port so that if the port changes (restart),
   * a new proxy is created automatically.
   */
  function getOrCreateProxy(appId, port) {
    const cacheKey = `${appId}:${port}`;

    if (proxyCache.has(cacheKey)) {
      return proxyCache.get(cacheKey);
    }

    // Clean up any old proxy for this appId (different port)
    for (const [key, entry] of proxyCache.entries()) {
      if (key.startsWith(`${appId}:`)) {
        proxyCache.delete(key);
        break;
      }
    }

    const proxy = createProxyMiddleware({
      target: `http://localhost:${port}`,
      changeOrigin: true,
      ws: true,
      pathRewrite: (path) => {
        // Remove /apps/:appId prefix
        return path.replace(new RegExp(`^/apps/${appId}`), '') || '/';
      },
      on: {
        error: (err, req, resOrSocket) => {
          sails.log.error(`Proxy error for app ${appId}:`, err.message);
          // For HTTP responses
          if (resOrSocket.writeHead) {
            if (!resOrSocket.headersSent) {
              resOrSocket.writeHead(502, { 'Content-Type': 'application/json' });
            }
            resOrSocket.end(JSON.stringify({
              ok: false,
              err: { code: 'PROXY_ERROR', msg: 'Error connecting to app' },
              data: null
            }));
          } else {
            // For WebSocket sockets
            resOrSocket.destroy();
          }
        }
      },
      logger: {
        info: () => {},
        warn: (msg) => sails.log.warn('[apps-proxy]', msg),
        error: (msg) => sails.log.error('[apps-proxy]', msg)
      }
    });

    proxyCache.set(cacheKey, proxy);
    sails.log.info(`[apps-proxy] Created proxy for app "${appId}" -> localhost:${port}`);
    return proxy;
  }

  /**
   * Parse appId from a request URL matching /apps/:appId...
   */
  function parseAppId(url) {
    const match = url && url.match(/^\/apps\/([^/?]+)/);
    return match ? match[1] : null;
  }

  return {
    /**
     * Invalidate (remove) cached proxy for an app.
     * Called by lifecycle controllers (start, stop, restart, delete).
     */
    invalidateProxy: function (appId) {
      for (const [key] of proxyCache.entries()) {
        if (key.startsWith(`${appId}:`)) {
          proxyCache.delete(key);
          sails.log.info(`[apps-proxy] Invalidated proxy cache for app "${appId}"`);
          return;
        }
      }
    },

    /**
     * Runs when this Sails app loads/lifts.
     */
    initialize: async function () {
      sails.log.info('Initializing apps-proxy hook...');

      sails.after('hook:http:loaded', () => {
        try {
          const app = sails.hooks.http.app;
          const server = sails.hooks.http.server;

          // ── HTTP Proxy Middleware ──
          // Registered on the Express app BEFORE Sails routes,
          // so it intercepts /apps/:appId requests first.
          app.use('/apps/:appId', async (req, res, next) => {
            const appId = req.params.appId;

            try {
              const appConfig = await AppsService.getAppById(appId);

              if (!appConfig) {
                return res.status(404).json({
                  ok: false,
                  err: { code: 'NOT_FOUND', msg: 'App not found' },
                  data: null
                });
              }

              if (!appConfig.port || appConfig.status !== 'running') {
                return res.status(503).json({
                  ok: false,
                  err: { code: 'SERVICE_UNAVAILABLE', msg: 'App is not running' },
                  data: null
                });
              }

              const proxy = getOrCreateProxy(appId, appConfig.port);
              return proxy(req, res, next);
            } catch (err) {
              sails.log.error(`[apps-proxy] Error handling HTTP for app ${appId}:`, err);
              return res.status(500).json({
                ok: false,
                err: { code: 'SERVER_ERROR', msg: 'Internal proxy error' },
                data: null
              });
            }
          });

          // ── WebSocket Upgrade Handler ──
          // Intercepts HTTP upgrade requests for /apps/:appId paths
          // and routes them to the correct proxy instance.
          if (server) {
            server.on('upgrade', async (req, socket, head) => {
              const appId = parseAppId(req.url);

              if (!appId) {
                // Not an app WebSocket request, let Sails/Socket.io handle it
                return;
              }

              try {
                const appConfig = await AppsService.getAppById(appId);

                if (!appConfig || !appConfig.port || appConfig.status !== 'running') {
                  sails.log.warn(`[apps-proxy] WS upgrade rejected for app "${appId}": not running`);
                  socket.destroy();
                  return;
                }

                const proxy = getOrCreateProxy(appId, appConfig.port);
                proxy.upgrade(req, socket, head);
              } catch (err) {
                sails.log.error(`[apps-proxy] WS upgrade error for app ${appId}:`, err);
                socket.destroy();
              }
            });

            sails.log.info('[apps-proxy] WebSocket upgrade handler registered');
          } else {
            sails.log.warn('[apps-proxy] HTTP server not available, WebSocket proxying disabled');
          }

          sails.log.info('Apps proxy middleware configured successfully (HTTP + WebSocket)');
        } catch (err) {
          sails.log.error('Error setting up apps proxy:', err);
        }
      });
    }
  };
};
