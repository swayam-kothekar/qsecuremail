/**
 * QSecureMail Encryption Engine
 * Implements three encryption levels:
 * - Level 1: Authenticated QKD-OTP
 * - Level 2: Quantum-Aided AES-256-GCM
 * - Level 3: Hybrid QKD⊕PQC
 */

import crypto from 'crypto';
import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';

class EncryptionEngine {
  constructor(kmSimulator) {
    this.km = kmSimulator;
  }

  /**
   * Derive a 32-byte key from input (ensures consistent length)
   */
  deriveKey(keyMaterial) {
    if (Buffer.isBuffer(keyMaterial)) {
      if (keyMaterial.length === 32) {
        return keyMaterial;
      }
      // Hash to get 32 bytes
      return crypto.createHash('sha256').update(keyMaterial).digest();
    }
    
    if (typeof keyMaterial === 'string') {
      // Assume base64
      const buf = Buffer.from(keyMaterial, 'base64');
      if (buf.length === 32) {
        return buf;
      }
      return crypto.createHash('sha256').update(buf).digest();
    }
    
    throw new Error('Invalid key material format');
  }

  /**
   * LEVEL 1: Authenticated QKD-OTP
   * Uses true one-time pad with HMAC-SHA256 authentication
   * Section 4.1 of paper
   */
  async encryptLevel1(plaintext) {
    const messageBuffer = Buffer.from(plaintext, 'utf8');
    const messageLength = messageBuffer.length;
    
    // Calculate required keys: ⌈|m|/32⌉ for OTP + 1 for HMAC
    const otpKeysNeeded = Math.ceil(messageLength / 32);
    const totalKeysNeeded = otpKeysNeeded + 1;
    
    console.log(`[Level 1] Message size: ${messageLength} bytes, Keys needed: ${totalKeysNeeded}`);
    
    // Request keys from KM
    const keys = this.km.requestMultipleKeys(totalKeysNeeded);
    
    if (keys.length < totalKeysNeeded) {
      throw new Error(`Insufficient keys. Need ${totalKeysNeeded}, got ${keys.length}`);
    }
    
    // Separate OTP keys and HMAC key
    const otpKeys = keys.slice(0, otpKeysNeeded);
    const hmacKey = keys[otpKeysNeeded];
    
    // Concatenate OTP key material
    const otpKeyMaterial = Buffer.concat(
      otpKeys.map(k => Buffer.from(k.keyMaterial, 'base64'))
    ).slice(0, messageLength); // Trim to exact message length
    
    // XOR encryption: c = m ⊕ k_OTP
    const ciphertext = Buffer.alloc(messageLength);
    for (let i = 0; i < messageLength; i++) {
      ciphertext[i] = messageBuffer[i] ^ otpKeyMaterial[i];
    }
    
    // HMAC authentication: τ = HMAC-SHA256(k_HMAC, c)
    const hmacKeyBuffer = Buffer.from(hmacKey.keyMaterial, 'base64');
    const hmac = crypto.createHmac('sha256', hmacKeyBuffer);
    hmac.update(ciphertext);
    const tag = hmac.digest();
    
    return {
      algorithm: 'QKD-OTP-HMAC',
      level: 1,
      keyIds: keys.map(k => k.keyId),
      ciphertext: ciphertext.toString('base64'),
      tag: tag.toString('base64'),
      keysConsumed: totalKeysNeeded
    };
  }

