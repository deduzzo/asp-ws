module.exports = async function (req, res, proceed) {
  await sails.helpers.log.with({
    level: 'info',
    message: `Action chiamata: ${req.options.action}`,
    action: req.options.action,
    params: req.allParams(),
    ipAddress: req.ip,
    context: {
      authToken: req.headers.authorization
    }
  });

  return proceed();
};
