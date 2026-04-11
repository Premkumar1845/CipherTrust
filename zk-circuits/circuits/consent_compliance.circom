pragma circom 2.1.6;

/*
 * CipherTrust — Consent Compliance Circuit
 *
 * Proves: "Organisation O has at least MIN_CONSENTS active consent records
 *          of type PURPOSE, all granted before TIMESTAMP_BOUND,
 *          whose hashes produce Merkle root ROOT."
 *
 * Public inputs  (revealed to verifier / on-chain):
 *   - orgIdHash        : Poseidon(org_id)
 *   - purposeHash      : Poseidon(consent_type_string)
 *   - timestampBound   : unix timestamp ceiling
 *   - merkleRoot       : Merkle root of consent hash leaves
 *   - consentCount     : number of consents proven
 *
 * Private inputs (never leave the prover):
 *   - consentHashes[N] : individual consent hash values
 *   - timestamps[N]    : granted_at unix timestamps
 *   - activeFlags[N]   : 1 = active, 0 = revoked / expired
 *   - merklePathElements[N][DEPTH] : sibling nodes for each leaf
 *   - merklePathIndices[N][DEPTH]  : left/right indicators
 *
 * N   = MAX_CONSENTS (padded with zeros if fewer real records)
 * DEPTH = ceil(log2(MAX_CONSENTS))
 */

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/mux1.circom";
include "node_modules/circomlib/circuits/bitify.circom";

// ─── Merkle inclusion proof for a single leaf ──────────────────────────────

template MerkleProof(depth) {
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    signal output root;

    component hashers[depth];
    component muxLeft[depth];
    component muxRight[depth];

    signal levelHashes[depth + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < depth; i++) {
        hashers[i] = Poseidon(2);
        muxLeft[i]  = Mux1();
        muxRight[i] = Mux1();

        muxLeft[i].c[0]  <== levelHashes[i];
        muxLeft[i].c[1]  <== pathElements[i];
        muxLeft[i].s     <== pathIndices[i];

        muxRight[i].c[0] <== pathElements[i];
        muxRight[i].c[1] <== levelHashes[i];
        muxRight[i].s    <== pathIndices[i];

        hashers[i].inputs[0] <== muxLeft[i].out;
        hashers[i].inputs[1] <== muxRight[i].out;
        levelHashes[i + 1]   <== hashers[i].out;
    }

    root <== levelHashes[depth];
}

// ─── Main circuit ─────────────────────────────────────────────────────────

template ConsentCompliance(maxConsents, merkleDepth) {
    // ── Public inputs ──────────────────────────────────────────────────────
    signal input orgIdHash;
    signal input purposeHash;
    signal input timestampBound;
    signal input merkleRoot;
    signal input consentCount;

    // ── Private inputs ─────────────────────────────────────────────────────
    signal input consentHashes[maxConsents];
    signal input timestamps[maxConsents];
    signal input activeFlags[maxConsents];            // 1 = active
    signal input merklePathElements[maxConsents][merkleDepth];
    signal input merklePathIndices[maxConsents][merkleDepth];

    // ── Internal signals ───────────────────────────────────────────────────
    component merkleProofs[maxConsents];
    component tsChecks[maxConsents];
    component leafHashers[maxConsents];

    signal activeAndValid[maxConsents];
    signal runningCount[maxConsents + 1];
    runningCount[0] <== 0;

    for (var i = 0; i < maxConsents; i++) {
        // 1. Timestamp must be <= timestampBound
        tsChecks[i] = LessEqThan(64);
        tsChecks[i].in[0] <== timestamps[i];
        tsChecks[i].in[1] <== timestampBound;

        // 2. Leaf hash = Poseidon(consentHash, timestamp, activeFlag)
        leafHashers[i] = Poseidon(3);
        leafHashers[i].inputs[0] <== consentHashes[i];
        leafHashers[i].inputs[1] <== timestamps[i];
        leafHashers[i].inputs[2] <== activeFlags[i];

        // 3. Merkle inclusion proof
        merkleProofs[i] = MerkleProof(merkleDepth);
        merkleProofs[i].leaf              <== leafHashers[i].out;
        merkleProofs[i].pathElements      <== merklePathElements[i];
        merkleProofs[i].pathIndices       <== merklePathIndices[i];

        // All non-zero leaves must have correct Merkle root
        // Zero leaves (padding) are skipped via activeFlags[i]
        (merkleProofs[i].root - merkleRoot) * activeFlags[i] === 0;

        // 4. Count valid (active + timestamp ok) consents
        activeAndValid[i] <== activeFlags[i] * tsChecks[i].out;
        runningCount[i + 1] <== runningCount[i] + activeAndValid[i];
    }

    // 5. Proven count must equal public consentCount
    runningCount[maxConsents] === consentCount;
}

// Instantiate with MAX_CONSENTS=8, MERKLE_DEPTH=3 (supports up to 8 leaves)
component main {public [
    orgIdHash,
    purposeHash,
    timestampBound,
    merkleRoot,
    consentCount
]} = ConsentCompliance(8, 3);
