/**
 * ETSI GS QKD 014 Key Management Simulator
 * Simulates a QKD Key Management System with REST API
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

class KMSimulator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.poolSize = config.poolSize || 1000;
    this.keySize = config.keySize || 32; // 256 bits
    this.storagePath = config.storagePath || path.join(process.cwd(), 'keys', 'keypool.json');
    this.keyPool = new Map();
    this.usedKeys = new Set();
    this.replenishmentRate = config.replenishmentRate || 0; // keys per hour
    this.lastReplenishment = Date.now();
    this.saveTimer = null;
    
    // Initialize or restore the key pool from persistent disk storage
    this.initializePool();
    
    // Start auto-replenishment if configured
    if (this.replenishmentRate > 0) {
      this.startAutoReplenishment();
    }
  }

  /**
   * Initialize the quantum key pool, loading from disk if available
   */
  initializePool() {
    try {
      if (this.storagePath && fs.existsSync(this.storagePath)) {
        console.log(`[KM Simulator] Loading persistent key pool from ${this.storagePath}...`);
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const data = JSON.parse(raw);

        if (data && data.keys) {
          for (const [keyId, keyData] of Object.entries(data.keys)) {
            const isUsed = Boolean(keyData.used);
            this.keyPool.set(keyId, {
              keyId: keyData.keyId,
              keyMaterial: Buffer.from(keyData.keyMaterial, 'base64'),
              timestamp: keyData.timestamp || Date.now(),
              used: isUsed
            });
            if (isUsed) {
              this.usedKeys.add(keyId);
            }
          }
          if (data.lastReplenishment) {
            this.lastReplenishment = data.lastReplenishment;
          }
        }

        const available = this.getAvailableKeyCount();
        console.log(`[KM Simulator] Persistent pool loaded: ${this.keyPool.size} total keys (${available} available, ${this.usedKeys.size} used)`);

        // If available keys are below target poolSize, generate additional keys to maintain capacity
        if (available < this.poolSize) {
          const needed = this.poolSize - available;
          console.log(`[KM Simulator] Generating ${needed} new keys to maintain pool target size of ${this.poolSize}...`);
          for (let i = 0; i < needed; i++) {
            const keyId = this.generateKeyId();
            const keyMaterial = crypto.randomBytes(this.keySize);
            this.keyPool.set(keyId, {
              keyId,
              keyMaterial,
              timestamp: Date.now(),
              used: false
            });
          }
          this.savePoolSync();
        }
        return;
      }
    } catch (err) {
      console.warn(`[KM Simulator] Failed to load key pool from disk, initializing fresh pool: ${err.message}`);
    }

    console.log(`[KM Simulator] Initializing fresh pool with ${this.poolSize} keys...`);
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
    console.log(`[KM Simulator] Fresh pool initialized with ${this.keyPool.size} keys`);
    this.savePoolSync();
  }

  /**
   * Save the current key pool to disk synchronously
   */
  savePoolSync() {
    if (!this.storagePath) return;
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const serializedKeys = {};
      for (const [keyId, key] of this.keyPool.entries()) {
        serializedKeys[keyId] = {
          keyId: key.keyId,
          keyMaterial: key.keyMaterial.toString('base64'),
          timestamp: key.timestamp,
          used: key.used
        };
      }

      const payload = {
        poolSize: this.poolSize,
        keySize: this.keySize,
        lastReplenishment: this.lastReplenishment,
        updatedAt: Date.now(),
        keys: serializedKeys
      };

      const tmpPath = `${this.storagePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.storagePath);
    } catch (err) {
      console.error(`[KM Simulator] Error saving key pool to disk: ${err.message}`);
    }
  }

  /**
   * Schedule debounced save to prevent excessive disk writes
   */
  scheduleSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.savePoolSync();
    }, 200);
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
        this.scheduleSave();
        
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
    
    // Add new keys without deleting used keys (used keys must be kept to allow decryption of past emails)
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
    this.savePoolSync();

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
    this.savePoolSync();
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
