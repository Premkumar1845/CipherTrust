"""
CipherTrust — Identity Contract
Registers organization DIDs on Algorand.

Deploy with: python contracts/identity.py
"""

from beaker import Application, GlobalStateValue, localnet
from beaker.lib.storage import BoxMapping
from pyteal import (
    Approve, Assert, Bytes, Global, Int, Reject,
    Seq, Txn, abi, pragma
)

pragma(compiler_version=">=0.26.0")

app = Application("CipherTrustIdentity")

# ─── Global State ─────────────────────────────────────────────────────────────

org_count = GlobalStateValue(stack_type=abi.Uint64, default=Int(0), descr="Total orgs registered")
admin = GlobalStateValue(stack_type=abi.Address, descr="Contract admin address")

# Box storage: wallet_address (str) → metadata_hash (str)
org_registry: BoxMapping[abi.String, abi.String] = BoxMapping(abi.String, abi.String)


# ─── Methods ──────────────────────────────────────────────────────────────────

@app.create
def create() -> abi.Bool:
    return Seq(
        admin.set(Txn.sender()),
        org_count.set(Int(0)),
        abi.Bool().set(True),
    )


@app.external
def register_org(
    org_name: abi.String,
    metadata_hash: abi.String,
    *,
    output: abi.String,
) -> abi.String:
    """
    Register an organization's DID on-chain.
    Stores: wallet_address → metadata_hash
    """
    sender_str = abi.String()
    return Seq(
        # Prevent duplicate registration
        Assert(
            org_registry[Txn.sender()].exists() == Int(0),
            comment="Org already registered",
        ),
        sender_str.set(Txn.sender()),
        org_registry[Txn.sender()].set(metadata_hash),
        org_count.set(org_count.get() + Int(1)),
        # Return the DID (did:algo:<wallet_address>)
        output.set(Bytes("did:algo:") + Txn.sender()),
    )


@app.external(read_only=True)
def get_org_info(
    wallet_address: abi.Address,
    *,
    output: abi.String,
) -> abi.String:
    """Retrieve metadata hash for a registered org."""
    return Seq(
        Assert(
            org_registry[wallet_address].exists(),
            comment="Org not registered",
        ),
        output.set(org_registry[wallet_address]),
    )


@app.external
def update_metadata(new_metadata_hash: abi.String) -> abi.Bool:
    """Allow an org to update their metadata hash."""
    return Seq(
        Assert(
            org_registry[Txn.sender()].exists(),
            comment="Org not registered",
        ),
        org_registry[Txn.sender()].set(new_metadata_hash),
        abi.Bool().set(True),
    )


@app.external(read_only=True)
def get_org_count(*, output: abi.Uint64) -> abi.Uint64:
    return output.set(org_count.get())


# ─── Deploy script ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import os
    import json
    from algokit_utils import ApplicationClient, get_localnet_default_account
    from algosdk.v2client import algod

    # Write ABI + approval/clear TEAL
    app_spec = app.build()
    os.makedirs("build", exist_ok=True)
    app_spec.export("build/identity")
    print("✅  Identity contract compiled → build/identity/")

    # Optionally deploy to LocalNet
    if os.getenv("DEPLOY_LOCALNET"):
        client = algod.AlgodClient("a" * 64, "http://localhost:4001")
        acct = get_localnet_default_account(client)
        app_client = ApplicationClient(client, app, signer=acct)
        app_id, _, _ = app_client.create()
        print(f"✅  Deployed to LocalNet — App ID: {app_id}")
        with open("build/identity/app_id.txt", "w") as f:
            f.write(str(app_id))
