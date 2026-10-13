<div align="center">
  <img src="assets/logo.svg" width="96" height="96" alt="QSecureMail Logo" />

  # QSecureMail

  **A QKD-Enhanced Email System with Adaptive Security Policy Engine and Hybrid QKD⊕PQC Encryption**

  <p>
    A quantum-safe email client that wraps standard Gmail / IMAP accounts with three tiers of post-quantum encryption, dynamically governed by an Adaptive Security Policy Engine (ASPE) based on real-time quantum key pool health and message size.
  </p>

  <p>
    <a href="https://qsecuremail.dev"><strong>Explore Live Demo »</strong></a>
  </p>

  <p>
    <a href="#overview">Overview</a> &middot;
    <a href="#encryption-levels">Encryption Levels</a> &middot;
    <a href="#system-architecture">System Architecture</a> &middot;
    <a href="#quick-start-local-development">Quick Start</a> &middot;
    <a href="#key-features--security-enhancements">Key Features</a> &middot;
    <a href="#api-reference">API Reference</a>
  </p>

  <p>
    <a href="https://qsecuremail.dev"><img src="https://img.shields.io/badge/LIVE%20DEMO-QSECUREMAIL.DEV-7c3aed?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Live Demo" /></a>
    <img src="https://img.shields.io/badge/SECURITY-ML--KEM--1024%20%2B%20QKD-059669?style=for-the-badge" alt="Security: Post-Quantum" />
    <br />
    <a href="LICENSE"><img src="https://img.shields.io/badge/LICENSE-MIT-3b82f6?style=for-the-badge" alt="License: MIT" /></a>
  </p>

  <p>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-24%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 24+" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></a>
  </p>
</div>

---

<h2 id="overview">📖 Overview</h2>

QSecureMail is a fully functional quantum-safe email client that wraps standard Gmail / IMAP accounts with three tiers of post-quantum encryption, dynamically governed by an **Adaptive Security Policy Engine (ASPE)** based on real-time quantum key pool health and message size.

The system conforms to the **ETSI GS QKD 014** standard for key management interfaces and implements **ML-KEM-1024** (NIST FIPS 203) for post-quantum key encapsulation.

---

## Encryption Levels

| Level | Algorithm | Security Classification | Key Cost |
| :--- | :--- | :--- | :--- |
| **L1 — QKD-OTP** | XOR + HMAC-SHA256 | Information-theoretic (perfect secrecy) | ⌈\|m\|/32⌉ + 1 keys |
| **L2 — Quantum-Aided AES** | HKDF-SHA256 → AES-256-GCM | Computational (quantum-seeded symmetric) | 1 key |
| **L3 — Hybrid QKD⊕PQC** | ML-KEM-1024 ⊕ QKD → AES-256-GCM | Computational (dual-layer post-quantum hybrid) | 1 key |

The ASPE engine selects the highest feasible encryption tier based on pool health thresholds ($\theta_1, \theta_2, \theta_3$). Users can also manually override the encryption tier during composition.

---

## System Architecture

