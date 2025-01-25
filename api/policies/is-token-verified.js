module.exports = async function (req, res, proceed) {
  const bearerToken = req.headers.authorization;

  if (!bearerToken || bearerToken !== "ciao" ) {
    return res.noAuth();
  }

  return proceed();
};
