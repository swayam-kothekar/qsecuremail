/**
 * Key Management Routes
 * ETSI GS QKD 014 compliant endpoints
 */

import express from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All KM routes require authentication
router.use(verifyToken);

/**
 * GET /api/km/status
 * Get KM pool status (ETSI GS QKD 014 status endpoint)
 */
router.get('/status', (req, res) => {
  try {
    const { kmSimulator } = req.app.locals;
    const status = kmSimulator.getExtendedStatus();
    
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('KM status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get KM status'
    });
  }
});

/**
 * POST /api/km/replenish
 * Manually trigger pool replenishment
 */
router.post('/replenish', requireAdmin, (req, res) => {
  try {
    const { count } = req.body;
    const { kmSimulator } = req.app.locals;
    
    const replenishCount = count || 100;
    kmSimulator.replenishPool(replenishCount);
    
    const status = kmSimulator.getStatus();
    
    res.json({
      success: true,
      message: `Pool replenished with ${replenishCount} keys`,
      ...status
    });
  } catch (error) {
    console.error('KM replenish error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to replenish pool'
    });
  }
});

/**
 * POST /api/km/reset
 * Reset the key pool to initial state
 */
router.post('/reset', requireAdmin, (req, res) => {
  try {
    const { kmSimulator } = req.app.locals;
    kmSimulator.reset();
    
    const status = kmSimulator.getStatus();
    
    res.json({
      success: true,
      message: 'Pool reset successfully',
      ...status
    });
  } catch (error) {
    console.error('KM reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset pool'
    });
  }
});

/**
 * GET /api/km/enc_keys
 * ETSI GS QKD 014 enc_keys endpoint
 * Request a new key from the pool
 */
router.get('/enc_keys', requireAdmin, (req, res) => {
  try {
    const { size } = req.query;
    const { kmSimulator } = req.app.locals;
    
    const keySize = size ? parseInt(size) : 32;
    const key = kmSimulator.requestKey(keySize);
    
    res.json({
      success: true,
      ...key
    });
  } catch (error) {
    console.error('KM enc_keys error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to request key'
    });
  }
});

export default router;
