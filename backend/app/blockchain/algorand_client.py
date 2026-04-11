"""
CipherTrust — Algorand Blockchain Client
Handles all on-chain interactions via py-algorand-sdk
"""

import hashlib
import json
from typing import Any, Dict, Optional

import algosdk
from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod, indexer

from app.core.config import settings


class AlgorandClient:
    """Singleton wrapper around Algorand node + indexer clients."""

    def __init__(self):
        self.algod = algod.AlgodClient(
            algod_token="",  # AlgoNode public endpoint needs no token
            algod_address=settings.ALGORAND_NODE_URL,
            headers={"X-Algo-API-Token": ""},
        )
        self.indexer = indexer.IndexerClient(
            indexer_token="",
            indexer_address=settings.ALGORAND_INDEXER_URL,
            headers={"X-Algo-API-Token": ""},
        )

        # Deployer account (for paying transaction fees on behalf of contracts)
        if settings.ALGORAND_DEPLOYER_MNEMONIC:
            self.deployer_private_key = mnemonic.to_private_key(
                settings.ALGORAND_DEPLOYER_MNEMONIC
            )
            self.deployer_address = account.address_from_private_key(self.deployer_private_key)
        else:
            self.deployer_private_key = None
            self.deployer_address = None

    def get_params(self) -> algosdk.transaction.SuggestedParams:
        return self.algod.suggested_params()

    def get_account_info(self, address: str) -> Dict[str, Any]:
        return self.algod.account_info(address)

    # ─── Note Field Anchoring ──────────────────────────────────────────────────
    # Simple pattern: store consent hash / proof hash in the note field of a
    # payment tx (0 ALGO to self). This is cheap and sufficient for v1.
    # The full smart contract calls are wired below.

    def anchor_hash_on_chain(self, data_hash: str, label: str = "ciphertrust") -> str:
        """
        Anchor an arbitrary hash on Algorand via a 0-ALGO self-payment.
        Returns the transaction ID.
        Requires deployer_private_key to be configured.
        """
        if not self.deployer_private_key:
            raise ValueError("Deployer mnemonic not configured")

        params = self.get_params()
        note = json.dumps({"app": label, "hash": data_hash}).encode()

        txn = transaction.PaymentTransaction(
            sender=self.deployer_address,
            receiver=self.deployer_address,
            amt=0,
            note=note,
            sp=params,
        )
        signed = txn.sign(self.deployer_private_key)
        txn_id = self.algod.send_transaction(signed)
        transaction.wait_for_confirmation(self.algod, txn_id, wait_rounds=4)
        return txn_id

    # ─── Application Calls ────────────────────────────────────────────────────

    def call_app(
        self,
        app_id: int,
        method: str,
        args: list,
        sender_private_key: Optional[str] = None,
    ) -> str:
        """Generic application call to any CipherTrust smart contract."""
        pk = sender_private_key or self.deployer_private_key
        if not pk:
            raise ValueError("No private key available")

        sender = account.address_from_private_key(pk)
        params = self.get_params()

        txn = transaction.ApplicationCallTransaction(
            sender=sender,
            sp=params,
            index=app_id,
            on_complete=transaction.OnComplete.NoOpOC,
            app_args=[method.encode(), *[str(a).encode() for a in args]],
        )
        signed = txn.sign(pk)
        txn_id = self.algod.send_transaction(signed)
        transaction.wait_for_confirmation(self.algod, txn_id, wait_rounds=4)
        return txn_id

    # ─── Identity Contract ────────────────────────────────────────────────────

    def register_org(self, org_name: str, metadata_hash: str) -> Dict[str, str]:
        """Register an org DID on the Identity contract."""
        if settings.IDENTITY_APP_ID == 0:
            # Fallback: anchor via note field
            note_hash = hashlib.sha256(f"{org_name}:{metadata_hash}".encode()).hexdigest()
            txn_id = self.anchor_hash_on_chain(note_hash, "identity")
            did = f"did:algo:{self.deployer_address}"
            return {"did": did, "txn_id": txn_id, "metadata_hash": metadata_hash}

        txn_id = self.call_app(
            settings.IDENTITY_APP_ID,
            "register_org",
            [org_name, metadata_hash],
        )
        did = f"did:algo:{self.deployer_address}"
        return {"did": did, "txn_id": txn_id, "metadata_hash": metadata_hash}

    # ─── Consent Registry Contract ────────────────────────────────────────────

    def log_consent(self, consent_hash: str, org_id: int, consent_type: str) -> str:
        """Log a consent hash on the Consent Registry contract."""
        if settings.CONSENT_REGISTRY_APP_ID == 0:
            return self.anchor_hash_on_chain(consent_hash, "consent")

        return self.call_app(
            settings.CONSENT_REGISTRY_APP_ID,
            "log_consent",
            [consent_hash, org_id, consent_type],
        )

    # ─── Proof Verifier Contract ──────────────────────────────────────────────

    def submit_proof(
        self,
        proof_hash: str,
        org_id: int,
        compliance_type: str,
        verification_result: bool,
    ) -> str:
        """Submit a ZK proof hash and its verification result on-chain."""
        if settings.PROOF_VERIFIER_APP_ID == 0:
            combined = f"{proof_hash}:{org_id}:{compliance_type}:{verification_result}"
            payload_hash = hashlib.sha256(combined.encode()).hexdigest()
            return self.anchor_hash_on_chain(payload_hash, "proof")

        return self.call_app(
            settings.PROOF_VERIFIER_APP_ID,
            "submit_proof",
            [proof_hash, org_id, compliance_type, int(verification_result)],
        )

    # ─── Compliance Certificate Contract ──────────────────────────────────────

    def issue_certificate(self, org_id: int, proof_id: int, regulation: str) -> Dict[str, Any]:
        """Issue a compliance certificate (NFT/ASA) on-chain."""
        if settings.COMPLIANCE_CERT_APP_ID == 0:
            cert_hash = hashlib.sha256(f"{org_id}:{proof_id}:{regulation}".encode()).hexdigest()
            txn_id = self.anchor_hash_on_chain(cert_hash, "cert")
            return {"txn_id": txn_id, "asset_id": None}

        txn_id = self.call_app(
            settings.COMPLIANCE_CERT_APP_ID,
            "issue_certificate",
            [org_id, proof_id, regulation],
        )
        return {"txn_id": txn_id, "asset_id": None}

    def get_transaction(self, txn_id: str) -> Dict[str, Any]:
        """Fetch a transaction from the indexer."""
        return self.indexer.transaction(txn_id)


# Singleton
algorand = AlgorandClient()
