# Changelog

All notable changes to CipherTrust are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — Initial Release

### Added

#### Backend (FastAPI)
- `main.py` — FastAPI application with lifespan management, CORS, and router registration
- `app/core/config.py` — Pydantic-settings configuration with `.env` support
- `app/core/database.py` — Async SQLAlchemy engine, session factory, and `Base`
- `app/core/redis.py` — Async Redis client with init/close lifecycle
- `app/core/security.py` — JWT creation/verification, bcrypt password hashing, `get_current_user` dependency
- `app/core/middleware.py` — Request ID injection, structured logging, `X-Response-Time` header
- `app/core/exceptions.py` — Global handlers for `IntegrityError`, `OperationalError`, `ValueError`, unhandled exceptions
- `app/models/user.py` — SQLAlchemy models: `User`, `Organization`, `ConsentRecord`, `ZKProof`, `ComplianceCertificate`
- `app/schemas/schemas.py` — Pydantic v2 request/response schemas for all entities
- `app/api/routes/auth.py` — `/register`, `/login`, `/me`, `/me/org/{id}`
- `app/api/routes/orgs.py` — `/`, `/{id}`, `/{id}/register-onchain`
- `app/api/routes/consent.py` — `/records` CRUD, `/anchor`, revoke
- `app/api/routes/proofs.py` — `/generate`, `/submit/{proof_id}`, list, get
- `app/api/routes/compliance.py` — `/summary`, `/issue-certificate`, `/certificates`, `/verify/{txn_id}`
- `app/api/routes/analytics.py` — `/score`, `/risk-flags`, `/trend`, `/dashboard`
- `app/api/routes/health.py` — `/health` liveness endpoint
- `app/blockchain/algorand_client.py` — Algorand node + indexer client, note-field anchoring, contract calls for all 4 contracts
- `app/services/zk_service.py` — ZK proof orchestration: mock Groth16 proof generation, snarkjs subprocess integration, off-chain verification
- `app/services/analytics_service.py` — 5-dimension compliance score engine, risk flag detection, 30-day activity trends
- `alembic/` — Async Alembic migration setup with initial schema migration
- `seed.py` — Demo data seeder: org, 2 users, 5 consent records
- `tests/test_api.py` — Async pytest suite covering auth, org, consent, proof, and full end-to-end flow

#### Algorand Smart Contracts (PyTeal + Beaker)
- `contracts/identity.py` — Organisation DID registration with Box storage
- `contracts/consent_registry.py` — Immutable consent hash log, idempotent logging
- `contracts/proof_verifier.py` — ZK proof hash + off-chain verification result storage ⭐
- `contracts/compliance_cert.py` — Certificate issuance and revocation tracking
- `contracts/deploy_all.py` — TestNet deployment helper script

#### ZK Circuits (Circom 2 + SnarkJS)
- `zk-circuits/circuits/consent_compliance.circom` — Groth16 circuit proving N active consents with Merkle inclusion proofs
- `zk-circuits/scripts/setup.js` — Powers of Tau download, circuit compilation, trusted setup
- `zk-circuits/scripts/generate_proof.js` — Witness generation, proof generation, local verification
- `zk-circuits/example_input.json` — Example circuit input with 3 active consents

#### Frontend (Next.js 14 + TypeScript + Tailwind)
- `src/app/page.tsx` — Landing page with hero, features, demo flow
- `src/app/login/page.tsx` — Login page with demo credential hints
- `src/app/register/page.tsx` — 2-step registration: account + organisation
- `src/app/dashboard/page.tsx` — Org overview: score ring, stats, quick actions, latest certificate
- `src/app/dashboard/consent/page.tsx` — Consent management with inline form, anchor action, revoke with confirm modal
- `src/app/dashboard/proofs/page.tsx` — ZK proof generation, submission pipeline, public inputs viewer
- `src/app/dashboard/certificates/page.tsx` — Certificate issuance and list
- `src/app/dashboard/analytics/page.tsx` — Score gauge, risk flags, recharts bar + line trend charts
- `src/app/regulator/page.tsx` — All-orgs compliance overview for regulators
- `src/app/regulator/verify/page.tsx` — Verify by org ID or Algorand transaction ID
- `src/app/global-error.tsx` — Next.js global error boundary
- `src/app/not-found.tsx` — 404 page
- `src/components/ui/Sidebar.tsx` — Navigation sidebar with Pera Wallet connection
- `src/components/ui/Cards.tsx` — `StatCard`, `StatusBadge`, `EmptyState`, `HashDisplay`, `SectionHeader`
- `src/components/ui/Toast.tsx` — Context-based toast notification system
- `src/components/ui/Skeleton.tsx` — Loading skeleton components
- `src/components/ui/ConfirmModal.tsx` — Reusable confirmation dialog
- `src/lib/api.ts` — Axios client with JWT interceptor, all API namespaces
- `src/lib/store.ts` — Zustand global store: auth, active org, wallet
- `src/lib/useOrg.ts` — `useOrg`, `useOrgList`, `useCompliance` data hooks
- `src/lib/usePeraWallet.ts` — Pera Wallet connect/disconnect/reconnect hook

#### Infrastructure
- `docker-compose.yml` — PostgreSQL 15, Redis 7, FastAPI backend, Next.js frontend
- `setup.sh` — One-command first-time setup script
- `ciphertrust.code-workspace` — VS Code multi-root workspace with launch configs and tasks
- `api.http` — REST Client test file for all endpoints
- `.env.example` — All required environment variables documented
- `.gitignore` — Python, Node, ZK, secrets, IDE
- `README.md` — Full project documentation
- `contracts/README.md` — Contract deployment guide
- `CHANGELOG.md` — This file
