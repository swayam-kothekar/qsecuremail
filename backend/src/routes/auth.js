/**
 * Authentication Routes
 * Handles user login with email and app password
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { generateToken } from '../middleware/auth.js';
import { logSecurity } from '../utils/logger.js';

const router = express.Router();

// Rate limiter for login endpoint (Section 7.5)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logSecurity('rate_limit_exceeded', {
      ip: req.ip,
      endpoint: '/api/auth/login'
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again later.'
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and app password
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, appPassword } = req.body;
    
    if (!email || !appPassword) {
      logSecurity('login_failed', {
        reason: 'missing_credentials',
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: 'Email and app password are required'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logSecurity('login_failed', {
        reason: 'invalid_email',
        email,
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
    
    // Initialize email service for this user
    const { emailServiceMap, keypairManager } = req.app.locals;

    try {
      // Create (or replace) a fresh EmailService for this user
      const EmailService = (await import('../services/EmailService.js')).default;
      const userService = new EmailService();

      // Test SMTP connection
      userService.initializeSMTP(email, appPassword);
      await userService.transporter.verify();

      // Initialize IMAP
      userService.initializeIMAP(email, appPassword);

      // Store in per-user map
      emailServiceMap.set(email, userService);

      // Generate or load ML-KEM keypair
      await keypairManager.getOrCreateKeypair(email);

      // Generate JWT token
      const token = generateToken(email);

      logSecurity('login_success', { email, ip: req.ip });

      res.json({
        success: true,
        token,
        email,
        message: 'Login successful'
      });

    } catch (error) {
      logSecurity('login_failed', {
        reason: 'authentication_error',
        email,
        error: error.message,
        ip: req.ip
      });

      res.status(401).json({
        success: false,
        error: 'Authentication failed. Please check your email and app password.'
      });
    }
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify token AND that this user's email service is initialized.
 */
router.post('/verify', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ valid: false });
  }

  const token = authHeader.substring(7);

  try {
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'qsecuremail-secret-change-in-production';
    const decoded = jwt.default.verify(token, JWT_SECRET);

    // Check THIS user's service is initialized (not a global singleton)
    const { emailServiceMap } = req.app.locals;
    const userService = emailServiceMap.get(decoded.email);
    if (!userService?.imapConnection) {
      return res.json({ valid: false, reason: 'service_reset' });
    }

    res.json({ valid: true, email: decoded.email });
  } catch (error) {
    res.json({ valid: false });
  }
});

export default router;
