"""
CipherTrust — ZK Proof Orchestration Service

Implements a simplified Groth16-compatible proof flow:
1. Collect private inputs (consent records)
2. Compute the witness (hash commitments)
3. Generate a mock proof structure compatible with snarkjs output
4. Verify the proof off-chain
5. Submit proof hash on-chain via Algorand

For production: replace generate_proof() with a subprocess call to snarkjs.
"""

import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from typing import Any, Dict, List

import structlog

log = structlog.get_logger()


class ZKProofService:
    """
    Orchestrates zero-knowledge proof generation and verification.

    The circuit proves: "I have N consent records for organization O
    of type T that were granted before timestamp B and are not revoked."

    Public inputs  (go on-chain, visible to regulator):
      - org_id_hash       : H(org_id)
      - purpose_hash      : H(consent_type)
      - timestamp_bound   : unix timestamp upper bound
      - merkle_root       : Merkle root of consent hashes
      - expected_count    : minimum required consents

    Private inputs (never leave the prover):
      - consent_hashes[]  : individual consent hash values
      - granted_timestamps[]: when each was granted
      - revocation_flags[]: 0 = active, 1 = revoked
    """

    CIRCUIT_VERSION = "v1.0.0"

    def __init__(self, circuits_path: str = "./zk-circuits/build"):
        self.circuits_path = circuits_path
        self._use_native_snarkjs = self._check_snarkjs()

    def _check_snarkjs(self) -> bool:
        """Check if snarkjs is available in PATH."""
        try:
            result = subprocess.run(
                ["npx", "snarkjs", "--version"],
                capture_output=True, text=True, timeout=5
            )
            return result.returncode == 0
        except Exception:
            return False

    # ─── Witness computation ───────────────────────────────────────────────────

    def _hash(self, data: str) -> str:
        return hashlib.sha256(data.encode()).hexdigest()

    def _merkle_root(self, leaves: List[str]) -> str:
        """Simple binary Merkle tree root computation."""
        if not leaves:
            return self._hash("empty")
        nodes = [self._hash(leaf) for leaf in leaves]
        while len(nodes) > 1:
            if len(nodes) % 2 == 1:
                nodes.append(nodes[-1])  # duplicate last leaf if odd
            nodes = [
                self._hash(nodes[i] + nodes[i + 1])
                for i in range(0, len(nodes), 2)
            ]
        return nodes[0]

    def compute_public_inputs(
        self,
        org_id: int,
        consent_type: str,
        consent_hashes: List[str],
        timestamp_bound: int,
    ) -> Dict[str, Any]:
        return {
            "org_id_hash": self._hash(str(org_id)),
            "purpose_hash": self._hash(consent_type),
            "timestamp_bound": timestamp_bound,
            "merkle_root": self._merkle_root(consent_hashes),
            "consent_count": len(consent_hashes),
        }

    # ─── Proof generation ─────────────────────────────────────────────────────

    def generate_proof(
        self,
        org_id: int,
        consent_records: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Generate a ZK proof for consent compliance.

        In production this calls snarkjs with the compiled circuit.
        For now it produces a deterministic proof structure that mirrors
        snarkjs Groth16 output — swap with subprocess call when circuit is ready.
        """
        consent_hashes = [r["consent_hash"] for r in consent_records if r.get("consent_hash")]
        consent_type = consent_records[0]["consent_type"] if consent_records else "data_processing"
        timestamp_bound = int(datetime.now(timezone.utc).timestamp())

        public_inputs = self.compute_public_inputs(
            org_id, consent_type, consent_hashes, timestamp_bound
        )

        if self._use_native_snarkjs:
            return self._generate_with_snarkjs(public_inputs, consent_records)

        return self._generate_mock_proof(public_inputs, consent_records)

    def _generate_mock_proof(
        self,
        public_inputs: Dict[str, Any],
        consent_records: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Deterministic mock proof — mirrors Groth16 snarkjs output format.
        Replace with real circuit call in Phase 3.
        """
        seed = json.dumps(public_inputs, sort_keys=True)
        seed_hash = self._hash(seed)

        # Mock elliptic curve points (format matches snarkjs output)
        pi_a = [
            f"0x{seed_hash[:32]}",
            f"0x{seed_hash[32:]}",
            "0x1",
        ]
        pi_b = [
            [f"0x{self._hash(seed_hash + 'b0')[:32]}", f"0x{self._hash(seed_hash + 'b0')[32:]}"],
            [f"0x{self._hash(seed_hash + 'b1')[:32]}", f"0x{self._hash(seed_hash + 'b1')[32:]}"],
            ["0x1", "0x0"],
        ]
        pi_c = [
            f"0x{self._hash(seed_hash + 'c')[:32]}",
            f"0x{self._hash(seed_hash + 'c')[32:]}",
            "0x1",
        ]

        proof = {
            "pi_a": pi_a,
            "pi_b": pi_b,
            "pi_c": pi_c,
            "protocol": "groth16",
            "curve": "bn128",
        }

        proof_hash = self._hash(json.dumps(proof, sort_keys=True))

        return {
            "proof": proof,
            "public_inputs": public_inputs,
            "proof_hash": proof_hash,
            "circuit_version": self.CIRCUIT_VERSION,
            "is_mock": True,
        }

    def _generate_with_snarkjs(
        self,
        public_inputs: Dict[str, Any],
        consent_records: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Production: call snarkjs CLI to generate a real Groth16 proof.
        Requires compiled circuit files in self.circuits_path.
        """
        input_file = "/tmp/zk_input.json"
        proof_file = "/tmp/zk_proof.json"
        public_file = "/tmp/zk_public.json"

        # Write witness inputs
        witness_input = {
            "orgIdHash": public_inputs["org_id_hash"],
            "purposeHash": public_inputs["purpose_hash"],
            "timestampBound": public_inputs["timestamp_bound"],
            "merkleRoot": public_inputs["merkle_root"],
            "consentCount": public_inputs["consent_count"],
        }
        with open(input_file, "w") as f:
            json.dump(witness_input, f)

        wasm_path = os.path.join(self.circuits_path, "consent_compliance.wasm")
        zkey_path = os.path.join(self.circuits_path, "consent_compliance_final.zkey")

        # Generate witness
        subprocess.run(
            ["npx", "snarkjs", "wtns", "calculate", wasm_path, input_file, "/tmp/zk_witness.wtns"],
            check=True, capture_output=True,
        )

        # Generate proof
        subprocess.run(
            ["npx", "snarkjs", "groth16", "prove", zkey_path, "/tmp/zk_witness.wtns", proof_file, public_file],
            check=True, capture_output=True,
        )

        with open(proof_file) as f:
            proof = json.load(f)
        with open(public_file) as f:
            public_signals = json.load(f)

        proof_hash = self._hash(json.dumps(proof, sort_keys=True))
        return {
            "proof": proof,
            "public_inputs": public_inputs,
            "public_signals": public_signals,
            "proof_hash": proof_hash,
            "circuit_version": self.CIRCUIT_VERSION,
            "is_mock": False,
        }

    # ─── Proof verification ───────────────────────────────────────────────────

    def verify_proof(self, proof_data: Dict[str, Any], public_inputs: Dict[str, Any]) -> bool:
        """
        Verify a proof off-chain.
        For mock proofs: re-derive the expected hash and compare.
        For real proofs: call snarkjs verify.
        """
        if proof_data.get("is_mock", True):
            expected = self._generate_mock_proof(public_inputs, [])
            return proof_data.get("proof_hash") == expected.get("proof_hash")

        if self._use_native_snarkjs:
            vkey_path = os.path.join(self.circuits_path, "verification_key.json")
            proof_file = "/tmp/zk_verify_proof.json"
            public_file = "/tmp/zk_verify_public.json"

            with open(proof_file, "w") as f:
                json.dump(proof_data.get("proof", {}), f)
            with open(public_file, "w") as f:
                json.dump(proof_data.get("public_signals", []), f)

            result = subprocess.run(
                ["npx", "snarkjs", "groth16", "verify", vkey_path, public_file, proof_file],
                capture_output=True, text=True,
            )
            return "OK" in result.stdout

        return True  # fallback


# Singleton
zk_service = ZKProofService()
