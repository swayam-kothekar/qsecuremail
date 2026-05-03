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

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Port the Express server listens on |
| `NODE_ENV` | `development` | `development` or `production` |
| `JWT_SECRET` | *(required)* | Sign JWT tokens. Generate with: `openssl rand -hex 64` |
| `ADMIN_EMAIL` | `admin@qsecuremail.local` | Email granted admin audit log access |
| `KM_POOL_SIZE` | `1000` | Keys pre-generated in the QKD pool on startup |
| `KM_REPLENISH_RATE` | `0` | Keys added per hour automatically (`0` = disabled) |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |

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
- `GET /api/email/inbox?limit=20&offset=0` - Fetch inbox (20 emails per page)

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

## Architecture Notes

- **Per-user EmailService**: Each authenticated user gets their own `EmailService` instance stored in an `emailServiceMap` keyed by email address. Logging in with a second account does not affect the first user's IMAP connection.
- **Fresh IMAP per fetch**: A new `Imap` connection is created for each inbox fetch (reusing a connection after `.end()` crashes the imap parser). A `_fetchingEmails` semaphore prevents concurrent fetches.
- **Key pool is in-memory**: The `KMSimulator` generates a new pool on every server start. Emails encrypted in a previous session will show a decryption error after restart (expected for a simulator).
- **JWT + session integrity**: `/api/auth/verify` checks both the JWT signature and whether this user's `EmailService` is initialized. If the backend restarted, the token is invalidated to force re-login.

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
