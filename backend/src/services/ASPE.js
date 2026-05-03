/**
 * Adaptive Security Policy Engine (ASPE)
 * Dynamically selects encryption levels based on QKD pool health
 * Section 5 of paper
 */

import fs from 'fs/promises';
import path from 'path';

class ASPE {
  constructor(kmSimulator, config = {}) {
    this.km = kmSimulator;
    
    // Default thresholds (Section 5.2)
    this.thresholds = {
      theta1: config.theta1 || 0.70, // Level 1 threshold
      theta2: config.theta2 || 0.40, // Level 2 threshold
      theta3: config.theta3 || 0.10, // Level 3 threshold
    };
    
    // Hysteresis margin (Section 5.2)
    this.delta = config.delta || 0.10;
    
    // Current security level
    this.currentLevel = 3;
    
    // Rolling email rate tracking (Section 5.3)
    this.emailTimestamps = [];
    this.emailWindowMs = 3600 * 1000; // 1 hour
    
    // Configuration persistence
    this.configPath = config.configPath || './config/aspe.json';
    
    // Load persisted config if exists
    this.loadConfig();
  }

  /**
   * Load persisted ASPE configuration
   */
  async loadConfig() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(data);
      
      if (config.thresholds) {
        this.thresholds = config.thresholds;
      }
      if (config.delta !== undefined) {
        this.delta = config.delta;
      }
      
