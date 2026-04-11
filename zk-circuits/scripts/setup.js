#!/usr/bin/env node
/**
 * CipherTrust — Circuit Setup Script
 *
 * Run this once to compile the circuit and generate proving/verification keys.
 * Requires: circom, snarkjs, node_modules/circomlib installed.
 *
 * Usage:
 *   cd zk-circuits
 *   npm install
 *   node scripts/setup.js
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CIRCUIT_NAME = "consent_compliance";
const CIRCUITS_DIR = path.join(__dirname, "../circuits");
const BUILD_DIR = path.join(__dirname, "../build");
const PTAU_FILE = path.join(BUILD_DIR, "pot14_final.ptau");

function run(cmd, label) {
  console.log(`\n▶  ${label}`);
  execSync(cmd, { stdio: "inherit" });
  console.log(`✅  ${label} — done`);
}

async function main() {
  fs.mkdirSync(BUILD_DIR, { recursive: true });

  // ── 1. Download Powers of Tau (Hermez ceremony, 2^14 constraints) ──────────
  if (!fs.existsSync(PTAU_FILE)) {
    run(
      `curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau -o ${PTAU_FILE}`,
      "Download Powers of Tau"
    );
  } else {
    console.log("ℹ️   Powers of Tau already downloaded");
  }

  // ── 2. Compile the Circom circuit ─────────────────────────────────────────
  run(
    `circom ${CIRCUITS_DIR}/${CIRCUIT_NAME}.circom --r1cs --wasm --sym -o ${BUILD_DIR}`,
    "Compile circuit"
  );

  // ── 3. Generate zkey (circuit-specific key) ────────────────────────────────
  run(
    `npx snarkjs groth16 setup ${BUILD_DIR}/${CIRCUIT_NAME}.r1cs ${PTAU_FILE} ${BUILD_DIR}/${CIRCUIT_NAME}_0000.zkey`,
    "Generate initial zkey"
  );

  // ── 4. Contribute randomness (Phase 2 ceremony) ───────────────────────────
  run(
    `echo "ciphertrust_random_entropy_$(date +%s)" | npx snarkjs zkey contribute ${BUILD_DIR}/${CIRCUIT_NAME}_0000.zkey ${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey --name="CipherTrust contribution"`,
    "Contribute randomness"
  );

  // ── 5. Export verification key ────────────────────────────────────────────
  run(
    `npx snarkjs zkey export verificationkey ${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey ${BUILD_DIR}/verification_key.json`,
    "Export verification key"
  );

  console.log("\n🎉  Circuit setup complete!");
  console.log(`    Proving key : ${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey`);
  console.log(`    Verify key  : ${BUILD_DIR}/verification_key.json`);
  console.log(`    WASM        : ${BUILD_DIR}/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm`);
}

main().catch(console.error);
