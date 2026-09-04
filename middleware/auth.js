const { verifyToken } = require('../utils/token');

/**
 * authenticateToken — verifies JWT from Authorization header.
 * Attaches decoded payload to req.user.
 * Returns 401 if token is missing or invalid.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
      errorCode: 'MISSING_TOKEN',
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      errorCode: 'INVALID_TOKEN',
    });
  }
};

/**
 * authorizeRoles — checks that req.user.role is among allowed roles.
 * Returns 403 if the user's role is not permitted.
 * @param  {...string} roles - allowed roles
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}.`,
        errorCode: 'FORBIDDEN',
      });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };
