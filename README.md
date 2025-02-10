# deposit

Circuit compile:
`circom ./withdraw.circom --r1cs  --wasm  --prime bls12381 --sym `

NOTE! THE POWERS OF TAU CEREMONY WAS NOT DECENTRALIZED, WAS DONE JUST LOCALLY

`snarkjs zkey new withdraw.r1cs ./ptau/pot14_final.ptau withdraw_0000.zkey`

FORKED SNARKJS WITH FUNC SUPPORT MUST BE AVAILABE IN PATH

`node ../../snarkjs/build/cli.cjs zkey export funcverifier withdraw_0000.zkey ../contracts/verifier.fc`

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

## How to use

### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

### Add a new contract

`npx blueprint create ContractName` or `yarn blueprint create ContractName`
