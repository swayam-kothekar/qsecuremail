# QSecureMail

**A QKD-Enhanced Email System with Adaptive Security Policy Engine and Hybrid QKD⊕PQC Encryption**

Built as a reference implementation of the research paper by Swayam Kothekar, A.P. Shah Institute of Technology, Thane, Maharashtra, India.

---

## Overview

QSecureMail is a fully functional quantum-safe email client that wraps standard Gmail / IMAP accounts with three levels of post-quantum encryption, dynamically selected by an **Adaptive Security Policy Engine (ASPE)** based on real-time quantum key pool health.

The system follows the **ETSI GS QKD 014** standard for key management and implements **ML-KEM-1024** (NIST FIPS 203) for post-quantum key encapsulation.

---

## Encryption Levels

| Level | Algorithm | Security Type | Key Cost |
|-------|-----------|---------------|----------|
| **L1 — QKD-OTP** | XOR + HMAC-SHA256 | Information-theoretic (perfect secrecy) | ⌈\|m\|/32⌉ + 1 keys |
| **L2 — Quantum-Aided AES** | HKDF-SHA256 → AES-256-GCM | Computational (quantum-seeded) | 1 key |
| **L3 — Hybrid QKD⊕PQC** | ML-KEM-1024 ⊕ QKD → AES-256-GCM | Computational (dual-layer) ⭐ | 1 key |

The ASPE selects the highest feasible level based on pool health thresholds (θ₁, θ₂, θ₃). Users can also override the level manually.

---

## Architecture

```
qsecuremail/
├── backend/                        # Node.js / Express
│   ├── server.js
│   ├── keys/                       # ML-KEM keypairs (auto-generated, gitignored)
│   └── src/
│       ├── services/
│       │   ├── KMSimulator.js      # ETSI GS QKD 014 key pool simulator
│       │   ├── EncryptionEngine.js # L1 / L2 / L3 encryption & decryption
│       │   ├── ASPE.js             # Adaptive Security Policy Engine
│       │   ├── KeyPairManager.js   # ML-KEM-1024 keypair lifecycle
│       │   └── EmailService.js     # SMTP send + IMAP fetch (per-user)
│       ├── routes/
│       │   ├── auth.js             # Login / JWT verify
│       │   ├── email.js            # Send / inbox
│       │   ├── aspe.js             # ASPE status, calibrate, recommend
│       │   ├── km.js               # Key pool status / replenish / reset
│       │   └── audit.js            # Audit log
│       └── middleware/
│           └── auth.js             # JWT verification middleware
│
└── frontend/                       # React + Vite
    └── src/
        ├── pages/
        │   ├── Landing.jsx         # Feature showcase
        │   ├── Login.jsx           # Gmail + App Password auth
        │   ├── Dashboard.jsx       # Layout shell + routing
        │   └── dashboard/
        │       ├── Home.jsx        # Pool health, ASPE status, stats
        │       ├── Inbox.jsx       # Email list (20/page, Load More)
        │       ├── Compose.jsx     # Send with level selector + ASPE rec
        │       └── Settings.jsx    # ASPE config, KM controls, audit log
        ├── services/
        │   └── api.js              # Axios API client
        └── context/
            └── AuthContext.jsx     # Auth state + token management
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- A **Gmail** account with [2FA enabled](https://myaccount.google.com/security) and a [Google App Password](https://support.google.com/accounts/answer/185833) generated

### 1. Clone & install

```bash
git clone <repo-url>
cd qsecuremail/qsecuremail

# Install backend deps
cd backend && npm install && cd ..

# Install frontend deps
cd frontend && npm install && cd ..
```

### 2. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env`:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=change-this-to-a-long-random-secret
ADMIN_EMAIL=admin@qsecuremail.local
KM_POOL_SIZE=1000
KM_REPLENISH_RATE=0
CORS_ORIGIN=http://localhost:5173
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Port the Express server listens on |
| `NODE_ENV` | `development` | `development` or `production` |
| `JWT_SECRET` | *(required)* | Secret used to sign JWT tokens. Use a long random string: `openssl rand -hex 64` |
| `ADMIN_EMAIL` | `admin@qsecuremail.local` | Email address granted admin-level audit log access |
| `KM_POOL_SIZE` | `1000` | Number of QKD keys to generate in the pool on startup |
| `KM_REPLENISH_RATE` | `0` | Keys added per hour automatically. `0` = disabled |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin for CORS. Change for production |

Configure the frontend:

```bash
cp frontend/.env.example frontend/.env
```

`frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:5000/api` | Base URL of the backend API. No trailing slash. Change to your deployed backend URL in production |


### 3. Run (two terminals)

```bash
# Terminal 1 — Backend
cd qsecuremail/backend
npm run dev

# Terminal 2 — Frontend
cd qsecuremail/frontend
npm run dev
```

Open **http://localhost:5173**

---

## Usage

1. **Login** with your Gmail address and a Google App Password (not your regular password).
2. The backend creates an ML-KEM-1024 keypair for your account on first login.
3. **Compose** an email — choose Auto (ASPE), L1, L2, or L3 encryption. The ASPE recommendation updates 600 ms after you stop typing.
4. **Inbox** loads 20 emails at a time. Click **Load more emails** at the bottom for the next batch. QSecureMail-encrypted emails are automatically decrypted on the fly.
5. **Settings** lets you adjust ASPE thresholds, replenish the key pool, and view the audit log.

> **Multi-account note:** Each logged-in Gmail account gets its own isolated IMAP/SMTP connection — signing into a second account does not affect the first.

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate with email + app password, returns JWT |
| POST | `/api/auth/verify` | Verify JWT validity and IMAP session health |

### Email
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/email/send` | Send encrypted or plain email |
| GET | `/api/email/inbox?limit=20&offset=0` | Fetch paginated inbox |

### ASPE
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/aspe/status` | Current ASPE status and thresholds |
| GET | `/api/aspe/recommend` | Recommended encryption level for a given message size |
| POST | `/api/aspe/validate-level` | Validate a manual level override |
| POST | `/api/aspe/calibrate` | Auto-calibrate thresholds |

### Key Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/km/status` | Pool health, available / used keys |
| POST | `/api/km/replenish` | Add keys to the pool |
| POST | `/api/km/reset` | Reset pool to initial state |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit/recent` | Recent audit log entries |

---

## Security Notes

- The **key pool is in-memory** — it is regenerated on every server restart. Emails encrypted in a previous session cannot be decrypted after a restart (by design for a simulator; production would use persistent QKD hardware).
- JWT tokens expire after 24 hours. The `/verify` endpoint detects backend restarts and forces re-login automatically.
- The `keys/` directory (ML-KEM keypairs) is gitignored — do not commit it.
- Never commit `.env` files.

---

## Performance (from paper benchmarks)

| Level | 1 KB | 10 KB | 100 KB |
|-------|------|-------|--------|
| L1 OTP | 0.07 ms | 0.15 ms | 1.37 ms |
| L2 AES | 0.10 ms | 0.17 ms | 0.72 ms |
| L3 Hybrid | 2.51 ms | 2.23 ms | 2.68 ms |

---

## Author

**Swayam Kothekar**  
Department of Computer Engineering  
A.P. Shah Institute of Technology, Thane, Maharashtra, India

---

## License

MIT — see [LICENSE](LICENSE) for details.
