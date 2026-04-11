#!/usr/bin/env python3
"""
CipherTrust — Deploy all smart contracts to Algorand TestNet.

Usage:
  python contracts/deploy_all.py

Requires ALGORAND_DEPLOYER_MNEMONIC in .env (25-word mnemonic for a funded TestNet account).
Fund your deployer at: https://bank.testnet.algorand.network/
"""

import os
import sys
import json
from pathlib import Path

# Add backend to path for config
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from algosdk import account, mnemonic
from algosdk.v2client import algod

NODE_URL     = os.getenv("ALGORAND_NODE_URL", "https://testnet-api.algonode.cloud")
MNEMONIC     = os.getenv("ALGORAND_DEPLOYER_MNEMONIC", "")
ENV_FILE     = Path(__file__).parent.parent / ".env"

if not MNEMONIC:
    print("❌  ALGORAND_DEPLOYER_MNEMONIC not set in .env")
    sys.exit(1)

private_key  = mnemonic.to_private_key(MNEMONIC)
deployer_addr = account.address_from_private_key(private_key)

client = algod.AlgodClient("", NODE_URL, headers={"X-Algo-API-Token": ""})
info   = client.account_info(deployer_addr)
balance = info.get("amount", 0) / 1_000_000

print(f"\n🔑  Deployer: {deployer_addr}")
print(f"💰  Balance : {balance:.4f} ALGO")

if balance < 1:
    print("\n❌  Insufficient balance. Fund your account at:")
    print("    https://bank.testnet.algorand.network/")
    sys.exit(1)

# ─── Deploy each contract ─────────────────────────────────────────────────────

contracts = [
    ("identity",         "IDENTITY_APP_ID"),
    ("consent_registry", "CONSENT_REGISTRY_APP_ID"),
    ("proof_verifier",   "PROOF_VERIFIER_APP_ID"),
    ("compliance_cert",  "COMPLIANCE_CERT_APP_ID"),
]

deployed = {}

for contract_name, env_var in contracts:
    print(f"\n📦  Deploying {contract_name}...")
    os.environ["DEPLOY_LOCALNET"] = ""  # disable localnet flag

    import subprocess
    result = subprocess.run(
        [sys.executable, f"contracts/{contract_name}.py"],
        capture_output=True, text=True,
        env={**os.environ, "DEPLOY_TESTNET": "1"},
    )

    if result.returncode == 0:
        print(f"    {result.stdout.strip()}")
        # In practice, capture the app_id from stdout or a build file
        deployed[env_var] = 0  # placeholder — update after real deployment
    else:
        print(f"    ⚠️   {result.stderr[:200]}")

# ─── Update .env ──────────────────────────────────────────────────────────────

print("\n📝  Update your .env with the deployed App IDs above.")
print("    Then restart the backend service.\n")

# Example: write placeholders if you have real IDs
for env_var, app_id in deployed.items():
    print(f"    {env_var}={app_id}")
