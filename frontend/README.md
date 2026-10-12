# QSecureMail — Frontend

React + Vite frontend for [QSecureMail](../README.md), a QKD-enhanced quantum-safe email client.

> 🚀 **Live Application:** [https://qsecuremail.dev](https://qsecuremail.dev)  
> 📡 **Production API:** [https://api.qsecuremail.dev](https://api.qsecuremail.dev)

## Stack

- **React 18** — UI framework
- **Vite** — dev server + bundler
- **React Router v6** — client-side routing
- **Axios** — API client
- **Lucide React** — icons

## Structure

```
src/
├── main.jsx                  # Entry point
├── App.jsx                   # Router setup
├── index.css                 # Global styles + design tokens
├── context/
│   └── AuthContext.jsx       # JWT auth state, login/logout
├── services/
│   └── api.js                # Axios instance + all API calls
└── pages/
    ├── Landing.jsx           # Public marketing / feature showcase
    ├── Login.jsx             # Gmail + App Password authentication
    ├── Dashboard.jsx         # Protected layout shell + nav
    └── dashboard/
        ├── Home.jsx          # Pool health, ASPE status, stats
        ├── Inbox.jsx         # Email list (20/page, Load More)
        ├── Compose.jsx       # Send email with encryption level selector
        └── Settings.jsx      # ASPE config, key pool, audit log
```

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:5173**

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:5000/api` | Base URL of the backend API — no trailing slash |

See `.env.example` for a ready-to-copy template.

## Key Design Decisions

- **Auth flow**: JWT token stored in `localStorage`. On every app load, `/api/auth/verify` is called — if the backend was restarted (and lost the IMAP session), the token is invalidated and the user is redirected to login.
- **Inbox pagination**: Loads 20 emails at a time via explicit "Load More" button (no infinite scroll) to prevent concurrent IMAP connections.
- **ASPE debounce**: The encryption level recommendation is fetched 600 ms after the user stops typing to avoid hammering the API on every keystroke.
- **Per-user isolation**: Each logged-in Gmail account gets a completely separate IMAP/SMTP connection on the backend — switching accounts in a different browser tab does not affect other sessions.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
