#!/usr/bin/env bash
set -e
SNARKJS=./node_modules/.bin/snarkjs
echo "[1/6] powersoftau new (bn128, power 16)"
$SNARKJS powersoftau new bn128 16 pot16_0000.ptau -v >/dev/null 2>&1
echo "[2/6] powersoftau contribute"
$SNARKJS powersoftau contribute pot16_0000.ptau pot16_final.ptau --name="Claros dev ceremony" -e="claros-$(head -c16 /dev/urandom | xxd -p)" >/dev/null 2>&1
echo "[3/6] powersoftau prepare phase2"
$SNARKJS powersoftau prepare phase2 pot16_final.ptau pot16_prepared.ptau -v >/dev/null 2>&1
echo "[4/6] groth16 setup"
$SNARKJS groth16 setup eligibility.r1cs pot16_prepared.ptau eligibility_0000.zkey >/dev/null 2>&1
echo "[5/6] zkey contribute"
$SNARKJS zkey contribute eligibility_0000.zkey eligibility_final.zkey --name="Claros dev ceremony" -e="claros-$(head -c16 /dev/urandom | xxd -p)" >/dev/null 2>&1
echo "[6/6] export verification key"
$SNARKJS zkey export verificationkey eligibility_final.zkey verification_key.json >/dev/null 2>&1
echo "DONE"
