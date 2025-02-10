
import { deposit, generateNoteWithdrawProof, hexToBigint, parseNote, SplitAddress, verifyThreePublicSignals } from "../lib/notes";
import fs from "fs";
import assert from "assert";
import { Address } from "@ton/core";


describe("Proof test", () => {

    it("should create a note, a proof to withdraw and verify it", async () => {
        const noteString = await deposit({ currency: "tbtc", amount: 10 });
        const parsedNote = await parseNote(noteString);

        const recipient_address = Address.parse("UQB9_eAKXGpTlx9I8qrkSjHMiDomWTrv6G7fBBb5Wj10_v-v");

        const splitRaw = SplitAddress(recipient_address.toRawString());

        const recipient_bigint = hexToBigint(splitRaw);

        const { proof, publicSignals } = await generateNoteWithdrawProof({ deposit: parsedNote.deposit, recipient: recipient_bigint, snarkArtifacts: undefined })
        const verificationKeyFile = fs.readFileSync("circuits/verification_key.json", "utf-8");
        const verificationKey = JSON.parse(verificationKeyFile);
        const res = await verifyThreePublicSignals(verificationKey, { proof, publicSignals });
        assert.equal(res, true);

    })

})