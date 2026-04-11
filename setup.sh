#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CipherTrust — First-time Setup Script
#
# Run:  bash setup.sh
#
# What it does:
#   1. Copies .env.example → .env
#   2. Starts Docker services (Redis)
#   3. Installs Python backend deps
#   4. Runs DB migrations
#   5. Seeds demo data
#   6. Installs Node deps for frontend + ZK circuits
#   7. Prints next steps
# ─────────────────────────────────────────────────────────────────────────────

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

info()  { echo -e "${BLUE}▶  $1${NC}"; }
ok()    { echo -e "${GREEN}✅  $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠️   $1${NC}"; }
error() { echo -e "${RED}❌  $1${NC}"; exit 1; }

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       CipherTrust — Setup Script          ║${NC}"
echo -e "${BLUE}║       Privacy-Preserving RegTech          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Check prerequisites ────────────────────────────────────────────────────

info "Checking prerequisites..."

command -v docker   >/dev/null 2>&1 || error "Docker not found. Install from https://docs.docker.com/get-docker/"
command -v python3  >/dev/null 2>&1 || error "Python 3 not found."
command -v node     >/dev/null 2>&1 || error "Node.js not found. Install from https://nodejs.org/"
command -v pip      >/dev/null 2>&1 || error "pip not found."

PYTHON_VERSION=$(python3 -c "import sys; print(sys.version_info.minor)")
if [ "$PYTHON_VERSION" -lt "11" ]; then
  error "Python 3.11+ required. Found 3.$PYTHON_VERSION"
fi

ok "Prerequisites OK"

# ── 2. Environment file ───────────────────────────────────────────────────────

if [ ! -f ".env" ]; then
  info "Creating .env from .env.example..."
  cp .env.example .env
  ok ".env created — edit it to add your DATABASE_URL (for Supabase) and ALGORAND_DEPLOYER_MNEMONIC"
else
  ok ".env already exists"
fi

# ── 3. Docker services ────────────────────────────────────────────────────────

info "Starting Docker services (Redis)..."
docker compose up -d redis

info "Waiting for Redis to be ready..."
sleep 2
ok "Redis is ready"

# ── 4. Python dependencies ────────────────────────────────────────────────────

info "Installing backend Python dependencies..."
cd backend

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate 2>/dev/null || . .venv/Scripts/activate 2>/dev/null || true

pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
pip install --quiet -r requirements-test.txt
ok "Python deps installed"

# ── 5. Database migrations ────────────────────────────────────────────────────

info "Running database migrations..."
if [ -z "$DATABASE_URL" ]; then
  error "DATABASE_URL is not set. Please set it in your .env file to point to Supabase."
fi
alembic upgrade head
ok "Migrations applied"

# ── 6. Seed demo data ─────────────────────────────────────────────────────────

info "Seeding demo data..."
python seed.py
ok "Demo data seeded"

cd ..

# ── 7. Frontend dependencies ──────────────────────────────────────────────────

info "Installing frontend Node dependencies..."
cd frontend
npm install --silent
ok "Frontend deps installed"
cd ..

# ── 8. ZK circuit dependencies ───────────────────────────────────────────────

info "Installing ZK circuit dependencies..."
cd zk-circuits
npm install --silent
ok "ZK deps installed"
cd ..

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Setup Complete! 🎉                ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}Next steps:${NC}"
echo ""
echo -e "  1. Start the backend:"
echo -e "     ${YELLOW}cd backend && source .venv/bin/activate && uvicorn main:app --reload${NC}"
echo ""
echo -e "  2. Start the frontend (new terminal):"
echo -e "     ${YELLOW}cd frontend && npm run dev${NC}"
echo ""
echo -e "  3. Open the app:"
echo -e "     ${YELLOW}http://localhost:3000${NC}"
echo ""
echo -e "  4. API docs:"
echo -e "     ${YELLOW}http://localhost:8000/docs${NC}"
echo ""
echo -e "  ${BLUE}Demo credentials:${NC}"
echo -e "     Org admin  : admin@acmecorp.in       / password123"
echo -e "     Regulator  : regulator@dpdpa.gov.in  / password123"
echo ""
echo -e "  ${BLUE}VS Code:${NC}  Open ${YELLOW}ciphertrust.code-workspace${NC} for the full multi-root workspace"
echo ""
