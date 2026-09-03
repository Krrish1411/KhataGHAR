<div align="center">
  <h1>🏠 KhataGHAR</h1>
  <p><strong>Private-first, offline financial vault for Indian households</strong></p>

  ![Build](https://github.com/Krrish1411/KhataGHAR/actions/workflows/ci.yml/badge.svg)
  ![License](https://img.shields.io/badge/license-MIT-green)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
  ![React](https://img.shields.io/badge/React-19-61dafb)
</div>

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔒 **Encrypted Vault** | AES-256-GCM encrypted IndexedDB — all data stays on your device |
| 🎭 **Duress PIN** | Decoy Vault mode: full dummy data or mirror-scaled real data shown to observer |
| 📊 **Dashboard** | Net Worth (Total & Liquid), Cashflow Forecast, Burn Radar, Health Score |
| 🏦 **Asset & Liability Tracker** | All 10 Indian IT Schedule-AL asset classes, all 7 liability types |
| 💳 **Transactions** | Smart amount parser (`10k`, `2.5L`, `1cr`), bulk import via CSV/XLSX |
| 📄 **Rich PDF Export** | Configurable sections — cover page, dashboard, reports, assets, full journal |
| 🧮 **Debt Payoff Simulator** | Avalanche vs Snowball, opportunity cost vs SIP, inflation erosion |
| 👨‍👩‍👧 **Family Hub** | Multi-member household tracking with role-based inclusion |
| 📋 **Plans & Documents** | Planned expense tracking + encrypted document vault |
| 🌐 **Multi-Currency** | INR, USD, EUR, GBP, AED, SGD, CAD with live exchange rates |
| 📱 **PWA** | Install on desktop or mobile, works fully offline |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Development
```bash
git clone https://github.com/YOUR_USERNAME/KhataGHAR.git
cd KhataGHAR
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```bash
npm run build
# Output in dist/
```

### Preview Production Build
```bash
npm run preview
```

---

## 🏗️ Tech Stack

| Layer | Tech |
|---|---|
| Framework | React 19 + TypeScript 5.7 |
| Routing | React Router v7 |
| Styling | Tailwind CSS v3 |
| Charts | Recharts v2 |
| Storage | Dexie.js (IndexedDB) |
| Encryption | Web Crypto API (AES-GCM, PBKDF2) |
| PDF | jsPDF + jspdf-autotable |
| Excel | SheetJS (xlsx) |
| Build | Vite v6 + PWA plugin |

---

## 🔐 Privacy & Security

KhataGHAR is **100% local** — no backend, no cloud sync, no account required.

- All vault data is encrypted with AES-256-GCM using a key derived from your password via PBKDF2 (310,000 iterations, SHA-256)
- A minimum password strength score of 3/4 is enforced (entropy-based)
- **Duress PIN**: enter an alternate PIN to show scaled-down or dummy data to an observer
- **Tab-switch auto-lock**: vault auto-locks when you switch browser tabs
- **Inactivity auto-lock**: configurable idle timeout (1–60 minutes)

---

## 📁 Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── common/        # Modal, Modal portal, shared UI
│   ├── layout/        # Header, Sidebar
│   ├── security/      # Onboarding, Lock screen
│   └── transactions/  # Quick-add drawer
├── context/           # React contexts (Auth, Vault)
├── services/          # Crypto, storage, backup, demo data
├── types/             # TypeScript interfaces
└── views/             # Page-level views (Dashboard, Reports, …)
```

---

## 🤝 Contributing

1. Fork this repository
2. Create your feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feat/my-feature`
5. Open a Pull Request

Please check the PR checklist in the template before submitting.

---

## 📄 License

MIT © KhataGHAR contributors
