/**
 * ASPE Routes
 * Adaptive Security Policy Engine status and configuration
 */

import express from 'express';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// All ASPE routes require authentication
router.use(verifyToken);

/**
 * GET /api/aspe/status
 * Get current ASPE status and recommendations
 */
router.get('/status', (req, res) => {
  try {
    const { aspe } = req.app.locals;
    const status = aspe.getStatus();
    
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('ASPE status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ASPE status'
    });
  }
});

/**
 * POST /api/aspe/calibrate
 * Calibrate ASPE thresholds based on operational parameters
 */
router.post('/calibrate', (req, res) => {
  try {
    const { aspe } = req.app.locals;
    const params = req.body;
    
    const result = aspe.calibrateThresholds(params);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('ASPE calibration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calibrate ASPE'
    });
  }
});

/**
 * GET /api/aspe/recommend
 * Get recommended encryption level
 */
router.get('/recommend', (req, res) => {
  try {
    const { aspe } = req.app.locals;
    const messageSize = parseInt(req.query.messageSize) || 10240;
    
    const recommendedLevel = aspe.recommendLevel();
    const validation = aspe.validateLevelOverride(recommendedLevel, messageSize);
    
    res.json({
      success: true,
      recommendedLevel,
      validation,
      poolHealth: aspe.getPoolHealth(),
      emailRate: aspe.getRollingEmailRate()
    });
  } catch (error) {
    console.error('ASPE recommend error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendation'
    });
  }
});

/**
 * POST /api/aspe/validate-level
 * Validate if a manually selected level is feasible
 */
router.post('/validate-level', (req, res) => {
  try {
    const { level, messageSize } = req.body;
    const { aspe } = req.app.locals;
    
    if (!level || level < 1 || level > 3) {
      return res.status(400).json({
        success: false,
        error: 'Invalid level. Must be 1, 2, or 3.'
      });
    }
    
    const validation = aspe.validateLevelOverride(level, messageSize || 10240);
    
    res.json({
      success: true,
      level,
      ...validation
    });
  } catch (error) {
    console.error('ASPE validate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate level'
    });
  }
});

export default router;
