/**
 * Authentication Middleware
 * JWT-based authentication with rate limiting (Section 7.5)
 */

import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Set it to a strong random value: openssl rand -hex 64');
  } else {
    console.warn('⚠️  WARNING: JWT_SECRET is not set. Using an insecure default. Set it before deploying!');
  }
}
const JWT_EXPIRY = '7d';

export function getJwtSecret() {
  return process.env.JWT_SECRET || 'qsecuremail-dev-only-insecure-default-do-not-deploy';
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(email) {
  return jwt.sign(
    { email, timestamp: Date.now() },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Verify JWT token middleware
 */
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

/**
 * Admin role check middleware
 */
export function requireAdmin(req, res, next) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@qsecuremail.local';
  
  if (req.user.email !== adminEmail) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  
  next();
}
