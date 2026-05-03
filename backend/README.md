# QSecureMail Backend

Backend server for QSecureMail - A QKD-Enhanced Email System with Adaptive Security Policy Engine and Hybrid QKD⊕PQC Encryption.

## Features

- **ETSI GS QKD 014 Compliant KM Simulator**: Simulates quantum key distribution
- **Three Encryption Levels**:
  - Level 1: Authenticated QKD-OTP with HMAC-SHA256
  - Level 2: Quantum-Aided AES-256-GCM
  - Level 3: Hybrid QKD⊕PQC (ML-KEM-1024 + QKD)
- **Adaptive Security Policy Engine (ASPE)**: Dynamic level selection based on pool health
- **ML-KEM-1024 Support**: Post-quantum cryptography via @noble/post-quantum
- **Email Integration**: SMTP/IMAP support for Gmail, Outlook, and generic providers
- **Security Audit Trail**: Dual-channel logging (security + transport)
- **JWT Authentication**: Token-based auth with rate limiting

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## Running

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email and app password
- `POST /api/auth/verify` - Verify JWT token

### Email
- `POST /api/email/send` - Send encrypted or normal email
- `GET /api/email/inbox` - Fetch inbox with pagination
- `GET /api/email/count` - Get total email count

### ASPE
- `GET /api/aspe/status` - Get ASPE status and recommendations
- `POST /api/aspe/calibrate` - Calibrate thresholds
- `GET /api/aspe/recommend` - Get recommended encryption level
- `POST /api/aspe/validate-level` - Validate level override

### Key Management
- `GET /api/km/status` - Get KM pool status
- `POST /api/km/replenish` - Manually replenish pool
- `POST /api/km/reset` - Reset pool to initial state
- `GET /api/km/enc_keys` - Request key (ETSI GS QKD 014)

### Audit
- `GET /api/audit/log` - Get audit log (admin only)
- `GET /api/audit/recent` - Get recent user audit entries

### Health
- `GET /api/health` - Health check endpoint

## Architecture

```
backend/
├── server.js                 # Main server entry point
├── src/
│   ├── services/
│   │   ├── KMSimulator.js    # ETSI GS QKD 014 simulator
│   │   ├── EncryptionEngine.js # Three-level encryption
│   │   ├── ASPE.js           # Adaptive Security Policy Engine
│   │   ├── KeyPairManager.js # ML-KEM-1024 keypair management
│   │   └── EmailService.js   # SMTP/IMAP integration
│   ├── routes/
│   │   ├── auth.js
│   │   ├── email.js
│   │   ├── aspe.js
│   │   ├── km.js
│   │   └── audit.js
│   ├── middleware/
│   │   └── auth.js           # JWT verification
│   └── utils/
│       └── logger.js         # Winston logging
├── config/                   # ASPE configuration
├── keys/                     # ML-KEM keypairs
└── logs/                     # Application logs
```

## Security Features

- **Rate Limiting**: 10 login attempts per 15 minutes
- **JWT Tokens**: 24-hour expiry
- **Key Integrity Verification**: Three-tier checks (length, pattern, variance)
- **Audit Logging**: All email operations logged
- **HMAC Authentication**: Level 1 OTP protected against tampering

## Paper Implementation

This implementation follows the architecture described in:

**"QSecureMail: A QKD-Enhanced Email System with Adaptive Security Policy Engine and Hybrid QKD⊕PQC Encryption"**
by Swayam Kothekar

Key sections implemented:
- Section 3: System Architecture
- Section 4: Encryption Engine (All 3 levels)
- Section 5: Adaptive Security Policy Engine
- Section 6: Security Attestation
- Section 7: Security Analysis
- Section 8: Reference Implementation

## License

MIT
