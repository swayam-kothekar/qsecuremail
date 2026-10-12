/**
 * Email Service
 * Handles SMTP sending and IMAP receiving with QSecureMail payload embedding
 */

import nodemailer from 'nodemailer';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { EventEmitter } from 'events';

class EmailService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.transporter = null;
    this.imapConfig = null;   // stored credentials
    this.imapConnection = null; // kept for verify check only
    this._fetchingEmails = false; // prevent concurrent fetches
  }

  /**
   * Initialize SMTP transporter
   */
  initializeSMTP(userEmail, appPassword) {
    // Extract provider from email
    const domain = userEmail.split('@')[1];
    const rejectUnauthorized = process.env.IMAP_REJECT_UNAUTHORIZED === 'true';
    const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
    const isSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    
    let smtpConfig;
    if (domain.includes('gmail')) {
      smtpConfig = {
        host: 'smtp.gmail.com',
        port: smtpPort,
        secure: isSecure,
        auth: {
          user: userEmail,
          pass: appPassword
        },
        tls: {
          rejectUnauthorized
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      };
    } else if (domain.includes('outlook') || domain.includes('hotmail')) {
      smtpConfig = {
        host: 'smtp-mail.outlook.com',
        port: smtpPort,
        secure: isSecure,
        auth: {
          user: userEmail,
          pass: appPassword
        },
        tls: {
          rejectUnauthorized
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      };
    } else {
      // Generic SMTP
      smtpConfig = {
        host: `smtp.${domain}`,
        port: smtpPort,
        secure: isSecure,
        auth: {
          user: userEmail,
          pass: appPassword
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      };
    }
    
    this.transporter = nodemailer.createTransport(smtpConfig);
    console.log(`[EmailService] SMTP initialized for ${userEmail}`);
  }

  /**
   * Initialize IMAP connection
   */
  initializeIMAP(userEmail, appPassword) {
    const domain = userEmail.split('@')[1];
    // In environments with proxy, antivirus or local CA interception, allow self-signed certs unless strictly enforced
    const rejectUnauthorized = process.env.IMAP_REJECT_UNAUTHORIZED === 'true';
    const imapPort = parseInt(process.env.IMAP_PORT) || 993;

    let cfg;
    if (domain.includes('gmail')) {
      cfg = {
        user: userEmail, password: appPassword,
        host: 'imap.gmail.com', port: imapPort, tls: true,
        tlsOptions: { rejectUnauthorized },
        connTimeout: 10000,
        authTimeout: 10000
      };
    } else if (domain.includes('outlook') || domain.includes('hotmail')) {
      cfg = {
        user: userEmail, password: appPassword,
        host: 'outlook.office365.com', port: imapPort, tls: true,
        tlsOptions: { rejectUnauthorized },
        connTimeout: 10000,
        authTimeout: 10000
      };
    } else {
      // Generic fallback
      cfg = {
        user: userEmail, password: appPassword,
        host: `imap.${domain}`, port: imapPort, tls: true,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 10000,
        authTimeout: 10000
      };
    }

    this.imapConfig = cfg;
    // Create a sentinel instance so /verify can check this is initialized
    this.imapConnection = new Imap(cfg);
    console.log(`[EmailService] IMAP initialized for ${userEmail}`);
  }

  /**
   * Send a QSecureMail encrypted email
   * Embeds encrypted payload as base64 JSON in hidden div (Section 3, Transport)
   */
  async sendEncryptedEmail(from, to, subject, encryptedPayload, securityProfile) {
    if (!this.transporter) {
      throw new Error('SMTP not initialized. Please login first.');
    }
    
    // Create security attestation header (Section 6)
    const attestationHeader = this.createSecurityAttestation(securityProfile);
    
    // Embed encrypted payload in HTML
    const htmlBody = this.createEmailHTML(encryptedPayload, securityProfile);
    
    const mailOptions = {
      from,
      to,
      subject: `[QSecureMail] ${subject}`,
      html: htmlBody,
      headers: {
        'X-QSecureMail-Security-Profile': attestationHeader,
        'X-QSecureMail-Version': '1.0'
      }
    };
    
    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EmailService] Email sent: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        securityProfile
      };
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error.message);
      throw error;
    }
  }

  /**
   * Send a normal (unencrypted) email
   */
  async sendNormalEmail(from, to, subject, body) {
    if (!this.transporter) {
      throw new Error('SMTP not initialized. Please login first.');
    }
    
    const mailOptions = {
      from,
      to,
      subject,
      text: body,
      html: `<p>${body.replace(/\n/g, '<br>')}</p>`
    };
    
    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EmailService] Normal email sent: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        encrypted: false
      };
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error.message);
      throw error;
    }
  }

  /**
   * Create HTML body with embedded encrypted payload
   * Uses hidden div with base64 JSON (Section 3)
   */
  createEmailHTML(encryptedPayload, securityProfile) {
    const payloadJson = JSON.stringify(encryptedPayload);
    const payloadBase64 = Buffer.from(payloadJson).toString('base64');
    
    const levelNames = {
      1: 'QKD-OTP with HMAC',
      2: 'Quantum-Aided AES-256-GCM',
      3: 'Hybrid QKD⊕PQC (ML-KEM-1024)'
    };
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .qsecure-container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .qsecure-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .qsecure-body { background: #f7f7f7; padding: 20px; border-radius: 0 0 8px 8px; }
    .qsecure-badge { display: inline-block; background: #4CAF50; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; margin-top: 10px; }
    .qsecure-info { font-size: 14px; color: #666; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="qsecure-container">
    <div class="qsecure-header">
      <h2>🔐 QSecureMail Encrypted Message</h2>
      <p>This message is protected with quantum-safe encryption</p>
      <div class="qsecure-badge">Security Level ${securityProfile.level}: ${levelNames[securityProfile.level]}</div>
    </div>
    <div class="qsecure-body">
      <p><strong>🔒 This message is encrypted and can only be read through QSecureMail.</strong></p>
      <p>To view this message:</p>
      <ol>
        <li>Open QSecureMail application</li>
        <li>Navigate to your Inbox</li>
        <li>The message will be automatically decrypted</li>
      </ol>
      <div class="qsecure-info">
        <p><strong>Security Details:</strong></p>
        <ul>
          <li>Encryption Level: ${securityProfile.level}</li>
          <li>Algorithm: ${encryptedPayload.algorithm}</li>
          <li>Keys Consumed: ${securityProfile.keysConsumed}</li>
          <li>Timestamp: ${new Date(securityProfile.timestamp).toISOString()}</li>
        </ul>
      </div>
    </div>
  </div>
  
  <!-- Encrypted payload (hidden) -->
  <div id="qsecuremail-payload" style="display:none;" data-version="1.0">
    ${payloadBase64}
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Create security attestation header (Section 6, Figure 3)
   */
  createSecurityAttestation(securityProfile) {
    const { level, keyId, keysConsumed, algorithm, timestamp } = securityProfile;
    
    // Format: level=3 ; kid=0c30869d ; ts=1740329913 ; krate=4 ; alg=QKD-MLKEM1024-AES256GCM
    const kidFragment = keyId ? keyId.substring(0, 8) : 'N/A';
    const ts = Math.floor(timestamp / 1000);
    
    return `level=${level} ; kid=${kidFragment} ; ts=${ts} ; krate=${keysConsumed} ; alg=${algorithm}`;
  }

  /**
   * Fetch emails from IMAP inbox
   * @param {number} limit - Number of emails to fetch
   * @param {number} offset - Offset for pagination
   */
  async fetchEmails(limit = 10, offset = 0) {
    if (!this.imapConfig) {
      throw new Error('IMAP not initialized. Please login first.');
    }
    if (this._fetchingEmails) {
      return [];
    }
    this._fetchingEmails = true;

    const imap = new Imap(this.imapConfig);

    return new Promise((resolve, reject) => {
      const parsePromises = []; // track every async simpleParser call

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) { imap.end(); this._fetchingEmails = false; return reject(err); }

          const totalMessages = box.messages.total;
          if (totalMessages === 0) {
            imap.end(); this._fetchingEmails = false; return resolve([]);
          }

          const start = Math.max(1, totalMessages - offset - limit + 1);
          const end = totalMessages - offset;

          if (start > end) {
            imap.end(); this._fetchingEmails = false; return resolve([]);
          }

          const fetch = imap.seq.fetch(`${start}:${end}`, { bodies: '', struct: true });

          fetch.on('message', (msg, seqno) => {
            // Each message parse is a Promise — collected so we can await all
            const p = new Promise((resolveMsg) => {
              let emailData = { seqno };
              msg.on('body', (stream) => {
                simpleParser(stream, (err, parsed) => {
                  if (err) { console.error('Error parsing email:', err); return resolveMsg(null); }
                  emailData = {
                    ...emailData,
                    from: parsed.from?.text || 'Unknown',
                    to: parsed.to?.text || 'Unknown',
                    subject: parsed.subject || '(No Subject)',
                    date: parsed.date || new Date(),
                    messageId: parsed.messageId,
                    text: parsed.text,
                    html: parsed.html,
                    headers: parsed.headers
                  };
                  const isQSecure = this.extractQSecurePayload(parsed.html);
                  if (isQSecure) {
                    emailData.encrypted = true;
                    emailData.encryptedPayload = isQSecure.payload;
                    emailData.securityProfile = isQSecure.profile;
                  } else {
                    emailData.encrypted = false;
                  }
                  resolveMsg(emailData);
                });
              });
              msg.once('end', () => {
                // if body event never fired (e.g. empty message), resolve null
              });
            });
            parsePromises.push(p);
          });

          fetch.once('error', (err) => {
            console.error('Fetch error:', err);
            this._fetchingEmails = false;
            reject(err);
          });

          fetch.once('end', async () => {
            imap.end();
            // Wait for ALL simpleParser calls to finish before resolving
            const results = await Promise.all(parsePromises);
            const emails = results
              .filter(Boolean) // drop nulls from parse errors
              .sort((a, b) => new Date(b.date) - new Date(a.date));
            this._fetchingEmails = false;
            resolve(emails);
          });
        });
      });

      imap.once('error', (err) => {
        console.error('IMAP connection error:', err);
        this._fetchingEmails = false;
        reject(err);
      });

      imap.connect();
    });
  }

  /**
   * Extract QSecureMail encrypted payload from HTML
   */
  extractQSecurePayload(html) {
    if (!html) return null;
    
    try {
      // Look for the hidden div with encrypted payload
      const match = html.match(/<div id="qsecuremail-payload"[^>]*>([\s\S]*?)<\/div>/);
      if (!match) return null;
      
      const payloadBase64 = match[1].trim();
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);
      
      // Extract security profile from headers if available
      const profileMatch = html.match(/Security Level (\d+):/);
      const level = profileMatch ? parseInt(profileMatch[1]) : payload.level;
      
      return {
        payload,
        profile: {
          level,
          algorithm: payload.algorithm,
          keysConsumed: payload.keysConsumed || 1
        }
      };
    } catch (error) {
      console.error('Failed to extract QSecure payload:', error.message);
      return null;
    }
  }

  /**
   * Close connections
   */
  close() {
    if (this.imapConnection) {
      this.imapConnection.end();
    }
  }
}

export default EmailService;