```
qsecuremail/
├── backend/                        # Node.js / Express API Server
│   ├── server.js                   # Application entry point & route mounts
│   ├── keys/                       # Persistent keys (gitignored)
│   │   ├── keypool.json            # Persistent QKD key pool (ETSI GS QKD 014)
│   │   └── <email>.json            # ML-KEM-1024 user keypairs
│   └── src/
│       ├── services/
│       │   ├── KMSimulator.js      # Persistent ETSI GS QKD 014 key pool simulator
│       │   ├── EncryptionEngine.js # L1 / L2 / L3 encryption & decryption engine
│       │   ├── ASPE.js             # Adaptive Security Policy Engine
│       │   ├── KeyPairManager.js   # ML-KEM-1024 keypair lifecycle manager
│       │   └── EmailService.js     # Per-user isolated SMTP send + IMAP fetch
│       ├── routes/
│       │   ├── auth.js             # Login / JWT verify / Session management
│       │   ├── email.js            # Encrypted send / paginated inbox sync
│       │   ├── aspe.js             # ASPE status, calibration & recommendations
│       │   ├── km.js               # Key pool status, replenishment & metrics
│       │   └── audit.js            # Dual-channel audit logging
│       └── middleware/
│           └── auth.js             # JWT verification & session validation
│
├── frontend/                       # React 18 + Vite Web Application
│   └── src/
│       ├── pages/
│       │   ├── Landing.jsx         # Quantum Shield landing page
│       │   ├── Login.jsx           # Responsive Gmail + Google App Password auth
│       │   ├── Dashboard.jsx       # Layout shell & responsive navigation
│       │   └── dashboard/
│       │       ├── Home.jsx        # Real-time pool health & ASPE status dashboard
│       │       ├── Inbox.jsx       # Paginated inbox & on-the-fly decryption
│       │       ├── Compose.jsx     # Encrypted email composer with ASPE advisor
│       │       └── Settings.jsx    # ASPE policy calibration, KM replenishment & audit logs
│       ├── services/
│       │   └── api.js              # Auto-normalizing Axios client
│       └── context/
│           └── AuthContext.jsx     # Authentication state & session tokens
│
└── start.sh                        # One-command local development startup script
```

---

## Quick Start (Local Development)

### Prerequisites

