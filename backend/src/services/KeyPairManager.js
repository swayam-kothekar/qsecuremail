/**
 * ML-KEM-1024 Keypair Manager
 * Manages post-quantum keypairs for Level 3 encryption
 */

import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import fs from 'fs/promises';
import path from 'path';

class KeyPairManager {
  constructor(keysDir = './keys') {
    this.keysDir = keysDir;
    this.keypairs = new Map(); // email -> {publicKey, secretKey}
  }

  /**
   * Initialize the keys directory
   */
  async initialize() {
    try {
      await fs.mkdir(this.keysDir, { recursive: true });
      console.log('[KeyPairManager] Keys directory initialized');
    } catch (error) {
      console.error('[KeyPairManager] Failed to create keys directory:', error.message);
    }
  }

  /**
   * Generate a new ML-KEM-1024 keypair for a user
   * @param {string} email - User email address
   * @returns {Object} Public and secret keys (base64 encoded)
   */
  async generateKeypair(email) {
    console.log(`[KeyPairManager] Generating ML-KEM-1024 keypair for ${email}`);
    
    // Generate keypair using @noble/post-quantum
    const { publicKey, secretKey } = await ml_kem1024.keygen();
    
    const keypair = {
      email,
      publicKey: Buffer.from(publicKey).toString('base64'),
      secretKey: Buffer.from(secretKey).toString('base64'),
      timestamp: Date.now()
    };
    
    // Store in memory
    this.keypairs.set(email, keypair);
    
    // Persist to disk
    await this.saveKeypair(email, keypair);
    
    console.log(`[KeyPairManager] Keypair generated for ${email}`);
    
    return {
      publicKey: keypair.publicKey,
      secretKey: keypair.secretKey
    };
  }

  /**
   * Save keypair to disk
   */
  async saveKeypair(email, keypair) {
    try {
      const filename = this.getKeypairFilename(email);
      const filepath = path.join(this.keysDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(keypair, null, 2));
      console.log(`[KeyPairManager] Keypair saved to ${filepath}`);
    } catch (error) {
      console.error(`[KeyPairManager] Failed to save keypair for ${email}:`, error.message);
    }
  }

  /**
   * Load keypair from disk
   */
  async loadKeypair(email) {
    try {
      const filename = this.getKeypairFilename(email);
      const filepath = path.join(this.keysDir, filename);
      
      const data = await fs.readFile(filepath, 'utf8');
      const keypair = JSON.parse(data);
      
      // Store in memory
      this.keypairs.set(email, keypair);
      
      console.log(`[KeyPairManager] Keypair loaded for ${email}`);
      return keypair;
    } catch (error) {
      // File doesn't exist
      return null;
    }
  }

  /**
   * Get or generate keypair for a user
   */
  async getOrCreateKeypair(email) {
    // Check memory cache
    if (this.keypairs.has(email)) {
      return this.keypairs.get(email);
    }
    
    // Try loading from disk
    const loaded = await this.loadKeypair(email);
    if (loaded) {
      return loaded;
    }
    
    // Generate new keypair
    return await this.generateKeypair(email);
  }

  /**
   * Get public key for a user
   */
  async getPublicKey(email) {
    const keypair = await this.getOrCreateKeypair(email);
    return keypair.publicKey;
  }

  /**
   * Get secret key for a user
   */
  async getSecretKey(email) {
    const keypair = await this.getOrCreateKeypair(email);
    return keypair.secretKey;
  }

  /**
   * Check if keypair exists for a user
   */
  async hasKeypair(email) {
    if (this.keypairs.has(email)) {
      return true;
    }
    
    const loaded = await this.loadKeypair(email);
    return loaded !== null;
  }

  /**
   * Get keypair filename for an email
   */
  getKeypairFilename(email) {
    // Sanitize email for filename
    const sanitized = email.replace(/[^a-zA-Z0-9@._-]/g, '_');
    return `${sanitized}.json`;
  }

  /**
   * List all stored keypairs
   */
  async listKeypairs() {
    try {
      const files = await fs.readdir(this.keysDir);
      const keypairs = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(this.keysDir, file);
          const data = await fs.readFile(filepath, 'utf8');
          const keypair = JSON.parse(data);
          keypairs.push({
            email: keypair.email,
            timestamp: keypair.timestamp
          });
        }
      }
      
      return keypairs;
    } catch (error) {
      console.error('[KeyPairManager] Failed to list keypairs:', error.message);
      return [];
    }
  }

  /**
   * Delete keypair for a user
   */
  async deleteKeypair(email) {
    try {
      // Remove from memory
      this.keypairs.delete(email);
      
      // Remove from disk
      const filename = this.getKeypairFilename(email);
      const filepath = path.join(this.keysDir, filename);
      await fs.unlink(filepath);
      
      console.log(`[KeyPairManager] Keypair deleted for ${email}`);
      return true;
    } catch (error) {
      console.error(`[KeyPairManager] Failed to delete keypair for ${email}:`, error.message);
      return false;
    }
  }
}

export default KeyPairManager;
