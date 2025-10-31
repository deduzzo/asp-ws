/**
 * apps/proxy.js
 *
 * Proxy requests to running Docker apps
 */

const axios = require('axios');

module.exports = async function (req, res) {
  const appId = req.param('appId');

  try {
    // Get app info
    const app = await AppsService.getAppById(appId);

    if (!app) {
      return res.ApiResponse({
        errType: 'NOT_FOUND',
        errMsg: 'App not found'
      });
    }

    if (!app.port || app.status !== 'running') {
      return res.ApiResponse({
        errType: 'NOT_FOUND',
        errMsg: 'App is not running'
      });
    }

    // Get the path after /apps/:appId/
    const appPath = req.path.replace(`/apps/${appId}`, '') || '/';
    const targetUrl = `http://localhost:${app.port}${appPath}`;

    try {
      const proxyResponse = await axios({
        method: req.method,
        url: targetUrl,
        headers: {
          ...req.headers,
          host: `localhost:${app.port}`
        },
        params: req.query,
        data: req.body,
        responseType: 'arraybuffer',
        validateStatus: () => true
      });

      // Forward response status and headers
      res.status(proxyResponse.status);

      Object.keys(proxyResponse.headers).forEach(key => {
        res.set(key, proxyResponse.headers[key]);
      });

      // Send response data
      return res.send(proxyResponse.data);

    } catch (proxyErr) {
      sails.log.error('Error proxying request:', proxyErr);
      return res.ApiResponse({
        errType: 'SERVER_ERROR',
        errMsg: 'Error connecting to app: ' + proxyErr.message
      });
    }

  } catch (err) {
    sails.log.error('Error in proxy controller:', err);
    return res.ApiResponse({
      errType: 'SERVER_ERROR',
      errMsg: 'Error proxying request: ' + err.message
    });
  }
};
