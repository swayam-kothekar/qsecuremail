/**
 * ETSI GS QKD 014 Key Management Simulator
 * Simulates a QKD Key Management System with REST API
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

class KMSimulator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.poolSize = config.poolSize || 1000;
    this.keySize = config.keySize || 32; // 256 bits
    this.keyPool = new Map();
    this.usedKeys = new Set();
    this.replenishmentRate = config.replenishmentRate || 0; // keys per hour
    this.lastReplenishment = Date.now();
    
    // Initialize the key pool
    this.initializePool();
    
    // Start auto-replenishment if configured
    if (this.replenishmentRate > 0) {
      this.startAutoReplenishment();
    }
  }

  /**
   * Initialize the quantum key pool with random keys
   */
  initializePool() {
    console.log(`[KM Simulator] Initializing pool with ${this.poolSize} keys...`);
    for (let i = 0; i < this.poolSize; i++) {
      const keyId = this.generateKeyId();
      const keyMaterial = crypto.randomBytes(this.keySize);
      
      this.keyPool.set(keyId, {
        keyId,
        keyMaterial,
        timestamp: Date.now(),
        used: false
      });
    }
    console.log(`[KM Simulator] Pool initialized with ${this.keyPool.size} keys`);
  }

  /**
   * Generate a unique key identifier
   */
  generateKeyId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get key material by key ID (ETSI GS QKD 014 enc_keys endpoint)
   * @param {string} keyId - The key identifier
   * @returns {Object} Key material and metadata
   */
  getKeyById(keyId) {
    const key = this.keyPool.get(keyId);

    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }

    // Do NOT check key.used here — decryption must always retrieve the same
    // key material used for encryption. The 'used' flag only blocks re-allocation
    // for new encryptions via requestKey() (OTP one-time-use guarantee).
    return {
      keyId: key.keyId,
      keyMaterial: key.keyMaterial,
      timestamp: key.timestamp
    };
  }


  /**
   * Request a new key from the pool (ETSI GS QKD 014 enc_keys endpoint)
   * @param {number} size - Requested key size in bytes (default: 32)
   * @returns {Object} Key ID and key material
   */
  requestKey(size = 32) {
    if (size !== this.keySize) {
      throw new Error(`Invalid key size requested. Expected ${this.keySize}, got ${size}`);
    }

    // Find an unused key
    for (const [keyId, key] of this.keyPool.entries()) {
      if (!key.used) {
        // Mark as used
        key.used = true;
        this.usedKeys.add(keyId);
        
        this.emit('keyConsumed', {
          keyId,
          availableKeys: this.getAvailableKeyCount()
        });
        
        return {
          keyId: key.keyId,
          keyMaterial: key.keyMaterial.toString('base64'),
          size: key.keyMaterial.length
        };
      }
    }
    
    throw new Error('Key pool exhausted');
  }

  /**
   * Request multiple keys at once (for Level 1 OTP)
   * @param {number} count - Number of keys to request
   * @returns {Array} Array of key objects
   */
  requestMultipleKeys(count) {
    const keys = [];
    for (let i = 0; i < count; i++) {
      try {
        keys.push(this.requestKey());
      } catch (error) {
        if (keys.length === 0) {
          throw error;
        }
        // Return partial set if pool exhausted
        console.warn(`[KM Simulator] Only ${keys.length}/${count} keys available`);
        break;
      }
    }
    return keys;
  }

  /**
   * Get pool statistics (ETSI GS QKD 014 status endpoint)
   */
  getStatus() {
    const available = this.getAvailableKeyCount();
    const used = this.usedKeys.size;
    const total = this.poolSize;
    
    return {
      poolSize: total,
      availableKeys: available,
      usedKeys: used,
      poolHealth: (available / total) * 100,
      timestamp: Date.now(),
      replenishmentRate: this.replenishmentRate
    };
  }

  /**
   * Get extended statistics for ASPE
   */
  getExtendedStatus() {
    const status = this.getStatus();
    return {
      ...status,
      keySize: this.keySize,
      lastReplenishment: this.lastReplenishment,
      poolUtilization: ((status.usedKeys / status.poolSize) * 100).toFixed(2)
    };
  }

  /**
   * Get count of available (unused) keys
   */
  getAvailableKeyCount() {
    let count = 0;
    for (const key of this.keyPool.values()) {
      if (!key.used) count++;
    }
    return count;
  }

  /**
   * Replenish the key pool (simulate QKD key generation)
   * @param {number} count - Number of keys to add
   */
  replenishPool(count = 100) {
    console.log(`[KM Simulator] Replenishing pool with ${count} keys...`);
    
    // Remove used keys to make space
    const keysToRemove = [];
    for (const [keyId, key] of this.keyPool.entries()) {
      if (key.used && keysToRemove.length < count) {
        keysToRemove.push(keyId);
      }
    }
    
    keysToRemove.forEach(keyId => {
      this.keyPool.delete(keyId);
      this.usedKeys.delete(keyId);
    });
    
    // Add new keys
    for (let i = 0; i < count; i++) {
      const keyId = this.generateKeyId();
      const keyMaterial = crypto.randomBytes(this.keySize);
      
      this.keyPool.set(keyId, {
        keyId,
        keyMaterial,
        timestamp: Date.now(),
        used: false
      });
    }
    
    this.lastReplenishment = Date.now();
    this.emit('poolReplenished', {
      count,
      availableKeys: this.getAvailableKeyCount()
    });
    
    console.log(`[KM Simulator] Pool replenished. Available: ${this.getAvailableKeyCount()}`);
  }

  /**
   * Start automatic pool replenishment
   */
  startAutoReplenishment() {
    const intervalMs = (3600 * 1000) / this.replenishmentRate; // Convert rate to interval
    
    this.replenishmentInterval = setInterval(() => {
      const available = this.getAvailableKeyCount();
      if (available < this.poolSize * 0.5) {
        const toReplenish = Math.min(this.replenishmentRate, this.poolSize - available);
        this.replenishPool(toReplenish);
      }
    }, intervalMs);
    
    console.log(`[KM Simulator] Auto-replenishment started: ${this.replenishmentRate} keys/hour`);
  }

  /**
   * Stop automatic replenishment
   */
  stopAutoReplenishment() {
    if (this.replenishmentInterval) {
      clearInterval(this.replenishmentInterval);
      this.replenishmentInterval = null;
      console.log('[KM Simulator] Auto-replenishment stopped');
    }
  }

  /**
   * Reset the pool to initial state
   */
  reset() {
    this.keyPool.clear();
    this.usedKeys.clear();
    this.initializePool();
    console.log('[KM Simulator] Pool reset');
  }

  /**
   * Verify key integrity (Section 7.6 of paper)
   * @param {Buffer} keyMaterial - The key material to verify
   * @returns {Object} Verification result
   */
  verifyKeyIntegrity(keyMaterial) {
    const checks = {
      lengthCheck: false,
      patternCheck: false,
      varianceCheck: false,
      overall: false
    };

    // 1. Length check
    if (keyMaterial.length === 32) {
      checks.lengthCheck = true;
    }

    // 2. Pattern check (reject all same byte)
    const firstByte = keyMaterial[0];
    const allSame = keyMaterial.every(byte => byte === firstByte);
    if (!allSame) {
      checks.patternCheck = true;
    }

    // 3. Byte frequency variance check
    const frequencies = new Array(256).fill(0);
    for (const byte of keyMaterial) {
      frequencies[byte]++;
    }
    
    const mean = keyMaterial.length / 256;
    const variance = frequencies.reduce((sum, freq) => {
      return sum + Math.pow(freq - mean, 2);
    }, 0) / 256;
    
    const expectedVariance = 0.1245; // For uniform distribution at n=32
    const threshold = 3 * expectedVariance;
    
    if (variance <= threshold) {
      checks.varianceCheck = true;
    }

    checks.overall = checks.lengthCheck && checks.patternCheck && checks.varianceCheck;
    
    return checks;
  }
}

export default KMSimulator;
