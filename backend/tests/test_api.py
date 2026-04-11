"""
CipherTrust — Backend Test Suite

Tests cover:
  - Auth (register, login, JWT)
  - Organisations (create, on-chain registration)
  - Consent (create, anchor, revoke)
  - ZK Proofs (generate, submit)
  - Compliance (summary, certificate)

Run: pytest backend/tests/ -v
"""

import hashlib
import json
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Point to SQLite for tests (no Postgres needed)
import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_ciphertrust.db"
os.environ["REDIS_URL"] = "redis://localhost:6379"  # will be mocked
os.environ["ALGORAND_DEPLOYER_MNEMONIC"] = ""

from main import app
from app.core.database import Base, engine


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def register_and_login(client, email="test@example.com", password="password123", role="org_admin"):
    await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Test User",
        "role": role,
    })
    res = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]


async def create_org(client, token, name="Test Corp"):
    res = await client.post(
        "/api/v1/orgs/",
        json={"name": name},
        headers={"Authorization": f"Bearer {token}"},
    )
    return res.json()


# ─── Health ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client):
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


# ─── Auth ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_user(client):
    res = await client.post("/api/v1/auth/register", json={
        "email": "user@test.com",
        "password": "password123",
        "full_name": "Test User",
        "role": "org_admin",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "user@test.com"
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_duplicate_registration_fails(client):
    payload = {"email": "dup@test.com", "password": "password123", "full_name": "Dup"}
    await client.post("/api/v1/auth/register", json=payload)
    res = await client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_login_returns_jwt(client):
    await client.post("/api/v1/auth/register", json={
        "email": "login@test.com", "password": "password123", "full_name": "Login User",
    })
    res = await client.post("/api/v1/auth/login", json={
        "email": "login@test.com", "password": "password123",
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


@pytest.mark.asyncio
async def test_wrong_password_rejected(client):
    await client.post("/api/v1/auth/register", json={
        "email": "wp@test.com", "password": "correct", "full_name": "WP",
    })
    res = await client.post("/api/v1/auth/login", json={
        "email": "wp@test.com", "password": "wrong",
    })
    assert res.status_code == 401


# ─── Organizations ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_org(client):
    token = await register_and_login(client)
    res = await client.post(
        "/api/v1/orgs/",
        json={"name": "Acme Corp"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    assert res.json()["name"] == "Acme Corp"
    assert res.json()["is_registered_onchain"] is False


@pytest.mark.asyncio
async def test_list_orgs(client):
    token = await register_and_login(client)
    await create_org(client, token, "Org A")
    await create_org(client, token, "Org B")
    res = await client.get("/api/v1/orgs/", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) >= 2


# ─── Consent ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_consent_record(client):
    token = await register_and_login(client)
    org = await create_org(client, token)
    org_id = org["id"]

    res = await client.post(
        f"/api/v1/consent/{org_id}/records",
        json={
            "user_identifier": "user@example.com",
            "consent_type": "data_processing",
            "purpose": "Processing data for service delivery under DPDPA Section 7",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    data = res.json()
    # PII must not appear in response
    assert "user@example.com" not in json.dumps(data)
    assert data["consent_hash"] is not None
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_revoke_consent(client):
    token = await register_and_login(client)
    org = await create_org(client, token)
    org_id = org["id"]

    create_res = await client.post(
        f"/api/v1/consent/{org_id}/records",
        json={
            "user_identifier": "revoke@example.com",
            "consent_type": "marketing",
            "purpose": "Marketing communications with explicit consent under DPDPA",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    consent_id = create_res.json()["id"]

    revoke_res = await client.delete(
        f"/api/v1/consent/{org_id}/records/{consent_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert revoke_res.status_code == 200
    assert revoke_res.json()["status"] == "revoked"


# ─── ZK Proofs ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_generate_proof(client):
    token = await register_and_login(client)
    org = await create_org(client, token)
    org_id = org["id"]

    # Create a consent record first
    consent_res = await client.post(
        f"/api/v1/consent/{org_id}/records",
        json={
            "user_identifier": "proof@example.com",
            "consent_type": "data_processing",
            "purpose": "Processing data for service delivery under DPDPA Section 7(a)",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    consent_id = consent_res.json()["id"]

    # Generate proof
    proof_res = await client.post(
        f"/api/v1/proofs/{org_id}/generate",
        json={"proof_type": "consent_compliance", "consent_ids": [consent_id]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert proof_res.status_code == 201
    proof = proof_res.json()
    assert proof["status"] == "generated"
    assert proof["proof_hash"] is not None
    assert proof["public_inputs"] is not None


@pytest.mark.asyncio
async def test_full_compliance_flow(client):
    """End-to-end: create org → consent → proof → submit → certificate."""
    token = await register_and_login(client, email="flow@test.com")
    org = await create_org(client, token, "Flow Corp")
    org_id = org["id"]

    # Step 1: Consent
    c = await client.post(
        f"/api/v1/consent/{org_id}/records",
        json={
            "user_identifier": "flowuser@example.com",
            "consent_type": "data_processing",
            "purpose": "Processing user data for core service delivery under DPDPA",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert c.status_code == 201
    consent_id = c.json()["id"]

    # Step 2: Generate proof
    p = await client.post(
        f"/api/v1/proofs/{org_id}/generate",
        json={"proof_type": "consent_compliance", "consent_ids": [consent_id]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert p.status_code == 201
    proof_id = p.json()["id"]

    # Step 3: Submit proof on-chain (mock — no real Algorand needed)
    s = await client.post(
        f"/api/v1/proofs/{org_id}/submit/{proof_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert s.status_code == 200
    assert s.json()["status"] == "verified"
    assert s.json()["verification_result"] is True

    # Step 4: Compliance summary
    summary = await client.get(
        f"/api/v1/compliance/{org_id}/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert summary.status_code == 200
    data = summary.json()
    assert data["verified_proofs"] == 1
    assert data["compliance_score"] > 0

    # Step 5: Issue certificate
    cert = await client.post(
        f"/api/v1/compliance/{org_id}/issue-certificate",
        params={"proof_id": proof_id, "regulation": "DPDPA"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert cert.status_code == 201
    assert cert.json()["status"] == "compliant"
