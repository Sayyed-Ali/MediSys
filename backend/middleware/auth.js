const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // DEBUG: show incoming auth headers (prints once per request object)
  try {
    //console.log('[auth.debug] Authorization header =', req.header('Authorization'));
    //console.log('[auth.debug] x-auth-token header    =', req.header('x-auth-token'));
  } catch (e) {
    console.warn('[auth.debug] header read error', e && e.message);
  }

  // Support both legacy x-auth-token and standard Authorization: Bearer <token>
  let token = req.header('x-auth-token');

  if (!token) {
    const authHeader = req.header('Authorization') || req.header('authorization') || '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    return res.status(401).json({ msg: 'Token is not valid' });
  }
};
