pragma circom 2.0.0;

include "../node_modules/poseidon-bls12381-circom/circuits/poseidon255.circom";

template CommitmentHasher(){
    signal input nullifier;
    signal input secret;
    signal output commitment;
    signal output nullifierHash;

    component commitmentPoseidon = Poseidon255(2);

    commitmentPoseidon.in[0] <== nullifier;
    commitmentPoseidon.in[1] <== secret;

    commitment <== commitmentPoseidon.out;

    component nullifierPoseidon = Poseidon255(1);

    nullifierPoseidon.in[0] <== nullifier;

    nullifierHash <== nullifierPoseidon.out;
}