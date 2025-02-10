nvm use v20.11.1

echo 'prepare phase1'
snarkjs powersoftau new bls12-381 14 pot14_0000.ptau -v
echo 'contribute phase1 first'
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First contribution" -v -e="some random text"
echo 'contribute phase1 second'
snarkjs powersoftau contribute pot14_0001.ptau pot14_0002.ptau --name="Second contribution" -v -e="some random text"
echo 'apply a random beacon'
snarkjs powersoftau beacon pot14_0002.ptau pot14_beacon.ptau 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"
echo 'prepare phase2'
snarkjs powersoftau prepare phase2 pot14_beacon.ptau pot14_final.ptau -v
echo 'Verify the final ptau'
snarkjs powersoftau verify pot14_final.ptau