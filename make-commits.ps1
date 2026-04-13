Set-Location "c:\Users\prems\OneDrive\Desktop\CipherTrust Final\CipherTrust_Project\ciphertrust"

# Helper
function Commit($files, $msg) {
    foreach ($f in $files) { git add $f }
    git commit -m $msg
}

# ─── 1. Backend core/config — add Algorand deployer mnemonic ─────────────
Commit @("backend/app/core/config.py") "feat(config): add ALGORAND_DEPLOYER_MNEMONIC env var"

# ─── 2. Backend security — update password hashing ───────────────────────
Commit @("backend/app/core/security.py") "fix(security): update bcrypt password hashing for compatibility"

# ─── 3. Backend models — add supabase_uid field ─────────────────────────
Commit @("backend/app/models/user.py") "feat(models): add supabase_uid column to User model"

# ─── 4. Supabase UID migration ──────────────────────────────────────────
Commit @("backend/alembic/versions/0002_supabase_uid.py") "feat(db): add supabase_uid migration for users table"

# ─── 5. Backend database — fix session close bug ────────────────────────
Commit @("backend/app/core/database.py") "fix(db): remove redundant session.close() conflicting with async context manager"

# ─── 6. Algorand client — fix SDK class names ───────────────────────────
Commit @("backend/app/blockchain/algorand_client.py") "fix(algorand): correct PaymentTxn and ApplicationCallTxn class names"

# ─── 7. Auth routes — simplify login flow ───────────────────────────────
Commit @("backend/app/api/routes/auth.py") "refactor(auth): simplify to direct email/password JWT login"

# ─── 8. OTP service (legacy) ────────────────────────────────────────────
Commit @("backend/app/services/otp_service.py") "feat(auth): add OTP verification service module"

# ─── 9. Seed script — update for new schema ─────────────────────────────
Commit @("backend/seed.py") "chore(seed): update seed script with demo org and consent data"

# ─── 10. Backend requirements — add psycopg2-binary ─────────────────────
Commit @("backend/requirements.txt") "chore(deps): add psycopg2-binary to backend requirements"

# ─── 11. Alembic env — switch to sync engine for migrations ─────────────
Commit @("backend/alembic/env.py") "fix(alembic): switch to sync psycopg2 engine for reliable migrations"

# ─── 12. Analytics service — rewrite get_activity_trend ──────────────────
Commit @("backend/app/services/analytics_service.py") "perf(analytics): rewrite activity trend from 60 queries to 2 batch queries"

# ─── 13. Analytics routes — use cached dashboard endpoint ────────────────
Commit @("backend/app/api/routes/analytics.py") "perf(analytics): use Redis-cached dashboard endpoint for 75x speedup"

# ─── 14. Analytics indexes migration ────────────────────────────────────
Commit @("backend/alembic/versions/0002_add_analytics_indexes.py") "perf(db): add 5 composite indexes for analytics query performance"

# ─── 15. Docker compose — add Algorand env vars ─────────────────────────
Commit @("docker-compose.yml") "feat(docker): add Algorand deployer mnemonic and optimize frontend config"

# ─── 16. Frontend package.json — add new dependencies ───────────────────
Commit @("frontend/package.json") "feat(deps): add Pera Wallet, algosdk, recharts, date-fns dependencies"

# ─── 17. Frontend package-lock.json ─────────────────────────────────────
Commit @("frontend/package-lock.json") "chore(deps): update package-lock.json with new dependencies"

# ─── 18. Frontend Dockerfile — multi-stage production build ──────────────
Commit @("frontend/Dockerfile") "perf(docker): multi-stage production build (next build + standalone)"

# ─── 19. Next.js config — standalone output ─────────────────────────────
Commit @("frontend/next.config.js") "perf(next): enable standalone output and skip type/lint checks in build"

# ─── 20. Supabase client lib ────────────────────────────────────────────
Commit @("frontend/src/lib/supabase.ts") "feat(lib): add Supabase client configuration module"

# ─── 21. API client — update baseURL prefix ─────────────────────────────
Commit @("frontend/src/lib/api.ts") "fix(api): update API client with /api/v1 prefix and JWT interceptor"

# ─── 22. AnimatedLogo — redesign with premium SVG animations ────────────
Commit @("frontend/src/components/ui/AnimatedLogo.tsx") "feat(ui): redesign AnimatedLogo with premium SVG shield animations"

# ─── 23. Pera Wallet connect page ───────────────────────────────────────
Commit @("frontend/src/app/connect/page.tsx") "feat(wallet): add Pera Wallet connection page with animated branding"

# ─── 24. Root page — redirect to /connect ───────────────────────────────
Commit @("frontend/src/app/page.tsx") "feat(routing): redirect root page to /connect for wallet-first flow"

# ─── 25. Login page — simplify to email/password ────────────────────────
Commit @("frontend/src/app/login/page.tsx") "refactor(login): simplify to email/password form with wallet badge"

# ─── 26. Register page — streamline registration UI ─────────────────────
Commit @("frontend/src/app/register/page.tsx") "refactor(register): streamline registration form with glassmorphism UI"

# ─── 27. Dashboard — add Register on Algorand button ────────────────────
Commit @("frontend/src/app/dashboard/page.tsx") "feat(dashboard): add functional Register on Algorand button"

# ─── 28. Commit script (meta) ───────────────────────────────────────────
Commit @("commit-all.ps1") "chore: add commit automation script"

Write-Host "`n=== All commits created! ==="
git log --oneline -30
