pragma circom 2.0.0;
include "./CommitmentHasher.circom";


template Withdraw(){
    signal input nullifierHash;
    signal input commitmentHash;
   
   signal input workchain;

   signal input recipient;

   signal input transferto_commitment;

   signal input transferto_amount;

   signal input utxo_commitment;


   signal input nullifier;
   signal input secret;


   // hidden signals to make sure the recipient and fee cannot be tampered with later
   signal recipientSquare;

   signal workchainSquare;

   signal transferto_commitmentSquare;

   signal transferto_amountSquare;

   signal utxo_commitmentSquare;

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

  transferto_commitmentSquare <== transferto_commitment * transferto_commitment;

  transferto_amountSquare <== transferto_amount * transferto_amount;

  utxo_commitmentSquare <== utxo_commitment * utxo_commitment;
}

component main {public [nullifierHash,commitmentHash,recipient, workchain, transferto_commitment, transferto_amount, utxo_commitment]} = Withdraw();