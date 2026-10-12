/**
 * Audit Routes
 * Access to audit logs and security events
 */

import express from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { auditBuffer } from '../utils/logger.js';

const router = express.Router();

// All audit routes require authentication
router.use(verifyToken);

/**
 * GET /api/audit/log
 * Get recent audit entries (admin only)
 */
router.get('/log', requireAdmin, (req, res) => {
  try {
    const entries = auditBuffer.getAll();
    
    res.json({
      success: true,
      entries,
      count: entries.length
    });
  } catch (error) {
    console.error('Audit log error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit log'
    });
  }
});

/**
 * GET /api/audit/recent
 * Get recent audit entries for current user
 */
router.get('/recent', (req, res) => {
  try {
    const userEmail = req.user.email;
    const limit = parseInt(req.query.limit) || 20;
    
    const allEntries = auditBuffer.getAll();
    const userEntries = allEntries
      .filter(entry =>
        // Incoming: this user is the recipient (counterpart is the sender)
        (entry.direction === 'incoming' && entry.senderEmail === userEmail) ||
        // Outgoing: this user sent it
        (entry.direction === 'outgoing' && entry.senderEmail === userEmail)
      )
      .slice(-limit);
    
    res.json({
      success: true,
      entries: userEntries,
      count: userEntries.length
    });
  } catch (error) {
    console.error('Audit recent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recent audit entries'
    });
  }
});

export default router;
