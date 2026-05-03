/**
 * Structured Logging with Winston
 * Implements dual-channel audit trail (Section 7.7)
 */

import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, json } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Security log (authentication, rate limits, key integrity)
export const securityLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/security.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: combine(timestamp(), consoleFormat)
    })
  ]
});

// Transport audit log (email send/receive events)
export const auditLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/audit.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

// Circular buffer for recent audit entries (last 100)
class AuditBuffer {
  constructor(maxSize = 100) {
    this.buffer = [];
    this.maxSize = maxSize;
  }
  
  add(entry) {
    this.buffer.push(entry);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }
  
  getAll() {
    return [...this.buffer];
  }
  
  clear() {
    this.buffer = [];
  }
}

export const auditBuffer = new AuditBuffer(100);

/**
 * Log audit event (email send/receive)
 */
export function logAudit(direction, counterpart, level, keyId, algorithm) {
  const entry = {
    timestamp: new Date().toISOString(),
    direction, // 'outgoing' or 'incoming'
    counterpart,
    level,
    keyId: keyId ? keyId.substring(0, 8) : 'N/A',
    algorithm
  };
  
  auditLogger.info(entry);
  auditBuffer.add(entry);
}

/**
 * Log security event
 */
export function logSecurity(event, details) {
  securityLogger.info({
    event,
    ...details
  });
}

// General application logger
export const appLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/app.log',
      maxsize: 10485760,
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: combine(timestamp(), consoleFormat)
    })
  ]
});
