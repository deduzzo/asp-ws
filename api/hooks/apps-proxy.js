/**
 * apps-proxy hook
 *
 * This hook sets up reverse proxy for Docker apps at /apps/:id/*
 */

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function defineAppsProxyHook(sails) {
  return {
    /**
     * Runs when this Sails app loads/lifts.
     */
    initialize: async function () {
      sails.log.info('Initializing apps-proxy hook...');

      // Wait for Sails to finish loading before setting up proxy
      sails.after('hook:http:loaded', () => {
        try {
          // Get the Express app
          const app = sails.hooks.http.app;

          // Setup proxy middleware for /apps/:id/*
          app.use('/apps/:appId', async (req, res, next) => {
            const appId = req.params.appId;

            // Get app configuration
            const app = await AppsService.getAppById(appId);

            if (!app) {
              return res.status(404).json({
                ok: false,
                err: {
                  code: 'NOT_FOUND',
                  msg: 'App not found'
                },
                data: null
              });
            }

            if (!app.port || app.status !== 'running') {
              return res.status(503).json({
                ok: false,
                err: {
                  code: 'SERVICE_UNAVAILABLE',
                  msg: 'App is not running'
                },
                data: null
              });
            }

            // Create proxy for this app
            const proxy = createProxyMiddleware({
              target: `http://localhost:${app.port}`,
              changeOrigin: true,
              pathRewrite: {
                [`^/apps/${appId}`]: '', // Remove /apps/:appId prefix
              },
              selfHandleResponse: true, // Handle response manually for HTML injection
              onProxyRes: (proxyRes, req, res) => {
                // Check if response is HTML
                const contentType = proxyRes.headers['content-type'] || '';

                // Copy headers from proxy response
                Object.keys(proxyRes.headers).forEach(key => {
                  if (key !== 'content-length') {
                    res.setHeader(key, proxyRes.headers[key]);
                  }
                });
                res.statusCode = proxyRes.statusCode;

                if (contentType.includes('text/html')) {
                  // Collect response data
                  let body = '';
                  proxyRes.on('data', (chunk) => {
                    body += chunk.toString('utf8');
                  });

                  proxyRes.on('end', () => {
                    // Inject BASE_PATH script into HTML
                    const basePath = `/apps/${appId}`;
                    const scriptTag = `<script>window.BASE_PATH = '${basePath}';</script>`;

                    // Try to inject after <head> tag, or before </head>, or at the beginning
                    let modifiedBody = body;
                    if (body.includes('<head>')) {
                      modifiedBody = body.replace('<head>', `<head>${scriptTag}`);
                    } else if (body.includes('</head>')) {
                      modifiedBody = body.replace('</head>', `${scriptTag}</head>`);
                    } else if (body.includes('<html>')) {
                      modifiedBody = body.replace('<html>', `<html>${scriptTag}`);
                    } else {
                      modifiedBody = scriptTag + body;
                    }

                    // Update content-length and send
                    res.setHeader('content-length', Buffer.byteLength(modifiedBody, 'utf8'));
                    res.end(modifiedBody, 'utf8');
                  });
                } else {
                  // For non-HTML content, just pipe through
                  proxyRes.pipe(res);
                }
              },
              onError: (err, req, res) => {
                sails.log.error(`Proxy error for app ${appId}:`, err);
                res.status(502).json({
                  ok: false,
                  err: {
                    code: 'PROXY_ERROR',
                    msg: 'Error connecting to app'
                  },
                  data: null
                });
              },
              logLevel: 'silent' // Use Sails logger instead
            });

            // Apply proxy
            return proxy(req, res, next);
          });

          sails.log.info('Apps proxy middleware configured successfully');
        } catch (err) {
          sails.log.error('Error setting up apps proxy:', err);
        }
      });
    },
  };
};
