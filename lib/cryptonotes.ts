
//@ts-nocheck
import { utils } from "ffjavascript";
import { poseidon1, poseidon2 } from "poseidon-bls12381";

import { groth16 } from "snarkjs"
import crypto from "crypto";

export function rbigint(): bigint { return utils.leBuff2int(crypto.randomBytes(31)) };


// Generates the proofs for verification! 
export async function generateNoteWithdrawProof({
    deposit,
    recipient,
    workchain,
    transferto_commitment,
    transferto_amount,
    utxo_commitment, snarkArtifacts }) {
    const input = {
        nullifierHash: deposit.nullifierHash,
        commitmentHash: deposit.commitment,
        recipient,
        workchain,
        transferto_commitment,
        transferto_amount,
        utxo_commitment,
        // private snark inputs
        nullifier: deposit.nullifier,
        secret: deposit.secret
    }


    if (!snarkArtifacts) {
        snarkArtifacts = {
            wasmFilePath: `circuits/circuit_js/circuit.wasm`,
            zkeyFilePath: `circuits/circuit_final.zkey`
        }
    }

    console.time("Proof Time");

    const { proof, publicSignals } = await groth16.fullProve(input, snarkArtifacts.wasmFilePath, snarkArtifacts.zkeyFilePath)
    console.timeEnd("Proof Time");

    return { proof, publicSignals }
}

/**
 * Verifies a SnarkJS proof.
 * @param verificationKey The zero-knowledge verification key.
 * @param fullProof The SnarkJS full proof.
 * @returns True if the proof is valid, false otherwise.
 */

export function verifyPublicSignals(verificationKey, { proof, publicSignals }) {
    return groth16.verify(
        verificationKey,
        [
            publicSignals[0],
            publicSignals[1],
            publicSignals[2],
            publicSignals[3],
            publicSignals[4],
            publicSignals[5],
            publicSignals[6],

        ],
        proof
    )
}



export function generateCommitmentHash(nullifier, secret) {
    return poseidon2([BigInt(nullifier), BigInt(secret)]);
}

export function generateNullifierHash(nullifier) {
    return poseidon1([BigInt(nullifier)])
}

export async function deposit({ currency, amount }) {
    const deposit = await createDeposit({ nullifier: rbigint(), secret: rbigint() });
    const note = toNoteHex(deposit.preimage, 62);
    const noteString = `jettonnote-${currency}-${amount}-${note}`
    return noteString;
}

/**
 * Create deposit object from secret and nullifier
   NOTE: Do not run this function to create notes on higher level.
   Rely on "deposit" function instead
*/
async function createDeposit({ nullifier, secret }) {
    const deposit = {
        nullifier,
        secret,
        preimage: Buffer.concat([utils.leInt2Buff(nullifier, 31), utils.leInt2Buff(secret, 31)]),
        commitment: await generateCommitmentHash(nullifier, secret),
        nullifierHash: await generateNullifierHash(nullifier)
    }
    return deposit
}

/** BigNumber to hex string of specified length */
export function toNoteHex(number, length = 32) {
    const str = number instanceof Buffer ? number.toString('hex') : BigInt(number).toString(16)
    return '0x' + str.padStart(length * 2, '0')
}


export async function parseNote(noteString) {
    const noteRegex = /jettonnote-(?<currency>\w+)-(?<amount>[\d.]+)-0x(?<note>[0-9a-fA-F]{124})/g
    const match = noteRegex.exec(noteString);
    if (!match) {
        throw new Error("Invalid Note!")
    }
    //@ts-ignore
    const buf = Buffer.from(match.groups.note, 'hex');
    const nullifier = utils.leBuff2int(buf.slice(0, 31));
    const secret = utils.leBuff2int(buf.slice(31, 62));
    const deposit = await createDeposit({ nullifier, secret });
    //@ts-ignore
    const netId = Number(match.groups.netId);
    //@ts-ignore
    return { currency: match.groups.currency, amount: match.groups.amount, netId, deposit }
}


export const SplitAddress = (addrString: string) => {
    return addrString.split(":");
}

export const hexToBigint = (hex: string) => {
    return BigInt("0x" + hex);
}


export function g1Compressed(curve, p1Raw) {
    let p1 = curve.G1.fromObject(p1Raw);

    let buff = new Uint8Array(48);
    curve.G1.toRprCompressed(buff, 0, p1);
    // convert from ffjavascript to blst format
    if (buff[0] & 0x80) {
        buff[0] |= 32;
    }
    buff[0] |= 0x80;
    return toHexString(buff);
}

export function g2Compressed(curve, p2Raw) {
    let p2 = curve.G2.fromObject(p2Raw);

    let buff = new Uint8Array(96);
    curve.G2.toRprCompressed(buff, 0, p2);
    // convert from ffjavascript to blst format
    if (buff[0] & 0x80) {
        buff[0] |= 32;
    }
    buff[0] |= 0x80;
    return toHexString(buff);
}

export function toHexString(byteArray) {
    return Array.from(byteArray, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join("");
}