      console.log('[ASPE] Configuration loaded from disk');
    } catch (error) {
      // File doesn't exist or is invalid, use defaults
      console.log('[ASPE] Using default configuration');
    }
  }

  /**
   * Save ASPE configuration to disk
   */
  async saveConfig() {
    try {
      const config = {
        thresholds: this.thresholds,
        delta: this.delta,
        timestamp: Date.now()
      };
      
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      
      console.log('[ASPE] Configuration saved to disk');
    } catch (error) {
      console.error('[ASPE] Failed to save configuration:', error.message);
    }
  }

  /**
   * Record an email send event for rate tracking (Section 5.3)
   */
  recordEmailSent() {
    const now = Date.now();
    this.emailTimestamps.push(now);
    
    // Prune old timestamps (older than 1 hour)
    const cutoff = now - this.emailWindowMs;
    this.emailTimestamps = this.emailTimestamps.filter(ts => ts > cutoff);
  }

  /**
   * Calculate rolling email rate (emails per hour) - Equation 10
   */
  getRollingEmailRate() {
    const now = Date.now();
    const cutoff = now - this.emailWindowMs;
    
    // Count emails in the last hour
    const recentEmails = this.emailTimestamps.filter(ts => ts > cutoff);
    
    // Return max(count, 1) to prevent zero-threshold edge cases
    return Math.max(recentEmails.length, 1);
  }

  /**
   * Get current pool health percentage (Equation 8)
   */
  getPoolHealth() {
    const status = this.km.getStatus();
    return status.poolHealth; // Already calculated as (available/total) * 100
  }

  /**
   * ASPE Decision Policy with Hysteresis (Section 5.2, Equation 9)
   * @returns {number} Recommended encryption level (1-3)
   */
  recommendLevel() {
    const h = this.getPoolHealth() / 100; // Convert to fraction
    const { theta1, theta2, theta3 } = this.thresholds;
    
    let recommendedLevel;
    
    // Threshold-based decision
    if (h >= theta1) {
      recommendedLevel = 1;
    } else if (h > theta2 && h < theta1) {
      recommendedLevel = 2;
    } else if (h > theta3 && h <= theta2) {
      recommendedLevel = 3;
    } else {
      // h <= theta3: fallback to classical (Level 4 in paper, but we use Level 3)
      recommendedLevel = 3;
    }
    
    // Apply hysteresis for upgrades
    if (recommendedLevel < this.currentLevel) {
      // Upgrading (to higher security)
      const targetThreshold = this.getThresholdForLevel(recommendedLevel);
      if (h < targetThreshold + this.delta) {
        // Not enough margin, stay at current level
        recommendedLevel = this.currentLevel;
      }
    }
    
    // Update current level
    this.currentLevel = recommendedLevel;
    
    return recommendedLevel;
  }

  /**
   * Get threshold value for a given level
   */
  getThresholdForLevel(level) {
    switch (level) {
      case 1: return this.thresholds.theta1;
      case 2: return this.thresholds.theta2;
      case 3: return this.thresholds.theta3;
      default: return 0;
    }
  }

  /**
   * Estimate remaining pool lifetime (Section 5.5, Equation 12)
   * @param {number} level - Encryption level to estimate for
   * @returns {number} Estimated hours remaining
   */
  estimatePoolLifetime(level) {
    const status = this.km.getStatus();
    const available = status.availableKeys;
    const emailRate = this.getRollingEmailRate();
    
    // Key consumption per email at each level
    const kappa = this.getKeyConsumption(level, 10240); // Assume 10KB average
    
    if (emailRate === 0 || kappa === 0) {
      return Infinity;
    }
    
    const lifetime = available / (emailRate * kappa);
    return lifetime;
  }

  /**
   * Get key consumption per email for a given level (Equation 13)
   * @param {number} level - Encryption level
   * @param {number} messageSize - Message size in bytes
   * @returns {number} Number of keys consumed
   */
  getKeyConsumption(level, messageSize = 10240) {
    switch (level) {
      case 1:
        // κ₁ = ⌈|m|/32⌉ + 1
        return Math.ceil(messageSize / 32) + 1;
      case 2:
      case 3:
        // κ₂ = κ₃ = 1
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Calibrate thresholds based on operational parameters (Section 5.4, Equation 11)
   * @param {Object} params - Calibration parameters
   */
  calibrateThresholds(params) {
    const {
      poolSize = this.km.poolSize,
      emailRate = this.getRollingEmailRate(),
      replenishmentRate = this.km.replenishmentRate,
      minLifetime = 1 // Target minimum pool lifetime in hours
    } = params;
    
    const oldThresholds = { ...this.thresholds };
    
    // Calculate threshold for each level: h_ℓ = (T_min * (λ_email * κ_ℓ - λ_replenish)) / N
    const calculateThreshold = (level) => {
      const kappa = this.getKeyConsumption(level);
      const numerator = minLifetime * (emailRate * kappa - replenishmentRate);
      const threshold = numerator / poolSize;
      
      // Clamp to [0.05, 0.95]
      return Math.max(0.05, Math.min(0.95, threshold));
    };
    
    // Check if replenishment exceeds consumption
    const checkInfiniteLifetime = (level) => {
      const kappa = this.getKeyConsumption(level);
      return (emailRate * kappa <= replenishmentRate);
    };
    
    // Calculate new thresholds
    const newTheta1 = checkInfiniteLifetime(1) ? 0.05 : calculateThreshold(1);
    const newTheta2 = checkInfiniteLifetime(2) ? 0.05 : calculateThreshold(2);
    const newTheta3 = checkInfiniteLifetime(3) ? 0.05 : calculateThreshold(3);
    
    // Enforce ordering: θ₁ > θ₂ > θ₃
    this.thresholds.theta1 = Math.max(newTheta1, newTheta2 + 0.05, newTheta3 + 0.10);
    this.thresholds.theta2 = Math.max(newTheta2, newTheta3 + 0.05);
    this.thresholds.theta3 = newTheta3;
    
    // Persist to disk
    this.saveConfig();
    
    return {
      oldThresholds,
      newThresholds: { ...this.thresholds },
      estimatedLifetimes: {
        level1: this.estimatePoolLifetime(1),
        level2: this.estimatePoolLifetime(2),
        level3: this.estimatePoolLifetime(3)
      }
    };
  }

  /**
   * Get ASPE status for dashboard
   */
  getStatus() {
    const poolHealth = this.getPoolHealth();
    const emailRate = this.getRollingEmailRate();
    const recommendedLevel = this.recommendLevel();
    
    return {
      poolHealth: poolHealth.toFixed(2),
      emailRate,
      currentLevel: this.currentLevel,
      recommendedLevel,
      thresholds: this.thresholds,
      delta: this.delta,
      estimatedLifetimes: {
        level1: this.estimatePoolLifetime(1).toFixed(2),
        level2: this.estimatePoolLifetime(2).toFixed(2),
        level3: this.estimatePoolLifetime(3).toFixed(2)
      },
      poolStatus: this.km.getExtendedStatus()
    };
  }

  /**
   * Override mechanism (Section 5.6)
   * Validate if a manually selected level is feasible
   */
  validateLevelOverride(level, messageSize = 10240) {
    const status = this.km.getStatus();
    const keysNeeded = this.getKeyConsumption(level, messageSize);
    
    if (keysNeeded > status.availableKeys) {
      return {
        valid: false,
        reason: `Insufficient keys. Need ${keysNeeded}, available ${status.availableKeys}`
      };
    }
    
    return {
      valid: true,
      keysNeeded
    };
  }
}

export default ASPE;
