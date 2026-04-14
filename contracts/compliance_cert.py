"""
CipherTrust — Compliance Certificate Contract
Issues verifiable compliance certificates as Algorand Standard Assets (ASAs).

Each certificate is a unique ASA (NFT) with:
  - Total supply: 1
  - Decimals: 0
  - Metadata in the note / ARC-69 standard
  - Clawback enabled for revocation
"""

from beaker import Application, GlobalStateValue
from beaker.lib.storage import BoxMapping
from pyteal import (
    Assert, Int, Seq, Txn, abi, pragma
)

pragma(compiler_version=">=0.26.0")

app = Application("CipherTrustComplianceCert")

# ─── State ────────────────────────────────────────────────────────────────────

cert_count = GlobalStateValue(stack_type=abi.Uint64, default=Int(0))
admin = GlobalStateValue(stack_type=abi.Address)

# Box: org_id_str → latest asset_id_str
org_certs: BoxMapping[abi.String, abi.String] = BoxMapping(abi.String, abi.String)

# Box: asset_id_str → status ("active" / "revoked")
cert_status: BoxMapping[abi.String, abi.String] = BoxMapping(abi.String, abi.String)


# ─── Methods ──────────────────────────────────────────────────────────────────

@app.create
def create() -> abi.Bool:
    return Seq(
        admin.set(Txn.sender()),
        cert_count.set(Int(0)),
        abi.Bool().set(True),
    )


@app.external
def issue_certificate(
    org_id: abi.String,
    proof_id: abi.String,
    regulation: abi.String,
    *,
    output: abi.String,
) -> abi.String:
    """
    Record a certificate issuance on-chain.
    The actual ASA creation is handled by the backend (py-algorand-sdk)
    because Beaker inner transactions for ASA creation require additional
    funding logic. This method stores the certificate metadata and status.
    """
    cert_key = abi.String()
    return Seq(
        Assert(Txn.sender() == admin.get(), comment="Only admin can issue certificates"),
        cert_key.set(org_id.get() + abi.String(":") + proof_id.get()),
        org_certs[org_id].set(cert_key),
        cert_status[cert_key].set("active"),
        cert_count.set(cert_count.get() + Int(1)),
        output.set(cert_key),
    )


@app.external
def revoke_certificate(
    org_id: abi.String,
    proof_id: abi.String,
    *,
    output: abi.Bool,
) -> abi.Bool:
    """Revoke a compliance certificate."""
    cert_key = abi.String()
    return Seq(
        Assert(Txn.sender() == admin.get(), comment="Only admin can revoke"),
        cert_key.set(org_id.get() + abi.String(":") + proof_id.get()),
        Assert(cert_status[cert_key].exists(), comment="Certificate not found"),
        cert_status[cert_key].set("revoked"),
        output.set(True),
    )


@app.external(read_only=True)
def verify_certificate(
    org_id: abi.String,
    proof_id: abi.String,
    *,
    output: abi.Bool,
) -> abi.Bool:
    """Check if an org has an active compliance certificate."""
    cert_key = abi.String()
    return Seq(
        cert_key.set(org_id.get() + abi.String(":") + proof_id.get()),
        output.set(
            cert_status[cert_key].exists() &
            (cert_status[cert_key] == abi.String("active"))
        ),
    )


# ─── Deploy ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import os
    app_spec = app.build()
    os.makedirs("build", exist_ok=True)
    app_spec.export("build/compliance_cert")
    print("✅  Compliance Cert compiled → build/compliance_cert/")

    if os.getenv("DEPLOY_LOCALNET"):
        from algokit_utils import ApplicationClient, get_localnet_default_account
        from algosdk.v2client import algod
        client = algod.AlgodClient("a" * 64, "http://localhost:4001")
        acct = get_localnet_default_account(client)
        app_client = ApplicationClient(client, app, signer=acct)
        app_id, _, _ = app_client.create()
        print(f"✅  Deployed to LocalNet — App ID: {app_id}")