  /**
   * LEVEL 1: Decrypt Authenticated QKD-OTP
   */
  async decryptLevel1(encryptedData) {
    const { keyIds, ciphertext, tag } = encryptedData;
    
    if (!keyIds || keyIds.length < 2) {
      throw new Error('Invalid Level 1 payload: missing key IDs');
    }
    
    const ciphertextBuffer = Buffer.from(ciphertext, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');
    
    // Retrieve keys from KM
    const otpKeysNeeded = keyIds.length - 1;
    const otpKeys = [];
    
    for (let i = 0; i < otpKeysNeeded; i++) {
      const key = this.km.getKeyById(keyIds[i]);
      otpKeys.push(key.keyMaterial);
    }
    
    const hmacKey = this.km.getKeyById(keyIds[keyIds.length - 1]);
    
    // Verify HMAC
    const hmac = crypto.createHmac('sha256', hmacKey.keyMaterial);
    hmac.update(ciphertextBuffer);
    const computedTag = hmac.digest();
    
    if (!crypto.timingSafeEqual(computedTag, tagBuffer)) {
      throw new Error('HMAC verification failed - ciphertext may be tampered');
    }
    
    // Concatenate OTP key material
    const otpKeyMaterial = Buffer.concat(otpKeys).slice(0, ciphertextBuffer.length);
    
    // XOR decryption: m = c ⊕ k_OTP
    const plaintext = Buffer.alloc(ciphertextBuffer.length);
    for (let i = 0; i < ciphertextBuffer.length; i++) {
      plaintext[i] = ciphertextBuffer[i] ^ otpKeyMaterial[i];
    }
    
    return plaintext.toString('utf8');
  }

  /**
   * LEVEL 2: Quantum-Aided AES-256-GCM
   * Uses QKD key to derive AES key via HKDF
   * Section 4.2 of paper
   */
  async encryptLevel2(plaintext) {
    // Request single QKD key
    const qkdKey = this.km.requestKey();
    const kQKD = this.deriveKey(qkdKey.keyMaterial);
    
    // Generate salt and nonce
    const salt = crypto.randomBytes(16);
    const nonce = crypto.randomBytes(12);
    const info = Buffer.from('QSecureMail-L2-AES', 'utf8');
    
    // HKDF-SHA256 key derivation
    const kAES = crypto.hkdfSync('sha256', kQKD, salt, info, 32);
    
    // AES-256-GCM encryption
    const cipher = crypto.createCipheriv('aes-256-gcm', kAES, nonce);
    
    const messageBuffer = Buffer.from(plaintext, 'utf8');
    const ciphertext = Buffer.concat([
      cipher.update(messageBuffer),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    
    return {
      algorithm: 'QKD-AES-256-GCM',
      level: 2,
      keyId: qkdKey.keyId,
      salt: salt.toString('base64'),
      nonce: nonce.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      tag: tag.toString('base64'),
      keysConsumed: 1
    };
  }

  /**
   * LEVEL 2: Decrypt Quantum-Aided AES-256-GCM
   */
  async decryptLevel2(encryptedData) {
    const { keyId, salt, nonce, ciphertext, tag } = encryptedData;
    
    // Retrieve QKD key
    const qkdKey = this.km.getKeyById(keyId);
    const kQKD = this.deriveKey(qkdKey.keyMaterial);
    
    // Reconstruct AES key via HKDF
    const saltBuffer = Buffer.from(salt, 'base64');
    const info = Buffer.from('QSecureMail-L2-AES', 'utf8');
    const kAES = crypto.hkdfSync('sha256', kQKD, saltBuffer, info, 32);
    
    // AES-256-GCM decryption
    const nonceBuffer = Buffer.from(nonce, 'base64');
    const ciphertextBuffer = Buffer.from(ciphertext, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', kAES, nonceBuffer);
    decipher.setAuthTag(tagBuffer);
    
    const plaintext = Buffer.concat([
      decipher.update(ciphertextBuffer),
      decipher.final()
    ]);
    
    return plaintext.toString('utf8');
  }

  /**
   * LEVEL 3: Hybrid QKD⊕PQC
   * Combines ML-KEM-1024 with QKD-derived keys
   * Section 4.3 of paper
   */
  async encryptLevel3(plaintext, recipientPublicKey) {
    if (!recipientPublicKey) {
      throw new Error('Recipient ML-KEM-1024 public key required for Level 3');
    }
    
    // 1. Request QKD key
    const qkdKey = this.km.requestKey();
    const kQKD = this.deriveKey(qkdKey.keyMaterial);
    
    // 2. ML-KEM-1024 encapsulation
    const pkBuffer = Buffer.from(recipientPublicKey, 'base64');
    const { cipherText: ctKEM, sharedSecret: kPQC } = await ml_kem1024.encapsulate(pkBuffer);
    
    // 3. Key fusion: k_fused = k_QKD ⊕ k_PQC (Equation 5)
    const kFused = Buffer.alloc(32);
    for (let i = 0; i < 32; i++) {
      kFused[i] = kQKD[i] ^ kPQC[i];
    }
    
    // 4. Generate nonce
    const nonce = crypto.randomBytes(12);
    
    // 5. AES-256-GCM encryption with fused key
    const cipher = crypto.createCipheriv('aes-256-gcm', kFused, nonce);
    const messageBuffer = Buffer.from(plaintext, 'utf8');
    const ciphertext = Buffer.concat([
      cipher.update(messageBuffer),
      cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    
    return {
      algorithm: 'QKD-MLKEM1024-AES256GCM',
      level: 3,
      keyId: qkdKey.keyId,
      pqcKeyBlob: Buffer.from(ctKEM).toString('hex'),
      nonce: nonce.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      tag: tag.toString('base64'),
      keysConsumed: 1
    };
  }

  /**
   * LEVEL 3: Decrypt Hybrid QKD⊕PQC
   */
  async decryptLevel3(encryptedData, recipientSecretKey) {
    const { keyId, pqcKeyBlob, nonce, ciphertext, tag } = encryptedData;
    
    if (!recipientSecretKey) {
      throw new Error('Recipient ML-KEM-1024 secret key required for Level 3 decryption');
    }
    
    // 1. Retrieve QKD key
    const qkdKey = this.km.getKeyById(keyId);
    const kQKD = this.deriveKey(qkdKey.keyMaterial);
    
    // 2. ML-KEM-1024 decapsulation
    const ctKEM = Buffer.from(pqcKeyBlob, 'hex');
    const skBuffer = Buffer.from(recipientSecretKey, 'base64');
    const kPQC = await ml_kem1024.decapsulate(ctKEM, skBuffer);
    
    // 3. Key fusion: k_fused = k_QKD ⊕ k_PQC
    const kFused = Buffer.alloc(32);
    for (let i = 0; i < 32; i++) {
      kFused[i] = kQKD[i] ^ kPQC[i];
    }
    
    // 4. AES-256-GCM decryption
    const nonceBuffer = Buffer.from(nonce, 'base64');
    const ciphertextBuffer = Buffer.from(ciphertext, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', kFused, nonceBuffer);
    decipher.setAuthTag(tagBuffer);
    
    const plaintext = Buffer.concat([
      decipher.update(ciphertextBuffer),
      decipher.final()
    ]);
    
    return plaintext.toString('utf8');
  }

  /**
   * Unified encryption interface
   */
  async encrypt(plaintext, level, recipientPublicKey = null) {
    switch (level) {
      case 1:
        return await this.encryptLevel1(plaintext);
      case 2:
        return await this.encryptLevel2(plaintext);
      case 3:
        return await this.encryptLevel3(plaintext, recipientPublicKey);
      default:
        throw new Error(`Invalid encryption level: ${level}`);
    }
  }

  /**
   * Unified decryption interface
   */
  async decrypt(encryptedData, recipientSecretKey = null) {
    const level = encryptedData.level;
    
    switch (level) {
      case 1:
        return await this.decryptLevel1(encryptedData);
      case 2:
        return await this.decryptLevel2(encryptedData);
      case 3:
        return await this.decryptLevel3(encryptedData, recipientSecretKey);
      default:
        throw new Error(`Invalid encryption level: ${level}`);
    }
  }
}

export default EncryptionEngine;
