
import { deposit, generateNoteWithdrawProof, hexToBigint, parseNote, SplitAddress, verifyPublicSignals } from "../lib/cryptonotes";
import fs from "fs";
import assert from "assert";
import { Address } from "@ton/core";


describe("Proof test", () => {

    it("should create a note, a proof to withdraw and verify it", async () => {
        const noteString = await deposit({ currency: "tbtc" });
        const parsedNote = await parseNote(noteString);

        const recipient_address = Address.parse("UQB9_eAKXGpTlx9I8qrkSjHMiDomWTrv6G7fBBb5Wj10_v-v");

        const [workchain, splitRawAddress] = SplitAddress(recipient_address.toRawString());

        const recipient_bigint = hexToBigint(splitRawAddress);

        const { proof, publicSignals } = await generateNoteWithdrawProof(
            {
                deposit: parsedNote.deposit,
                recipient: recipient_bigint,
                workchain: parseInt(workchain),
                transferto_amount: 0n,
                transferto_commitment: 0n,
                utxo_commitment: 0n,
                snarkArtifacts: undefined
            })
        const verificationKeyFile = fs.readFileSync("circuits/verification_key.json", "utf-8");
        const verificationKey = JSON.parse(verificationKeyFile);
        const res = await verifyPublicSignals(verificationKey, { proof, publicSignals });
        assert.equal(res, true);

    })

})