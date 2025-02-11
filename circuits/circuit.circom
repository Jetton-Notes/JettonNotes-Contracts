pragma circom 2.0.0;
include "./CommitmentHasher.circom";

template Withdraw(){
    signal input nullifierHash;
    signal input commitmentHash;
   
   signal input workchain;

   signal input recipient;
   
   signal input nullifier;
   signal input secret;


   // hidden signals to make sure the recipient and fee cannot be tampered with later
   signal recipientSquare;

   signal workchainSquare;

  // Hashing the commitment and the nullifier
  component commitmentHasher = CommitmentHasher();

  commitmentHasher.nullifier <== nullifier;
  commitmentHasher.secret <== secret;

  // Assert that the hashes are correct
  commitmentHasher.nullifierHash === nullifierHash;
  commitmentHasher.commitment === commitmentHash;

  // An extra signal to avoid tampering later
  recipientSquare <== recipient * recipient;

  workchainSquare <== workchain * workchain;
}

component main {public [nullifierHash,commitmentHash,recipient, workchain]} = Withdraw();