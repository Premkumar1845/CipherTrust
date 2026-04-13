$ErrorActionPreference = "Continue"
Set-Location "c:\Users\prems\OneDrive\Desktop\CipherTrust Final\CipherTrust_Project\ciphertrust"

# Descriptive commit messages for specific files
$messages = @{
    ".gitignore"                                       = "chore: add gitignore for Python, Node, ZK circuits, and secrets"
    ".env.example"                                     = "config: add environment variable template with all required settings"
    ".mcp.json"                                        = "config: add MCP server configuration for AI agent tooling"
    ".vscode/mcp.json"                                 = "config: add VS Code MCP settings for workspace"
    "AGENTS.md"                                        = "docs: add AI agent guidance with skills, MCP tools, and workflows"
    "CLAUDE.md"                                        = "docs: add Claude AI instruction file pointing to AGENTS.md"
    "README.md"                                        = "docs: add comprehensive project README with architecture, API docs, and setup guide"
    "CHANGELOG.md"                                     = "docs: add version history and changelog"
    "api.http"                                         = "docs: add HTTP client test file for API endpoint testing"
    "setup.sh"                                         = "chore: add initial setup shell script"
    "docker-compose.yml"                               = "infra: add Docker Compose with PostgreSQL, Redis, backend, and frontend services"
    "ciphertrust.code-workspace"                       = "config: add VS Code workspace configuration"
    "backend/Dockerfile"                               = "infra(backend): add Dockerfile with Python 3.11-slim base image"
    "backend/main.py"                                  = "feat(backend): add FastAPI app entrypoint with CORS and route registration"
    "backend/requirements.txt"                         = "chore(backend): add production Python dependencies"
    "backend/requirements-test.txt"                    = "chore(backend): add test dependencies (pytest, httpx)"
    "backend/pyproject.toml"                           = "config(backend): add Python project metadata and tool config"
    "backend/seed.py"                                  = "feat(backend): add database seeding script with demo users and orgs"
    "backend/alembic.ini"                              = "config(backend): add Alembic database migration configuration"
    "backend/alembic/env.py"                           = "feat(backend): add Alembic migration environment with async SQLAlchemy"
    "backend/alembic/script.py.mako"                   = "config(backend): add Alembic migration template"
    "backend/alembic/versions/0001_initial.py"         = "feat(backend): add initial DB migration - users, orgs, consents, proofs, certs"
    "backend/app/__init__.py"                          = "feat(backend): initialize app package"
    "backend/app/api/__init__.py"                      = "feat(backend): initialize API package"
    "backend/app/api/routes/__init__.py"               = "feat(backend): initialize routes package with all route registrations"
    "backend/app/api/routes/analytics.py"              = "feat(backend): add analytics route - compliance scoring and trend data"
    "backend/app/api/routes/auth.py"                   = "feat(backend): add auth routes - JWT register and login endpoints"
    "backend/app/api/routes/compliance.py"             = "feat(backend): add compliance routes - certificate issuance and verification"
    "backend/app/api/routes/consent.py"                = "feat(backend): add consent routes - CRUD, anchoring, and revocation"
    "backend/app/api/routes/health.py"                 = "feat(backend): add health check endpoint"
    "backend/app/api/routes/orgs.py"                   = "feat(backend): add organisation routes - CRUD and on-chain DID registration"
    "backend/app/api/routes/proofs.py"                 = "feat(backend): add ZK proof routes - generation and on-chain submission"
    "backend/app/blockchain/__init__.py"               = "feat(backend): initialize blockchain package"
    "backend/app/blockchain/algorand_client.py"        = "feat(backend): add Algorand client - submit proofs, verify txns, issue ASA certs"
    "backend/app/core/__init__.py"                     = "feat(backend): initialize core package"
    "backend/app/core/config.py"                       = "feat(backend): add Pydantic settings for env-based configuration"
    "backend/app/core/database.py"                     = "feat(backend): add async SQLAlchemy engine, session factory, and base model"
    "backend/app/core/exceptions.py"                   = "feat(backend): add custom HTTP exception handlers"
    "backend/app/core/middleware.py"                   = "feat(backend): add CORS middleware and rate limiting"
    "backend/app/core/redis.py"                        = "feat(backend): add Redis client for caching and rate limiting"
    "backend/app/core/security.py"                     = "feat(backend): add JWT auth and bcrypt password hashing (72-byte safe)"
    "backend/app/models/__init__.py"                   = "feat(backend): initialize models package"
    "backend/app/models/user.py"                       = "feat(backend): add SQLAlchemy models - User, Org, Consent, Proof, Certificate"
    "backend/app/schemas/__init__.py"                  = "feat(backend): initialize schemas package"
    "backend/app/schemas/schemas.py"                   = "feat(backend): add Pydantic request/response schemas for all endpoints"
    "backend/app/services/__init__.py"                 = "feat(backend): initialize services package"
    "backend/app/services/analytics_service.py"        = "feat(backend): add compliance scoring engine with risk flag detection"
    "backend/app/services/zk_service.py"               = "feat(backend): add ZK proof service - snarkjs integration with mock fallback"
    "backend/tests/__init__.py"                        = "test(backend): initialize test package"
    "backend/tests/test_api.py"                        = "test(backend): add integration tests for auth, consent, proof, and compliance"
    "contracts/README.md"                              = "docs(contracts): add smart contract documentation and deployment guide"
    "contracts/identity.py"                            = "feat(contracts): add identity DID registration smart contract"
    "contracts/consent_registry.py"                    = "feat(contracts): add consent registry immutable log smart contract"
    "contracts/proof_verifier.py"                      = "feat(contracts): add ZK proof verifier smart contract (core verification)"
    "contracts/compliance_cert.py"                     = "feat(contracts): add compliance certificate NFT (ASA) smart contract"
    "contracts/deploy_all.py"                          = "feat(contracts): add deployment script for all Algorand smart contracts"
    "frontend/Dockerfile"                              = "infra(frontend): add Dockerfile with node:22-alpine for Next.js dev server"
    "frontend/.dockerignore"                           = "infra(frontend): add dockerignore to reduce build context to 385KB"
    "frontend/package.json"                            = "chore(frontend): add Next.js 14 dependencies and scripts"
    "frontend/package-lock.json"                       = "chore(frontend): add npm lockfile for reproducible builds"
    "frontend/next.config.js"                          = "config(frontend): add Next.js configuration"
    "frontend/next-env.d.ts"                           = "config(frontend): add Next.js TypeScript environment declarations"
    "frontend/tsconfig.json"                           = "config(frontend): add TypeScript configuration with path aliases"
    "frontend/postcss.config.js"                       = "config(frontend): add PostCSS configuration for Tailwind CSS"
    "frontend/tailwind.config.js"                      = "style(frontend): add Tailwind config with glassmorphism tokens and 11 animations"
    "frontend/src/styles/globals.css"                  = "style(frontend): add design system - glassmorphism, 15+ animations, scroll reveals"
    "frontend/src/components/ui/AnimatedLogo.tsx"      = "feat(frontend): add animated SVG logo - shield, blockchain nodes, key with glow"
    "frontend/src/components/ui/NetworkBackground.tsx" = "feat(frontend): add canvas particle network background with connecting lines"
    "frontend/src/components/ui/Cards.tsx"             = "feat(frontend): add StatCard, StatusBadge, EmptyState, HashDisplay components"
    "frontend/src/components/ui/Sidebar.tsx"           = "feat(frontend): add sidebar navigation with AnimatedLogo and wallet section"
    "frontend/src/components/ui/Toast.tsx"             = "feat(frontend): add toast notification system (success, error, info)"
    "frontend/src/components/ui/ConfirmModal.tsx"      = "feat(frontend): add confirmation modal for destructive actions"
    "frontend/src/components/ui/Skeleton.tsx"          = "feat(frontend): add loading skeleton components"
    "frontend/src/lib/api.ts"                          = "feat(frontend): add Axios API client with auth, consent, proof, compliance modules"
    "frontend/src/lib/store.ts"                        = "feat(frontend): add Zustand store for auth, org, and wallet state"
    "frontend/src/lib/useOrg.ts"                       = "feat(frontend): add organisation context hook"
    "frontend/src/lib/usePeraWallet.ts"                = "feat(frontend): add Pera Wallet integration hook for Algorand signing"
    "frontend/src/app/layout.tsx"                      = "feat(frontend): add root layout with Manrope, Inter, JetBrains Mono fonts"
    "frontend/src/app/page.tsx"                        = "feat(frontend): add landing page - hero, features, use cases, particle background"
    "frontend/src/app/not-found.tsx"                   = "feat(frontend): add custom 404 page"
    "frontend/src/app/global-error.tsx"                = "feat(frontend): add global error boundary"
    "frontend/src/app/login/page.tsx"                  = "feat(frontend): add login page with particle background and demo credentials"
    "frontend/src/app/register/page.tsx"               = "feat(frontend): add 2-step registration (account + organisation) with animations"
    "frontend/src/app/dashboard/layout.tsx"            = "feat(frontend): add dashboard layout with sidebar and content area"
    "frontend/src/app/dashboard/page.tsx"              = "feat(frontend): add dashboard overview - score ring, quick actions, latest cert"
    "frontend/src/app/dashboard/consent/page.tsx"      = "feat(frontend): add consent management - CRUD, Algorand anchoring, revocation"
    "frontend/src/app/dashboard/proofs/page.tsx"       = "feat(frontend): add ZK proof page - generation with hash scramble and neon scan"
    "frontend/src/app/dashboard/certificates/page.tsx" = "feat(frontend): add certificates page - issuance with confirm-wave animations"
    "frontend/src/app/dashboard/analytics/page.tsx"    = "feat(frontend): add analytics dashboard - score gauge, risk flags, trend charts"
    "frontend/src/app/regulator/layout.tsx"            = "feat(frontend): add regulator portal layout"
    "frontend/src/app/regulator/page.tsx"              = "feat(frontend): add regulator dashboard - org overview with compliance scores"
    "frontend/src/app/regulator/verify/page.tsx"       = "feat(frontend): add verification page - verify by org ID or Algorand txn ID"
    "zk-circuits/package.json"                         = "chore(zk): add ZK circuit dependencies (circomlib, snarkjs)"
    "zk-circuits/example_input.json"                   = "docs(zk): add sample circuit input for consent compliance proof"
    "zk-circuits/circuits/consent_compliance.circom"   = "feat(zk): add Circom circuit - consent existence and validity ZK proof"
    "zk-circuits/scripts/setup.js"                     = "feat(zk): add circuit compilation and Groth16 trusted setup script"
    "zk-circuits/scripts/generate_proof.js"            = "feat(zk): add proof generation and verification script"
    ".github/copilot-instructions.md"                  = "docs(github): add Copilot agent instructions pointing to AGENTS.md"
}

