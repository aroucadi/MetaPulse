# MetaPulse 🌐

> High-Fidelity Threads / Discussions Style Community Web Application & Autonomous Agent Benchmark

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![Playwright](https://img.shields.io/badge/Tested%20with-Playwright-45ba4b.svg)](https://playwright.dev)
[![Deployed on Cloud Run](https://img.shields.io/badge/Cloud%20Run-Deployed-2496ED?logo=googlecloud)](https://metapulse-demo-365518648716.us-central1.run.app)

MetaPulse is a production-grade social community feed web application inspired by Meta Threads and modern discussion platforms. It is built with high aesthetic standards (fluid responsive UI, glassmorphism dark mode, real-time activity counters, multimedia attachments, and threaded conversations) with zero external cloud dependencies.

MetaPulse serves as the core evaluation benchmark target for **ReplayFix** (Meta Global AI Hackathon).

---

## ⚡ Quickstart (Local Run in 30 Seconds)

MetaPulse has zero external infrastructure requirements (SQLite database is auto-initialized and seeded on startup).

```bash
# 1. Clone the repository
git clone https://github.com/aroucadi/MetaPulse.git
cd MetaPulse

# 2. Install dependencies
npm install

# 3. Start the application
npm start
```

Open your browser to:
👉 **`http://localhost:3000`** (or default configured port)

Live Cloud Run deployment:
🔗 **`https://metapulse-demo-365518648716.us-central1.run.app`**

---

## 🧪 Running Playwright Contract Verification Tests

```bash
npx playwright test
```

All 6 core end-to-end user journeys pass deterministically:
1. Feed rendering & user avatar verification
2. Thread creation and inline feed injection
3. Thread liking and real-time counter increment
4. Bookmark state toggling and collection persistence
5. Search bar filtering by hashtag & text
6. Thread reply drawer and comment submission

---

## 🎯 ReplayFix 20-Bug Benchmark Suite (`RF-01` to `RF-20`)

MetaPulse contains 20 curated real-world UI/UX bugs spanning interaction race conditions, state desynchronization, DOM manipulation errors, and CSS rendering edge cases:

- **RF-01**: Quote Repost Modal TypeError crash
- **RF-02**: Optimistic Follower counter double-increment
- **RF-03**: Character counter underflow into negative numbers
- **RF-04**: Draft state loss on modal backdrop click
- **RF-05**: Rapid like click race condition desynchronization
- **RF-06**: Whitespace-only thread submission
- **RF-07**: Profile bio raw HTML injection bypass
- **RF-08**: Disabled post button remaining disabled after input
- **RF-09**: Special character search regex crash
- **RF-10**: Category dropdown reset on pagination
- **RF-11**: Tab switch stale closure event listener leak
- **RF-12**: Missing await bookmark UI persistence desync
- **RF-13**: Network error spinner endless hang
- **RF-14**: Search keystroke debouncing race condition
- **RF-15**: Silent modal closure on session token expiry
- **RF-16**: Modal backdrop z-index overlay interception
- **RF-17**: Dynamic ID selector drift in reply list
- **RF-18**: Action dropdown menu clipped by container overflow
- **RF-19**: Accessibility focus trap escape in dialog
- **RF-20**: Mobile navigation hamburger disappearance at 768px

---

## 📜 Tech Stack

- **Frontend**: Vanilla ES6+, CSS Glassmorphism Design System, Lucide icons
- **Backend**: Node.js & Express
- **Database**: SQLite3 with WAL mode (`better-sqlite3`)
- **Testing**: Playwright End-to-End Suite
- **Container**: Multi-stage Docker container ready for Google Cloud Run
