<div align="center">

# 🛡️ CipherTrust

### Privacy-Preserving Regulatory Compliance on Algorand

[![Algorand](https://img.shields.io/badge/Blockchain-Algorand_TestNet-black?style=for-the-badge&logo=algorand&logoColor=white)](https://algorand.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_14-000?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![ZK Proofs](https://img.shields.io/badge/Proofs-Circom_Groth16-purple?style=for-the-badge)](https://docs.circom.io)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Docker](https://img.shields.io/badge/Backend-Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**By BlockVeritas** · Zero-knowledge proof based DPDPA compliance infrastructure

[🌐 Live Demo](https://ciphertrust.vercel.app) · [API Docs](#api-reference) · [Architecture](#system-architecture) · [Contributing](#contributing)

</div>

## Overview

CipherTrust is a full-stack, privacy-preserving regulatory compliance platform built on **Algorand**. It enables organisations to prove compliance with India's **Digital Personal Data Protection Act (DPDPA, 2023)** without ever revealing personal user data to regulators or auditors.

At its core, CipherTrust uses **zero-knowledge proofs (ZK-SNARKs)** to generate cryptographic evidence that consent records exist and are valid — and records these proofs immutably on the **Algorand blockchain** through smart contracts.

### How It Works

```
Organisation → Add Consent Data → Generate ZK Proof → Submit to Algorand
                                                          ↓
                                    Smart Contract Verifies On-Chain
                                                          ↓
                                    Regulator sees COMPLIANT ✅
                                    (without seeing ANY personal data)
```

---

## Problem Statement

India's **DPDPA (2023)** requires organisations (Data Fiduciaries) to:

1. **Collect explicit consent** before processing personal data (Section 6)
2. **Maintain verifiable records** of all consent given and withdrawn (Section 6-7)
3. **Prove compliance on demand** to the Data Protection Board of India (Section 8)
4. **Ensure data minimisation** — share only what is necessary (Section 4)

**The paradox:** How do you _prove_ you have valid consent records to a regulator _without_ revealing the personal data those records contain?

Traditional compliance audits require sharing spreadsheets of user data with regulators — violating the very privacy laws they aim to enforce.

---

## Solution

CipherTrust solves this with a three-layer cryptographic approach:

| Layer | Purpose | Technology |
|-------|---------|------------|
| **Data Layer** | Hash all personal identifiers before storage | SHA-256 + Poseidon hashing |
| **Proof Layer** | Generate mathematical proofs of consent validity | Circom 2 + Groth16 ZK-SNARKs |
| **Verification Layer** | Record proofs immutably on-chain | Algorand smart contracts + ASA certificates |

**Result:** Regulators can verify compliance with mathematical certainty, without ever seeing a single piece of personal data.

---

## Key Features

### 🔐 Privacy-First Consent Management
- User identifiers (emails, UUIDs) are **SHA-256 hashed** before storage
- Raw personal data **never touches the database**
- Consent records include type, purpose, timestamp, and expiry
- **Document upload** — attach supporting files (SHA-256 hashed on upload)
- Full revocation support with audit trail
- **Pera Wallet on-chain anchoring** — users sign anchor transactions via Pera Wallet

### 🧮 Zero-Knowledge Proof Generation
- **Circom 2** circuits with **Groth16** proving system
- Proves consent count, validity, and timestamps without revealing data
- **Auto ZK proof generation** — a proof is automatically created each time a consent record is anchored on-chain
- Mock proof mode for development (no trusted setup required)
- Full snarkjs-compatible proof format

### ⛓️ Algorand Blockchain Verification
- Proof hashes anchored on **Algorand TestNet** via smart contracts
- Compliance certificates issued as **Algorand Standard Assets (ASAs)**
- Transaction-level verification for regulators via [Lora Explorer](https://lora.algokit.io/testnet)
- Pera Wallet integration for transaction signing

### 📄 PDF Compliance Certificates
- **Downloadable PDF certificates** generated via reportlab
- Professional layout with CipherTrust branding, details table, and verification section
- Clickable Lora Explorer link for on-chain verification
- One-click download from the certificates dashboard

### 📊 Compliance Analytics Dashboard
- Real-time compliance scoring (0–100) with letter grades (A–F)
- Risk flag detection (high / medium / low severity)
- **Comprehensive stat cards** — total consents, active, anchored, revoked, proofs, certificates
- 30-day trend charts for consent and proof activity
- **Redis-cached** responses (~13ms response time)

### 🏛️ Regulator Portal
- Dedicated regulator/auditor dashboard
- Verify any organisation's compliance by ID
- Verify any proof by Algorand transaction ID
- View compliance scores across all organisations

### 🎨 Premium Enterprise UI
- Glassmorphism design system with animated particle network backgrounds
- Animated SVG logo (shield + blockchain nodes + key)
- Scroll-triggered reveal animations
- Crypto-themed micro-interactions (hash scramble, neon scan, confirmation pulses)
- Fully responsive — mobile, tablet, desktop

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Port 3000)                     │
│   Next.js 14 (App Router) + TypeScript + Tailwind CSS           │
│   ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐       │
│   │ Landing  │ │Dashboard │ │Regulator │ │ Auth Pages  │       │
│   │  Page    │ │  Suite   │ │  Portal  │ │ Login/Reg   │       │
│   └─────────┘ └──────────┘ └──────────┘ └─────────────┘       │
│        │            │             │             │               │
│   ┌─────────────────────────────────────────────┐              │
│   │   Zustand Store + Axios API Client          │              │
│   │   Pera Wallet SDK Integration               │              │
│   └─────────────────────────────────────────────┘              │
└─────────────────────────┬───────────────────────────────────────┘
                          │ REST API (JWT Auth)
┌─────────────────────────▼───────────────────────────────────────┐
│                        BACKEND (Port 8000)                      │
│   FastAPI + Python 3.11 + Async SQLAlchemy                      │
│   ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐        │
│   │Auth/Users│ │ Consent  │ │ ZK Proofs │ │Compliance│        │
│   │ Routes   │ │ Routes   │ │  Routes   │ │ Routes   │        │
│   └──────────┘ └──────────┘ └───────────┘ └──────────┘        │
│        │            │             │             │               │
│   ┌────▼────┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐         │
│   │Security │  │ Hashing │  │ZK Service│  │Analytics│         │
│   │ (JWT)   │  │(SHA-256)│  │(snarkjs) │  │ Service │         │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘         │
│                                    │                            │
│                          ┌─────────▼─────────┐                 │
│                          │  Algorand Client   │                 │
│                          │  (algosdk Python)  │                 │
│                          └─────────┬─────────┘                 │
└────────────┬───────────────────────┼────────────────────────────┘
             │                       │
    ┌────────▼────────┐    ┌────────▼────────┐
    │  PostgreSQL 15  │    │ Algorand TestNet│
    │   (Port 5432)   │    │                 │
    │  + Redis 7      │    │  Smart Contracts│
    │   (Port 6379)   │    │  + ASA Certs    │
    └─────────────────┘    └─────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | Next.js | 14.2.3 | React framework with App Router |
| | TypeScript | 5.x | Type-safe development |
| | Tailwind CSS | 3.4.3 | Utility-first styling with glassmorphism |
| | Zustand | 4.x | Lightweight state management |
| | Recharts | 2.x | Data visualisation charts |
| | Lucide React | 0.x | Icon library |
| **Backend** | FastAPI | 0.111+ | Async Python web framework |
| | SQLAlchemy | 2.x | Async ORM for PostgreSQL |
| | Alembic | 1.x | Database migrations |
| | Pydantic | 2.x | Schema validation |
| | bcrypt | 4.x | Password hashing |
| | PyJWT | 2.x | JSON Web Token auth |
| | reportlab | 4.x | PDF certificate generation |
| **Blockchain** | Algorand SDK | 2.x | Python SDK for Algorand |
| | Pera Wallet SDK | 1.x | Browser wallet integration |
| **ZK Proofs** | Circom | 2.x | Circuit compiler |
| | snarkjs | 0.7+ | Groth16 proving & verification |
| **Infrastructure** | PostgreSQL | 15 | Primary database |
| | Redis | 7 | Caching & rate limiting |
| | Docker Compose | 2.x | Container orchestration |
| | Vercel | — | Frontend hosting + Edge CDN |
| **Smart Contracts** | PyTeal + Beaker | — | Algorand contract framework |

---

## Project Structure

```
ciphertrust/
│
├── 📄 README.md                    Project documentation (this file)
├── 📄 CHANGELOG.md                 Version history
├── 📄 AGENTS.md                    AI agent configuration
├── 📄 CLAUDE.md                    Claude AI instructions
├── 📄 pyrightconfig.json           Pyright/Pylance config (suppresses false positives)
├── 📄 docker-compose.yml           Container orchestration (4 services)
├── 📄 api.http                     HTTP client test file
├── 📄 setup.sh                     Initial setup script
│
├── 🖥️  frontend/                    Next.js 14 Dashboard
│   ├── Dockerfile                  Production container (node:22-alpine)
│   ├── vercel.json                 Vercel deployment config
│   ├── package.json                Dependencies & scripts
│   ├── tailwind.config.js          Custom design tokens + 11 animations
│   ├── tsconfig.json               TypeScript configuration
│   ├── next.config.js              Next.js settings (Vercel-compatible)
│   ├── postcss.config.js           PostCSS + Tailwind
│   └── src/
│       ├── styles/
│       │   └── globals.css         Design system (glassmorphism, 15+ animations)
│       ├── components/ui/
│       │   ├── AnimatedLogo.tsx     SVG animated shield + blockchain + key
│       │   ├── Cards.tsx           StatCard, StatusBadge, EmptyState, HashDisplay
│       │   ├── ConfirmModal.tsx    Destructive action confirmation
│       │   ├── NetworkBackground.tsx Canvas particle network system
│       │   ├── Sidebar.tsx         Navigation + wallet connection
│       │   ├── Skeleton.tsx        Loading skeletons
│       │   └── Toast.tsx           Notification system
│       ├── lib/
│       │   ├── api.ts              Axios client (auth, consent, proof, compliance)
│       │   ├── store.ts            Zustand store (auth, org, wallet)
│       │   ├── useOrg.ts           Organisation context hook
│       │   └── usePeraWallet.ts    Pera Wallet integration hook
│       └── app/
│           ├── layout.tsx          Root layout (fonts, metadata)
│           ├── page.tsx            Landing page (hero, features, use cases)
│           ├── not-found.tsx       404 page
│           ├── global-error.tsx    Error boundary
│           ├── login/page.tsx      Login with particle background
│           ├── register/page.tsx   2-step registration (account + org)
│           ├── dashboard/
│           │   ├── layout.tsx      Sidebar + content layout
│           │   ├── page.tsx        Score ring, quick actions, latest cert
│           │   ├── consent/page.tsx    Consent CRUD + document upload + on-chain anchoring
│           │   ├── proofs/page.tsx     ZK proof generation + submission
│           │   ├── certificates/page.tsx  Certificate issuance + PDF download 📄
│           │   └── analytics/page.tsx    Score, counts, risk flags, trend charts
│           └── regulator/
│               ├── layout.tsx      Regulator layout
│               ├── page.tsx        All orgs overview + compliance cards
│               └── verify/page.tsx Verify by org ID or transaction ID
│
├── ⚙️  backend/                     FastAPI Server
│   ├── Dockerfile                  Python 3.11-slim container
│   ├── main.py                     App entry point + CORS + routes
│   ├── requirements.txt            Production dependencies (incl. reportlab)
│   ├── requirements-test.txt       Test dependencies (pytest, httpx)
│   ├── pyproject.toml              Project metadata
│   ├── seed.py                     Database seeding script
│   ├── alembic.ini                 Migrations config
│   ├── alembic/
│   │   ├── env.py                  Migration environment
│   │   ├── script.py.mako          Template
│   │   └── versions/
│   │       ├── 0001_initial.py     Initial schema (users, orgs, consents, proofs, certs)
│   │       └── 0002_consent_document.py  Add document_name & document_hash columns
│   ├── app/
│   │   ├── api/routes/
│   │   │   ├── auth.py             Register + login (JWT)
│   │   │   ├── orgs.py             Organisation CRUD + on-chain DID
│   │   │   ├── consent.py          Consent CRUD + anchor + revoke
│   │   │   ├── proofs.py           ZK proof generate + submit
│   │   │   ├── compliance.py       Certificates + verification + PDF download 📄
│   │   │   ├── analytics.py        Dashboard analytics
│   │   │   └── health.py           Healthcheck endpoint
│   │   ├── blockchain/
│   │   │   └── algorand_client.py  Algorand SDK wrapper (submit, verify, ASA)
│   │   ├── core/
│   │   │   ├── config.py           Pydantic settings (env vars)
│   │   │   ├── database.py         Async SQLAlchemy + sessions
│   │   │   ├── security.py         JWT + bcrypt (72-byte safe)
│   │   │   ├── middleware.py       CORS, rate limiting
│   │   │   ├── redis.py            Redis cache client
│   │   │   └── exceptions.py       Custom HTTP exceptions
│   │   ├── models/
│   │   │   └── user.py             SQLAlchemy models (User, Org, Consent, Proof, Cert)
│   │   ├── schemas/
│   │   │   └── schemas.py          Pydantic request/response schemas
│   │   └── services/
│   │       ├── zk_service.py       ZK proof orchestration (snarkjs/mock)
│   │       └── analytics_service.py Compliance scoring engine
│   └── tests/
│       └── test_api.py             Integration tests
│
├── 📜 contracts/                    Algorand Smart Contracts
│   ├── README.md                   Contract documentation
│   ├── identity.py                 DID registration contract
│   ├── consent_registry.py         Immutable consent log contract
│   ├── proof_verifier.py       ⭐  Core ZK proof verification contract
│   ├── compliance_cert.py          Certificate NFT (ASA) contract
│   └── deploy_all.py               Deployment script for all contracts
│
├── 🔒 zk-circuits/                  Zero-Knowledge Proof System
│   ├── package.json                Dependencies (circomlib, snarkjs)
│   ├── example_input.json          Sample circuit input
│   ├── circuits/
│   │   └── consent_compliance.circom   Main ZK circuit
│   └── scripts/
│       ├── setup.js                Compile circuit + trusted setup (Groth16)
│       └── generate_proof.js       Generate and verify proofs
│
└── 🤖 .github/                      GitHub Configuration
    ├── copilot-instructions.md     Copilot agent instructions
    └── skills/                     AI skill definitions (20+ skills)
```

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Docker + Docker Compose | 2.x+ | Container orchestration |
| Node.js | 20+ | ZK circuit compilation (optional) |
| Python | 3.11+ | Smart contract deployment (optional) |
| Git | 2.x+ | Version control |

### 1. Clone and configure

```bash
git clone https://github.com/Premkumar1845/CipherTrust.git
cd CipherTrust
cp .env.example .env
# Edit .env — set your ALGORAND_DEPLOYER_MNEMONIC (optional)
```

### 2. Start with Docker Compose

```bash
docker compose up -d
```

This launches 4 services:

| Service | Port | URL |
|---------|------|-----|
| PostgreSQL 15 | 5432 | — |
| Redis 7 | 6379 | — |
| FastAPI Backend | 8000 | http://localhost:8000/docs |
| Next.js Frontend | 3000 | http://localhost:3000 |

### 3. Access the application

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs) (interactive Swagger)
- **Demo credentials:**
  - Admin: `admin@acmecorp.in` / `password123`
  - Regulator: `regulator@dpdpa.gov.in` / `password123`

### 4. Set up ZK circuits (optional — one-time)

```bash
cd zk-circuits
npm install
node scripts/setup.js   # Compiles circuit, runs Groth16 trusted setup
```

> **Note:** This takes 5–10 minutes. Skip this step for mock proof mode (enabled by default).

### 5. Deploy smart contracts (optional — for Algorand TestNet)

Fund your deployer wallet at [Algorand TestNet Dispenser](https://bank.testnet.algorand.network/), then:

```bash
pip install -r backend/requirements.txt
python contracts/deploy_all.py
```

Update `.env` with the returned App IDs.

---

## API Reference

**Base URL:** `http://localhost:8000/api/v1`

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register a new user account |
| `POST` | `/auth/login` | Login and receive JWT access token |

### Organisations
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/orgs/` | Create a new organisation |
| `GET` | `/orgs/` | List all organisations |
| `GET` | `/orgs/{id}` | Get organisation details |
| `POST` | `/orgs/{id}/register-onchain` | Register DID on Algorand |

### Consent Records
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/consent/{orgId}/records` | Create consent record (auto-hashed, supports doc upload) |
| `GET` | `/consent/{orgId}/records` | List all consent records |
| `POST` | `/consent/{orgId}/records/{id}/build-anchor-txn` | Build unsigned anchor transaction for Pera Wallet |
| `POST` | `/consent/{orgId}/records/{id}/confirm-anchor` | Confirm signed anchor + auto-generate ZK proof |
| `DELETE` | `/consent/{orgId}/records/{id}` | Revoke consent (irreversible) |

### ZK Proofs
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/proofs/{orgId}/generate` | Generate ZK proof from consent records |
| `POST` | `/proofs/{orgId}/submit/{proofId}` | Verify + submit proof on-chain |
| `GET` | `/proofs/{orgId}` | List all proofs for organisation |

### Compliance & Certificates
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/compliance/{orgId}/summary` | Full compliance summary + score |
| `POST` | `/compliance/{orgId}/issue-certificate` | Issue NFT compliance certificate |
| `GET` | `/compliance/{orgId}/certificates` | List all certificates |
| `GET` | `/compliance/{orgId}/certificates/{certId}/pdf` | Download PDF certificate 📄 |
| `GET` | `/compliance/verify/{txnId}` | Public transaction verification |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/analytics/{orgId}/dashboard` | Score, risk flags, 30-day trends |

📝 **Interactive API documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## ZK Circuit Design

The `consent_compliance.circom` circuit implements a zero-knowledge proof that asserts:

> *"Organisation O has `N` active consent records of type `T`, all granted before timestamp `B`, whose hashes produce Merkle root `R`."*

### Public Inputs (on-chain, visible to regulator)
| Input | Type | Description |
|-------|------|-------------|
| `orgIdHash` | Poseidon hash | Hash of organisation ID |
| `purposeHash` | Poseidon hash | Hash of consent type |
| `timestampBound` | uint256 | Unix timestamp ceiling |
| `merkleRoot` | Poseidon hash | Merkle root of all consent hashes |
| `consentCount` | uint256 | Number of consents being proven |

### Private Inputs (never leave the prover)
| Input | Type | Description |
|-------|------|-------------|
| `consentHashes[]` | Poseidon hash[] | Individual consent record hashes |
| `timestamps[]` | uint256[] | When each consent was granted |
| `activeFlags[]` | bool[] | Whether each consent is active (not revoked) |
| `merklePathElements[][]` | hash[][] | Merkle tree sibling nodes |
| `merklePathIndices[][]` | bool[][] | Left/right path indicators |

### Proof System
- **Compiler:** Circom 2
- **Proving system:** Groth16 (succinct, constant-size proofs)
- **Curve:** BN128
- **Verification time:** ~10ms on-chain

Without the compiled circuit, the backend uses a **deterministic mock proof** in the same snarkjs Groth16 format — suitable for the full demo flow without trusted setup.

---

## Smart Contracts

| Contract | File | Purpose | Key Methods |
|----------|------|---------|-------------|
| **Identity** | `identity.py` | Org DID registration | `register_org`, `get_org_info` |
| **Consent Registry** | `consent_registry.py` | Immutable consent log | `log_consent`, `verify_consent` |
| **Proof Verifier** ⭐ | `proof_verifier.py` | ZK proof recording | `submit_proof`, `verify_proof` |
| **Compliance Cert** | `compliance_cert.py` | Certificate NFTs (ASAs) | `issue_certificate`, `revoke_certificate` |

**Fallback mode:** Without deployed App IDs in `.env`, all blockchain calls use **note-field anchoring** (0-ALGO self-payments with proof hashes in the `note` field) — fully functional for demonstration.

---

## Frontend Design

CipherTrust features a **premium enterprise-grade UI** with:

- **Glassmorphism design system** — frosted glass cards, gradient borders, depth layering
- **Animated particle network** — Canvas-based background with connecting nodes
- **Animated SVG logo** — Shield + blockchain nodes + cryptographic key with glow effects
- **15+ custom animations** — scroll-triggered reveals, hash scramble, neon scan, confirmation pulses, crypto loader, success bursts
- **Responsive design** — optimised for desktop, tablet, and mobile
- **Dark mode** — deep navy (#0B1326) base with indigo/violet/cyan accents
- **Custom fonts** — Manrope (display), Inter (body), JetBrains Mono (code)

---

## Security Model

| Aspect | Implementation |
|--------|---------------|
| **Authentication** | JWT tokens with bcrypt password hashing (72-byte safe) |
| **Data privacy** | All personal identifiers SHA-256 hashed before storage |
| **API security** | CORS middleware, rate limiting, input validation (Pydantic) |
| **Blockchain integrity** | Immutable proof records on Algorand |
| **ZK privacy** | Private inputs never leave the prover's environment |
| **Container security** | Non-root Docker containers, minimal Alpine images |

---

## Development

### Backend only (no Docker)

```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env
uvicorn main:app --reload
```

### Frontend only

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

### Full stack (Docker)

```bash
docker compose up -d --build
```

---

## Testing

### Backend integration tests

```bash
cd backend
pip install -r requirements-test.txt
pytest tests/ -v
```

### Smart contract compilation

```bash
cd contracts
pip install algokit-utils beaker-pyteal
python identity.py
python consent_registry.py
python proof_verifier.py
```

---

## Deployment

### Frontend — Vercel (recommended)

The Next.js frontend is configured for **one-click Vercel deployment**.

#### Step 1: Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repository: `Premkumar1845/CipherTrust`
3. Set **Root Directory** to `frontend`
4. Framework Preset will auto-detect **Next.js**

#### Step 2: Set Environment Variables

In Vercel → Project Settings → Environment Variables, add:

| Variable | Value | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_API_URL` | Your backend URL (e.g. `https://your-backend.onrender.com`) | ✅ |
| `NEXT_PUBLIC_ALGORAND_NETWORK` | `testnet` | Optional |

#### Step 3: Deploy

Click **Deploy** — Vercel handles build, CDN, and SSL automatically.

> **Note:** The frontend uses `--legacy-peer-deps` for installation. This is pre-configured in `vercel.json`.

---

### Backend — Docker Compose (self-hosted)

The backend (FastAPI + PostgreSQL + Redis) runs via Docker Compose on any VPS or cloud instance.

```bash
docker compose up -d --build
```

| Container | Image | Port |
|-----------|-------|------|
| `ciphertrust_postgres` | postgres:15-alpine | 5432 |
| `ciphertrust_redis` | redis:7-alpine | 6379 |
| `ciphertrust_backend` | python:3.11-slim | 8000 |
| `ciphertrust_frontend` | node:22-alpine | 3000 |

> **Tip:** When deploying the backend to a cloud host (Render, Railway, Fly.io), set the `NEXT_PUBLIC_API_URL` Vercel environment variable to your backend's public URL.

### Full Local Stack (Docker Compose)

```bash
docker compose up -d --build
```

This launches all 4 services locally:

| Service | Port | URL |
|---------|------|-----|
| PostgreSQL 15 | 5432 | — |
| Redis 7 | 6379 | — |
| FastAPI Backend | 8000 | http://localhost:8000/docs |
| Next.js Frontend | 3000 | http://localhost:3000 |

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `REDIS_URL` | Redis connection string | ✅ |
| `JWT_SECRET_KEY` | JWT signing secret | ✅ |
| `ALGORAND_ALGOD_URL` | Algorand node URL | Optional |
| `ALGORAND_DEPLOYER_MNEMONIC` | Deployer wallet mnemonic | Optional |
| `IDENTITY_APP_ID` | Identity contract App ID | Optional |
| `CONSENT_APP_ID` | Consent contract App ID | Optional |
| `VERIFIER_APP_ID` | Verifier contract App ID | Optional |
| `CERT_APP_ID` | Certificate contract App ID | Optional |

---

## Use Cases

### 🏦 Fintech (DPDPA §4-7)
Banks and payment processors proving KYC consent compliance without sharing customer data with regulators.

### 🏥 Healthcare (DISHA Ready)
Hospitals verifying patient consent for data sharing with insurance companies, without exposing medical records.

### 🌐 Web3 (Algorand Native)
DAOs and DeFi protocols demonstrating regulatory compliance while maintaining on-chain privacy for users.

---

## Roadmap

- [x] Core consent management with hashing
- [x] Document upload with SHA-256 hashing
- [x] Pera Wallet on-chain consent anchoring
- [x] Auto ZK proof generation on anchor
- [x] ZK proof generation (mock + real circuits)
- [x] Algorand blockchain integration (TestNet)
- [x] Compliance certificate issuance (ASAs)
- [x] PDF certificate download with Lora Explorer links
- [x] Regulator portal with verification
- [x] Premium glassmorphism UI with animations
- [x] Redis-cached analytics dashboard
- [x] Docker Compose deployment
- [x] Vercel frontend deployment
- [ ] Algorand MainNet deployment
- [ ] Multi-regulation support (GDPR, CCPA)
- [ ] Mobile app (React Native)
- [ ] Real-time compliance monitoring
- [ ] Organisation API keys for programmatic access

---

## Build Principle

> Focus on **1 strong ZK use case**, **1 solid smart contract**, **1 clean demo flow**. Not 10 features.

The single ZK statement — consent existence + validity — is provable, auditable, and directly maps to **DPDPA Section 6** (consent) and **Section 8** (data fiduciary obligations).

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**CipherTrust** by **BlockVeritas**

Built on [Algorand](https://algorand.com) · Powered by [Circom](https://docs.circom.io) ZK Proofs

⭐ Star this repo if you find it useful!

</div>
