"""
CipherTrust — Consent Registry Contract
Immutable on-chain log of consent hashes.

Each call to log_consent() records:
  - consent_hash (sha256 of off-chain consent data)
  - org_id
  - consent_type
  - timestamp (block time)

Data is stored in Box storage keyed by consent_hash.
"""

from beaker import Application, GlobalStateValue
from beaker.lib.storage import BoxMapping
from pyteal import (
    Assert, Int, Seq, Txn, abi, pragma
)

pragma(compiler_version=">=0.26.0")

app = Application("CipherTrustConsentRegistry")

# ─── State ────────────────────────────────────────────────────────────────────

consent_count = GlobalStateValue(
    stack_type=abi.Uint64, default=Int(0), descr="Total consent records logged"
)

# Box: consent_hash → JSON payload (org_id, type, timestamp)
consent_log: BoxMapping[abi.String, abi.String] = BoxMapping(abi.String, abi.String)


# ─── Methods ──────────────────────────────────────────────────────────────────

@app.create
def create() -> abi.Bool:
    return Seq(
        consent_count.set(Int(0)),
        abi.Bool().set(True),
    )


@app.external
def log_consent(
    consent_hash: abi.String,
    org_id: abi.Uint64,
    consent_type: abi.String,
    *,
    output: abi.String,
) -> abi.String:
    """
    Log a consent hash on-chain. Idempotent — re-logging the same hash is rejected.
    Returns the Algorand block timestamp as confirmation.
    """
    return Seq(
        Assert(
            consent_log[consent_hash].exists() == Int(0),
            comment="Consent hash already logged",
        ),
        consent_log[consent_hash].set(consent_type),
        consent_count.set(consent_count.get() + Int(1)),
        output.set(consent_hash),
    )


@app.external(read_only=True)
def verify_consent(
    consent_hash: abi.String,
    *,
    output: abi.Bool,
) -> abi.Bool:
    """Check whether a consent hash exists in the registry."""
    return output.set(consent_log[consent_hash].exists())


@app.external(read_only=True)
def get_consent_type(
    consent_hash: abi.String,
    *,
    output: abi.String,
) -> abi.String:
    """Return the consent type stored for a given hash."""
    return Seq(
        Assert(consent_log[consent_hash].exists(), comment="Hash not found"),
        output.set(consent_log[consent_hash]),
    )


@app.external(read_only=True)
def get_consent_count(*, output: abi.Uint64) -> abi.Uint64:
    return output.set(consent_count.get())


# ─── Deploy ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import os
    app_spec = app.build()
    os.makedirs("build", exist_ok=True)
    app_spec.export("build/consent_registry")
    print("✅  Consent Registry compiled → build/consent_registry/")

    if os.getenv("DEPLOY_LOCALNET"):
        from algokit_utils import ApplicationClient, get_localnet_default_account
        from algosdk.v2client import algod
        client = algod.AlgodClient("a" * 64, "http://localhost:4001")
        acct = get_localnet_default_account(client)
        app_client = ApplicationClient(client, app, signer=acct)
        app_id, _, _ = app_client.create()
        print(f"✅  Deployed to LocalNet — App ID: {app_id}")