- **Node.js 20+ or 24+**
- A **Gmail** account with [2-Step Verification enabled](https://myaccount.google.com/security) and a generated [Google App Password](https://support.google.com/accounts/answer/185833).

### 1. Clone & Configure

```bash
git clone https://github.com/swayam-kothekar/qsecuremail.git
cd qsecuremail

# Configure backend environment
cp backend/.env.example backend/.env

# Configure frontend environment
cp frontend/.env.example frontend/.env
```

#### Backend Configuration (`backend/.env`):
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=generate-a-strong-secret-e-g-openssl-rand-hex-64
ADMIN_EMAIL=admin@qsecuremail.local
KM_POOL_SIZE=1000
KM_REPLENISH_RATE=0
CORS_ORIGIN=http://localhost:5173
```

#### Frontend Configuration (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000/api
```

### 2. One-Command Launch

Run the startup script:
```bash
chmod +x start.sh
./start.sh
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## Production Deployment

### Why Free PaaS (Render / Railway Free) Fails for Mail
Cloud hosting free tiers actively block or blackhole outbound TCP traffic on mail ports (`25`, `465`, `587`, and `993`) to prevent spam bot creation. Connecting to Gmail from a free container will result in socket connection timeouts.

### Recommended Production Architecture
- **Frontend**: Hosted on **Vercel** (`https://qsecuremail.dev`)
- **Backend**: Hosted on an **AWS EC2** instance (Ubuntu 24.04 LTS on `t2.micro` / `t3.micro` Free Tier) or Linux VPS with open mail ports (`465`, `587`, `993`).
- **Domain & SSL**: **Cloudflare** managing `qsecuremail.dev` with an `A` record `api` pointing to the EC2 Elastic IP.

### Deploying the Backend on AWS EC2

1. **Launch EC2 Instance**:
   - Ubuntu 24.04 LTS (`t2.micro` Free Tier eligible).
   - In Security Group, allow inbound ports `22` (SSH), `80` (HTTP), and `443` (HTTPS).
   - Attach an **Elastic IP** to keep the public IPv4 static.

2. **Setup Server & Dependencies**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
   sudo apt install -y nodejs git nginx
   sudo npm install -g pm2
   ```

3. **Deploy Backend**:
   ```bash
   sudo mkdir -p /var/www && sudo chown -R ubuntu:ubuntu /var/www
   cd /var/www
   git clone https://github.com/swayam-kothekar/qsecuremail.git
   cd qsecuremail/backend
   npm install --omit=dev
   ```

4. **Configure & Start with PM2**:
   Create `.env` with production `JWT_SECRET` and `FRONTEND_URL=https://qsecuremail.dev`.
   ```bash
   pm2 start server.js --name qsecuremail-backend
   pm2 startup
   pm2 save
   ```

5. **Nginx Reverse Proxy & Cloudflare SSL**:
   In `/etc/nginx/sites-available/qsecuremail`:
   ```nginx
   server {
       listen 80;
       server_name api.qsecuremail.dev;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   Enable the site (`sudo ln -s /etc/nginx/sites-available/qsecuremail /etc/nginx/sites-enabled/`) and restart Nginx.
   In Cloudflare DNS, set `api` to **Proxied (Orange Cloud ☁️)** with SSL mode set to **Flexible** (or **Full** with Cloudflare Origin Certificate).

6. **Connect Vercel**:
   Set `VITE_API_URL` = `https://api.qsecuremail.dev/api` in your Vercel project environment variables and redeploy.

---

## Key Features & Security Enhancements

### 1. Universal & Persistent Key Pool
Unlike standard memory-only simulators, QSecureMail implements file-backed persistence (`backend/keys/keypool.json`):
- **Permanent Decryptability**: Used keys are marked `used: true` to prevent re-use (preserving the One-Time-Pad secrecy guarantee), but are permanently retained so encrypted emails can be decrypted across server reboots and deployments.
- **Auto-Maintenance**: On server boot, the pool verifies available capacity and automatically replenishes unused keys without erasing historical keys.

### 2. Isolated Multi-User Sessions
- Each authenticated email account receives an isolated, independent `EmailService` instance stored in a server-side session map. Multiple users can log in simultaneously without interfering with each other's IMAP listeners or SMTP streams.

### 3. Dual-Route Compatibility
- Backend endpoints are mounted on both `/api/*` and `/*` (e.g. `/api/auth/login` and `/auth/login`), preventing 404 errors regardless of how reverse proxies or client base URLs are formatted.

### 4. Zero Audit Vulnerabilities
- Completely purged legacy dependencies; runs on Node.js 24 native watch mode with clean, patched dependencies.

---

## API Reference

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate Gmail address + Google App Password; returns JWT |
| `POST` | `/api/auth/verify` | Verify JWT token validity and IMAP connection health |

### Email Operations
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/email/send` | Transmit encrypted or standard email via authenticated SMTP |
| `GET` | `/api/email/inbox?limit=20&offset=0` | Paginated inbox fetch with automatic on-the-fly decryption |

### Adaptive Security Policy Engine (ASPE)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/aspe/status` | Current ASPE policy status, active thresholds, and pool health |
| `GET` | `/api/aspe/recommend` | Query optimal encryption tier recommendation for message size |
| `POST` | `/api/aspe/validate-level`| Validate manual override against active safety thresholds |
| `POST` | `/api/aspe/calibrate` | Dynamically calibrate thresholds based on real-time consumption |

### Key Management (ETSI GS QKD 014)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/km/status` | Pool health percentage, available count, and consumption stats |
| `POST` | `/api/km/replenish` | Replenish key pool with fresh simulated quantum keys |
| `POST` | `/api/km/reset` | Reset pool state and regenerate fresh key material |

### Audit & System Health
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/audit/recent` | Retrieve recent cryptographic operations and audit trails |
| `GET` | `/api/health` | Comprehensive health check (KM pool, ASPE, and server status) |

---

## Academic Reference

This project is a reference implementation of the research paper:

> **"QSecureMail: A QKD-Enhanced Email System with Adaptive Security Policy Engine and Hybrid QKD⊕PQC Encryption"**  
> *Author:* Swayam Kothekar  
> *Standards Implemented:* ETSI GS QKD 014, NIST FIPS 203 (ML-KEM-1024), RFC 5246 / RFC 8446

---

## License

MIT License — see [LICENSE](LICENSE) for details.
