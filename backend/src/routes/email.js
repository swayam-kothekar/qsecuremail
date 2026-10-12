/**
 * Email Routes
 * Handles sending and receiving emails
 */

import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { logAudit } from '../utils/logger.js';

const router = express.Router();

// All email routes require authentication
router.use(verifyToken);

/**
 * POST /api/email/send
 * Send an encrypted or normal email
 */
router.post('/send', async (req, res) => {
  try {
    const { to, subject, body, level, isEncrypted } = req.body;
    const from = req.user.email;
    
    if (!to || !body) {
      return res.status(400).json({
        success: false,
        error: 'Recipient and body are required'
      });
    }
    
    const { emailServiceMap, encryptionEngine, aspe, keypairManager } = req.app.locals;
    const emailService = emailServiceMap.get(from);
    if (!emailService) {
      return res.status(401).json({ success: false, error: 'Email service not initialized. Please login again.' });
    }

    // Send normal email
    if (!isEncrypted || level === 0) {
      const result = await emailService.sendNormalEmail(from, to, subject || '(No Subject)', body);
      
      return res.json({
        success: true,
        ...result
      });
    }
    
    // Send encrypted email
    const selectedLevel = level || aspe.recommendLevel();
    
    // Validate level override
    const validation = aspe.validateLevelOverride(selectedLevel, body.length);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.reason
      });
    }
    
    // Get recipient's public key for Level 3
    let recipientPublicKey = null;
    if (selectedLevel === 3) {
      try {
        recipientPublicKey = await keypairManager.getPublicKey(to);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: `Recipient ${to} does not have a Level 3 keypair. They must login to QSecureMail first.`
        });
      }
    }
    
    // Encrypt the message
    const encryptedPayload = await encryptionEngine.encrypt(
      body,
      selectedLevel,
      recipientPublicKey
    );
    
    // Create security profile
    const securityProfile = {
      level: selectedLevel,
      algorithm: encryptedPayload.algorithm,
      keyId: encryptedPayload.keyId || encryptedPayload.keyIds?.[0] || 'N/A',
      keysConsumed: encryptedPayload.keysConsumed,
      timestamp: Date.now()
    };
    
    // Send email
    const result = await emailService.sendEncryptedEmail(
      from,
      to,
      subject || '(No Subject)',
      encryptedPayload,
      securityProfile
    );
    
    // Record email sent for ASPE
    aspe.recordEmailSent();
    
    // Log audit
    logAudit('outgoing', to, selectedLevel, securityProfile.keyId, encryptedPayload.algorithm, from);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
});

/**
 * GET /api/email/inbox
 * Fetch emails from inbox with pagination
 */
router.get('/inbox', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    const { emailServiceMap, encryptionEngine, keypairManager } = req.app.locals;
    const userEmail = req.user.email;
    const emailService = emailServiceMap.get(userEmail);
    if (!emailService) {
      return res.status(401).json({ success: false, error: 'Email service not initialized. Please login again.' });
    }

    // Fetch emails from IMAP
    const emails = await emailService.fetchEmails(limit, offset);
    
    // Decrypt QSecureMail messages
    const processedEmails = await Promise.all(
      emails.map(async (email) => {
        if (email.encrypted && email.encryptedPayload) {
          try {
            // Get user's secret key for Level 3
            let secretKey = null;
            if (email.encryptedPayload.level === 3) {
              secretKey = await keypairManager.getSecretKey(userEmail);
            }
            
            // Decrypt
            const decryptedBody = await encryptionEngine.decrypt(
              email.encryptedPayload,
              secretKey
            );
            
            // Log audit
            logAudit(
              'incoming',
              email.from,
              email.encryptedPayload.level,
              email.encryptedPayload.keyId || email.encryptedPayload.keyIds?.[0],
              email.encryptedPayload.algorithm,
              userEmail
            );
            
            return {
              ...email,
              body: decryptedBody,
              decrypted: true
            };
          } catch (error) {
            console.error('Decryption error:', error);
            return {
              ...email,
              body: '[Decryption failed]',
              decrypted: false,
              decryptionError: error.message
            };
          }
        } else {
          // Normal email
          return {
            ...email,
            body: email.text || email.html || '',
            decrypted: false
          };
        }
      })
    );
    
    res.json({
      success: true,
      emails: processedEmails,
      count: processedEmails.length,
      limit,
      offset
    });
    
  } catch (error) {
    console.error('Fetch inbox error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch emails'
    });
  }
});

/**
 * GET /api/email/count
 * Get total email count for pagination
 */
router.get('/count', async (req, res) => {
  try {
    const { emailServiceMap } = req.app.locals;
    const userEmail = req.user.email;
    const emailService = emailServiceMap.get(userEmail);

    if (!emailService) {
      return res.status(401).json({ success: false, error: 'Email service not initialized. Please login again.' });
    }

    if (!emailService.imapConfig) {
      return res.status(401).json({ success: false, error: 'IMAP not initialized. Please login again.' });
    }

    const Imap = (await import('imap')).default;
    const imap = new Imap(emailService.imapConfig);

    const total = await new Promise((resolve, reject) => {
      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          imap.end();
          if (err) return reject(err);
          resolve(box.messages.total);
        });
      });
      imap.once('error', reject);
      imap.connect();
    });

    res.json({ success: true, total });

  } catch (error) {
    console.error('Get count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get email count'
    });
  }
});

export default router;
