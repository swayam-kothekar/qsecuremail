/**
 * QSecureMail Backend Server
 * Main entry point for the application
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Services
import KMSimulator from './src/services/KMSimulator.js';
import EncryptionEngine from './src/services/EncryptionEngine.js';
import ASPE from './src/services/ASPE.js';
import KeyPairManager from './src/services/KeyPairManager.js';
import EmailService from './src/services/EmailService.js';

// Routes
import authRoutes from './src/routes/auth.js';
import emailRoutes from './src/routes/email.js';
import aspeRoutes from './src/routes/aspe.js';
import kmRoutes from './src/routes/km.js';
import auditRoutes from './src/routes/audit.js';

// Utils
import { appLogger } from './src/utils/logger.js';

// Setup directory paths

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  appLogger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Initialize services
console.log('🚀 Initializing QSecureMail Backend...\n');

// 1. KM Simulator (ETSI GS QKD 014)
console.log('[1/5] Initializing Key Management Simulator...');
const kmSimulator = new KMSimulator({
  poolSize: parseInt(process.env.KM_POOL_SIZE) || 1000,
  keySize: 32,
  replenishmentRate: parseInt(process.env.KM_REPLENISH_RATE) || 0,
  storagePath: path.join(__dirname, 'keys', 'keypool.json')
});

// 2. Encryption Engine
console.log('[2/5] Initializing Encryption Engine...');
const encryptionEngine = new EncryptionEngine(kmSimulator);

// 3. ASPE
console.log('[3/5] Initializing Adaptive Security Policy Engine...');
const aspe = new ASPE(kmSimulator, {
  configPath: path.join(__dirname, 'config', 'aspe.json')
});

// 4. KeyPair Manager
console.log('[4/5] Initializing ML-KEM-1024 KeyPair Manager...');
const keypairManager = new KeyPairManager(path.join(__dirname, 'keys'));
await keypairManager.initialize();

// 5. Email Service (per-user Map — each account gets its own instance)
console.log('[5/5] Initializing Email Service map...');
const emailServiceMap = new Map(); // email -> EmailService instance

// Store services in app.locals for access in routes
app.locals.kmSimulator = kmSimulator;
app.locals.encryptionEngine = encryptionEngine;
app.locals.aspe = aspe;
app.locals.keypairManager = keypairManager;
app.locals.emailServiceMap = emailServiceMap;

console.log('\n✅ All services initialized successfully!\n');

// Routes (mounted on both /api/* and /* for flexibility)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/email', emailRoutes);
app.use('/email', emailRoutes);

app.use('/api/aspe', aspeRoutes);
app.use('/aspe', aspeRoutes);

app.use('/api/km', kmRoutes);
app.use('/km', kmRoutes);

app.use('/api/audit', auditRoutes);
app.use('/audit', auditRoutes);

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  const kmStatus = kmSimulator.getStatus();
  const aspeStatus = aspe.getStatus();
  
  res.json({
    success: true,
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      km: {
        poolHealth: kmStatus.poolHealth,
        availableKeys: kmStatus.availableKeys
      },
      aspe: {
        currentLevel: aspeStatus.currentLevel,
        recommendedLevel: aspeStatus.recommendedLevel
      }
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'QSecureMail Backend',
    version: '1.0.0',
    description: 'A QKD-Enhanced Email System with Adaptive Security Policy Engine and Hybrid QKD⊕PQC Encryption',
    author: 'Swayam Kothekar',
    endpoints: {
      auth: '/api/auth',
      email: '/api/email',
      aspe: '/api/aspe',
      km: '/api/km',
      audit: '/api/audit',
      health: '/api/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  appLogger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🔐 QSecureMail Backend Server');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  📡 Server running on: http://localhost:${PORT}`);
  console.log(`  🔑 KM Pool Size: ${kmSimulator.poolSize} keys`);
  console.log(`  🛡️  ASPE Status: Active`);
  console.log(`  📊 Current Level: ${aspe.currentLevel}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  appLogger.info('QSecureMail Backend started', { port: PORT });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
  kmSimulator.savePoolSync();
  kmSimulator.stopAutoReplenishment();
  for (const svc of emailServiceMap.values()) svc.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  kmSimulator.savePoolSync();
  kmSimulator.stopAutoReplenishment();
  for (const svc of emailServiceMap.values()) svc.close();
  process.exit(0);
});

export default app;
