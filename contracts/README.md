# CipherTrust Smart Contracts

Four Algorand smart contracts built with PyTeal + Beaker.

---

## Contracts overview

| File | Contract name | Purpose |
|------|--------------|---------|
| `identity.py` | `CipherTrustIdentity` | Register organisation DIDs |
| `consent_registry.py` | `CipherTrustConsentRegistry` | Immutable consent hash log |
| `proof_verifier.py` | `CipherTrustProofVerifier` ⭐ | ZK proof submissions + results |
| `compliance_cert.py` | `CipherTrustComplianceCert` | Certificate issuance / revocation |

---

## Prerequisites

```bash
pip install beaker-pyteal pyteal algokit-utils py-algorand-sdk
```

---

## Compile all contracts

Each contract can be compiled to TEAL independently:

```bash
python contracts/identity.py
python contracts/consent_registry.py
python contracts/proof_verifier.py
python contracts/compliance_cert.py
```

Compiled TEAL + ABI JSON will appear in `build/<contract_name>/`.

---

## Deploy to LocalNet

```bash
# 1. Start AlgoKit LocalNet
algokit localnet start

# 2. Deploy all contracts
DEPLOY_LOCALNET=1 python contracts/identity.py
DEPLOY_LOCALNET=1 python contracts/consent_registry.py
DEPLOY_LOCALNET=1 python contracts/proof_verifier.py
DEPLOY_LOCALNET=1 python contracts/compliance_cert.py
```

Copy the printed App IDs into your `.env`:

```env
IDENTITY_APP_ID=1001
CONSENT_REGISTRY_APP_ID=1002
PROOF_VERIFIER_APP_ID=1003
COMPLIANCE_CERT_APP_ID=1004
```

---

## Deploy to TestNet

1. Create a wallet at [https://perawallet.app](https://perawallet.app)
2. Fund it at [https://bank.testnet.algorand.network](https://bank.testnet.algorand.network)
3. Export the 25-word mnemonic and add to `.env`:
   ```env
   ALGORAND_DEPLOYER_MNEMONIC=word1 word2 ... word25
   ```
4. Run:
   ```bash
   python contracts/deploy_all.py
   ```

---

## Contract methods reference

### Identity contract

```python
register_org(org_name: str, metadata_hash: str) -> str   # Returns DID
get_org_info(wallet_address: str) -> str                  # Returns metadata_hash
update_metadata(new_metadata_hash: str) -> bool
get_org_count() -> int
```

### Consent Registry contract

```python
log_consent(consent_hash: str, org_id: int, consent_type: str) -> str
verify_consent(consent_hash: str) -> bool
get_consent_type(consent_hash: str) -> str
get_consent_count() -> int
```

### Proof Verifier contract ⭐

```python
submit_proof(
    proof_hash: str,
    org_id: str,
    compliance_type: str,
    verification_result: int,   # 1 = verified, 0 = failed
) -> str
verify_proof(proof_hash: str) -> bool
get_verification_status(proof_hash: str) -> str   # "1" or "0"
```

### Compliance Certificate contract

```python
issue_certificate(org_id: str, proof_id: str, regulation: str) -> str
revoke_certificate(org_id: str, proof_id: str) -> bool
verify_certificate(org_id: str, proof_id: str) -> bool
```

---

## Note on ZK verification

The AVM cannot natively execute Groth16 elliptic curve pairings.
The `proof_verifier` contract stores the **proof hash** and **off-chain
verification result** submitted by the trusted backend.

For production, consider:
- Multi-sig threshold signing for the verification result
- A trusted oracle network attesting the off-chain verification
- Watching Algorand's roadmap for native ZK precompiles

This is the standard pattern used by most Layer-1 chains for ZK rollups
before native verifier precompiles were added.
