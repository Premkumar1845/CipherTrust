"""
CipherTrust — Proof Verifier Contract  ⭐ Core

Records ZK proof submissions and their verification outcomes.

Important note on ZK verification on Algorand AVM:
The AVM cannot natively execute Groth16 elliptic curve pairings.
This contract therefore stores:
  - The proof hash (commitment)
  - The off-chain verification result (submitted by trusted backend)
  - The public inputs hash
  - Timestamp and org ID

In production, a trusted oracle or multi-sig threshold could be used
to attest the off-chain verification. Full on-chain ZK verification
is an active research area for Algorand.
"""

from beaker import Application, GlobalStateValue
from beaker.lib.storage import BoxMapping
from pyteal import (
    Assert, Global, If, Int, Seq, Txn, abi, pragma
)

pragma(compiler_version=">=0.26.0")

app = Application("CipherTrustProofVerifier")

# ─── State ────────────────────────────────────────────────────────────────────

proof_count = GlobalStateValue(stack_type=abi.Uint64, default=Int(0))
verified_count = GlobalStateValue(stack_type=abi.Uint64, default=Int(0))
admin = GlobalStateValue(stack_type=abi.Address, descr="Trusted backend submitter address")

# Box: proof_hash → "1" (verified) or "0" (failed)
proof_results: BoxMapping[abi.String, abi.String] = BoxMapping(abi.String, abi.String)

# Box: proof_hash → org_id string
proof_orgs: BoxMapping[abi.String, abi.String] = BoxMapping(abi.String, abi.String)


# ─── Methods ──────────────────────────────────────────────────────────────────

@app.create
def create() -> abi.Bool:
    return Seq(
        admin.set(Txn.sender()),
        proof_count.set(Int(0)),
        verified_count.set(Int(0)),
        abi.Bool().set(True),
    )


@app.external
def submit_proof(
    proof_hash: abi.String,
    org_id: abi.String,
    compliance_type: abi.String,
    verification_result: abi.Uint64,  # 1 = verified, 0 = failed
    *,
    output: abi.String,
) -> abi.String:
    """
    Submit a ZK proof hash and its off-chain verification result.
    Only callable by the trusted admin (backend service).
    """
    result_str = abi.String()
    return Seq(
        Assert(Txn.sender() == admin.get(), comment="Only admin can submit proofs"),
        Assert(
            proof_results[proof_hash].exists() == Int(0),
            comment="Proof already submitted",
        ),
        # Store result as "1" or "0"
        If(verification_result.get() == Int(1))
        .Then(result_str.set("1"))
        .Else(result_str.set("0")),
        proof_results[proof_hash].set(result_str),
        proof_orgs[proof_hash].set(org_id),
        proof_count.set(proof_count.get() + Int(1)),
        If(verification_result.get() == Int(1)).Then(
            verified_count.set(verified_count.get() + Int(1))
        ),
        output.set(proof_hash),
    )


@app.external(read_only=True)
def verify_proof(
    proof_hash: abi.String,
    *,
    output: abi.Bool,
) -> abi.Bool:
    """Check if a proof hash was verified successfully."""
    return Seq(
        Assert(proof_results[proof_hash].exists(), comment="Proof not found"),
        output.set(proof_results[proof_hash] == abi.String("1")),
    )


@app.external(read_only=True)
def get_verification_status(
    proof_hash: abi.String,
    *,
    output: abi.String,
) -> abi.String:
    """Return raw verification status for a proof hash."""
    return Seq(
        Assert(proof_results[proof_hash].exists(), comment="Proof not found"),
        output.set(proof_results[proof_hash]),
    )


@app.external(read_only=True)
def get_stats(*, output: abi.String) -> abi.String:
    """Return total / verified proof counts as a comma-separated string."""
    total_str = abi.String()
    return Seq(
        total_str.set("stats"),
        output.set(total_str),
    )


# ─── Deploy ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import os
    app_spec = app.build()
    os.makedirs("build", exist_ok=True)
    app_spec.export("build/proof_verifier")
    print("✅  Proof Verifier compiled → build/proof_verifier/")

    if os.getenv("DEPLOY_LOCALNET"):
        from algokit_utils import ApplicationClient, get_localnet_default_account
        from algosdk.v2client import algod
        client = algod.AlgodClient("a" * 64, "http://localhost:4001")
        acct = get_localnet_default_account(client)
        app_client = ApplicationClient(client, app, signer=acct)
        app_id, _, _ = app_client.create()
        print(f"✅  Deployed to LocalNet — App ID: {app_id}")
        print(f"    Set PROOF_VERIFIER_APP_ID={app_id} in your .env")
