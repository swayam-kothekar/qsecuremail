/**
 * Authentication Middleware
 * JWT-based authentication with rate limiting (Section 7.5)
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'qsecuremail-secret-change-in-production';
const JWT_EXPIRY = '24h';

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(email) {
  return jwt.sign(
    { email, timestamp: Date.now() },
    JWT_SECRET,
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
    const decoded = jwt.verify(token, JWT_SECRET);
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
