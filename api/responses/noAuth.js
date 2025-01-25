
module.exports = function noAuth() {

  const req = this.req;
  const res = this.res;

  sails.log.verbose('Ran custom response: res.unauthorized()');

  if (req.wantsJSON)
    return res.status(401).json({ message: 'not auth', ok: false });
  else
    return res.redirect('/no-auth');

};