# Pattern-based messages for skill files
function Get-CommitMessage($filePath) {
    if ($messages.ContainsKey($filePath)) {
        return $messages[$filePath]
    }

    # .claude/skills patterns
    if ($filePath -match "^\.claude/skills/([^/]+)/references/(.+)\.md$") {
        $skill = $Matches[1]
        $ref = $Matches[2]
        return "docs(claude): add $skill skill reference - $ref"
    }
    if ($filePath -match "^\.claude/skills/([^/]+)/SKILL\.md$") {
        $skill = $Matches[1]
        return "docs(claude): add $skill skill definition"
    }

    # .github/skills patterns
    if ($filePath -match "^\.github/skills/([^/]+)/references/(.+)\.md$") {
        $skill = $Matches[1]
        $ref = $Matches[2]
        return "docs(github): add $skill skill reference - $ref"
    }
    if ($filePath -match "^\.github/skills/([^/]+)/SKILL\.md$") {
        $skill = $Matches[1]
        return "docs(github): add $skill skill definition"
    }

    # Fallback
    $name = Split-Path $filePath -Leaf
    return "chore: add $name"
}

# Get all files git would track (excluding commit-all.ps1)
$rawOutput = git add --dry-run . 2>&1 | Out-String
$allFiles = @()
foreach ($line in $rawOutput -split "`n") {
    $line = $line.Trim()
    if ($line -match "^add '(.+)'$") {
        $f = $Matches[1]
        if ($f -ne "commit-all.ps1") {
            $allFiles += $f
        }
    }
}

$total = $allFiles.Count
Write-Host "=== Committing $total files individually to main ===" -ForegroundColor Cyan
Write-Host ""

$i = 0
foreach ($file in $allFiles) {
    $i++
    $msg = Get-CommitMessage $file
    git add $file 2>$null
    git commit -m $msg 2>$null | Out-Null
    $pct = [math]::Round(($i / $total) * 100)
    Write-Host "[$i/$total] ($pct%) $msg" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== All $i commits created. Pushing to origin main... ===" -ForegroundColor Cyan
Write-Host ""
git push -u origin main 2>&1
Write-Host ""
Write-Host "=== DONE! $i commits pushed to https://github.com/Premkumar1845/CipherTrust.git ===" -ForegroundColor Yellow
