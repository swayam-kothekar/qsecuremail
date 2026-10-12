/**
 * Authentication Routes
 * Handles user login with email and app password
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { generateToken, getJwtSecret } from '../middleware/auth.js';
import { logSecurity } from '../utils/logger.js';

const router = express.Router();

// Rate limiter for login endpoint (Section 7.5)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  skipSuccessfulRequests: true,
  validate: { xForwardedForHeader: false },
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

    const normalizedEmail = email.trim().toLowerCase();
    const cleanPassword = appPassword.trim().replace(/\s+/g, '');
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      logSecurity('login_failed', {
        reason: 'invalid_email',
        email: normalizedEmail,
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
      userService.initializeSMTP(normalizedEmail, cleanPassword);
      await userService.transporter.verify();

      // Initialize IMAP
      userService.initializeIMAP(normalizedEmail, cleanPassword);

      // Store in per-user map
      emailServiceMap.set(normalizedEmail, userService);

      // Generate or load ML-KEM keypair
      await keypairManager.getOrCreateKeypair(normalizedEmail);

      // Generate JWT token
      const token = generateToken(normalizedEmail);

      logSecurity('login_success', { email: normalizedEmail, ip: req.ip });

      res.json({
        success: true,
        token,
        email: normalizedEmail,
        message: 'Login successful'
      });

    } catch (error) {
      logSecurity('login_failed', {
        reason: 'authentication_error',
        email: normalizedEmail,
        error: error.message,
        ip: req.ip
      });

      const isBadCredentials = error.message?.includes('BadCredentials') || error.message?.includes('535');
      const isTimeout = error.code === 'ETIMEDOUT' || error.message?.toLowerCase().includes('timeout') || error.command === 'CONN';
      
      let errorMessage = error.message || 'Authentication failed. Please check your email and app password.';
      if (isBadCredentials) {
        errorMessage = 'Invalid credentials. Gmail requires a 16-character App Password (not your regular Gmail password). Generate one at https://myaccount.google.com/apppasswords';
      } else if (isTimeout) {
        errorMessage = 'Connection to Gmail timed out. Cloud hosting free tiers (like Render Free) block outbound mail ports (587, 465). Upgrade your cloud plan or run the backend locally/on a VPS.';
      }

      res.status(401).json({
        success: false,
        error: errorMessage
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
    const decoded = jwt.default.verify(token, getJwtSecret());

    // Check THIS user's service is initialized (not a global singleton)
    const { emailServiceMap } = req.app.locals;
    const userEmail = decoded.email?.toLowerCase();
    const userService = emailServiceMap.get(userEmail) || emailServiceMap.get(decoded.email);
    if (!userService?.imapConnection) {
      console.warn(`[Verify] Email service not initialized for ${decoded.email}`);
      return res.json({ valid: false, reason: 'service_reset' });
    }

    res.json({ valid: true, email: decoded.email });
  } catch (error) {
    console.error('[Verify] Token verification error:', error.message);
    res.json({ valid: false, reason: error.message });
  }
});

export default router;
