#!/usr/bin/env node
/**
 * CipherTrust — Proof Generation Script
 *
 * Generates a Groth16 proof for consent compliance and verifies it locally.
 *
 * Usage:
 *   node scripts/generate_proof.js --input input.json
 *
 * Input JSON format:
 * {
 *   "orgIdHash": "0x...",
 *   "purposeHash": "0x...",
 *   "timestampBound": 1700000000,
 *   "merkleRoot": "0x...",
 *   "consentCount": 3,
 *   "consentHashes": ["0x...", ...],   // private
 *   "timestamps": [1699000000, ...],   // private
 *   "activeFlags": [1, 1, 1, ...],     // private
 *   "merklePathElements": [[...], ...], // private
 *   "merklePathIndices": [[...], ...]   // private
 * }
 */

const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BUILD_DIR = path.join(__dirname, "../build");
const CIRCUIT_NAME = "consent_compliance";

// ─── Merkle tree helpers ───────────────────────────────────────────────────

function poseidonHash(inputs) {
  // For JS: use poseidon from circomlibjs
  // npm install circomlibjs
  try {
    const { buildPoseidon } = require("circomlibjs");
    // Note: buildPoseidon is async — wrap at call site
    throw new Error("Use buildPoseidonAsync");
  } catch {
    // Fallback: sha256 for testing (replace with real Poseidon in production)
    const h = crypto.createHash("sha256");
    h.update(inputs.join(":"));
    return BigInt("0x" + h.digest("hex")) % (2n ** 254n);
  }
}

function buildMerkleTree(leaves, depth) {
  const size = 2 ** depth;
  const nodes = new Array(size * 2).fill(0n);

  // Fill leaves
  for (let i = 0; i < leaves.length; i++) {
    nodes[size + i] = BigInt(leaves[i]);
  }

  // Build tree bottom-up
  for (let i = size - 1; i > 0; i--) {
    const h = crypto.createHash("sha256");
    h.update(`${nodes[2 * i]}:${nodes[2 * i + 1]}`);
    nodes[i] = BigInt("0x" + h.digest("hex")) % (2n ** 254n);
  }

  return nodes;
}

function getMerklePath(nodes, leafIndex, depth) {
  const size = 2 ** depth;
  const pathElements = [];
  const pathIndices = [];
  let pos = size + leafIndex;

  for (let i = 0; i < depth; i++) {
    const sibling = pos % 2 === 0 ? pos + 1 : pos - 1;
    pathElements.push(nodes[sibling].toString());
    pathIndices.push(pos % 2 === 0 ? 0 : 1);
    pos = Math.floor(pos / 2);
  }

  return { pathElements, pathIndices };
}

// ─── Pad inputs to MAX_CONSENTS=8 ────────────────────────────────────────────

function padInputs(input) {
  const MAX = 8;
  const DEPTH = 3;

  const consentHashes = [...input.consentHashes];
  const timestamps = [...input.timestamps];
  const activeFlags = [...input.activeFlags];

  // Pad with zeros
  while (consentHashes.length < MAX) consentHashes.push("0");
  while (timestamps.length < MAX) timestamps.push("0");
  while (activeFlags.length < MAX) activeFlags.push("0");

  // Build Merkle tree from leaves
  const leaves = consentHashes.map((h, i) =>
    BigInt("0x" + crypto.createHash("sha256").update(`${h}:${timestamps[i]}:${activeFlags[i]}`).digest("hex")) % (2n ** 254n)
  );
  const nodes = buildMerkleTree(leaves, DEPTH);
  const merkleRoot = nodes[1].toString();

  const merklePathElements = [];
  const merklePathIndices = [];
  for (let i = 0; i < MAX; i++) {
    const { pathElements, pathIndices } = getMerklePath(nodes, i, DEPTH);
    merklePathElements.push(pathElements);
    merklePathIndices.push(pathIndices);
  }

  return {
    orgIdHash: input.orgIdHash,
    purposeHash: input.purposeHash,
    timestampBound: input.timestampBound.toString(),
    merkleRoot,
    consentCount: input.consentCount.toString(),
    consentHashes,
    timestamps,
    activeFlags,
    merklePathElements,
    merklePathIndices,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function generateProof(inputPath) {
  console.log("📋  Loading input...");
  const rawInput = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const input = padInputs(rawInput);

  const wasmPath = path.join(BUILD_DIR, `${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm`);
  const zkeyPath = path.join(BUILD_DIR, `${CIRCUIT_NAME}_final.zkey`);
  const vkeyPath = path.join(BUILD_DIR, "verification_key.json");

  if (!fs.existsSync(wasmPath)) {
    console.error("❌  WASM not found. Run: node scripts/setup.js first.");
    process.exit(1);
  }

  console.log("⚙️   Computing witness...");
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);

  console.log("✅  Proof generated!");
  console.log("   Public signals:", publicSignals);

  // Save proof
  const proofPath = path.join(BUILD_DIR, "latest_proof.json");
  const publicPath = path.join(BUILD_DIR, "latest_public.json");
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  fs.writeFileSync(publicPath, JSON.stringify(publicSignals, null, 2));

  // Verify
  console.log("\n🔍  Verifying proof...");
  const vkey = JSON.parse(fs.readFileSync(vkeyPath, "utf8"));
  const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
  console.log(`    Result: ${isValid ? "✅  VALID" : "❌  INVALID"}`);

  // Export Solidity calldata (for reference / future cross-chain)
  const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
  fs.writeFileSync(path.join(BUILD_DIR, "calldata.txt"), calldata);

  return { proof, publicSignals, isValid };
}

// CLI
const args = process.argv.slice(2);
const inputFlag = args.indexOf("--input");
const inputPath = inputFlag >= 0 ? args[inputFlag + 1] : null;

if (!inputPath) {
  console.error("Usage: node generate_proof.js --input <input.json>");
  process.exit(1);
}

generateProof(inputPath)
  .then(({ isValid }) => process.exit(isValid ? 0 : 1))
  .catch((e) => { console.error(e); process.exit(1); });
