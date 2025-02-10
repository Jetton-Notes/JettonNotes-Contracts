#!/bin/bash

circom ./circuit.circom --r1cs --wasm --prime bls12381 --sym 

snarkjs zkey new circuit.r1cs ./ptau/pot14_final.ptau circuit_0000.zkey

echo "some random text" | snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey --name="1st Contributor Name" -v

echo "another random text" | snarkjs zkey contribute circuit_0001.zkey circuit_final.zkey

snarkjs zkey export verificationkey circuit_final.zkey verification_key.json

node ../../snarkjs/build//cli.cjs zkey export funcverifier circuit_final.zkey ./verifier.fc
