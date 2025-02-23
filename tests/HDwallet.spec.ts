import { bip32derivedDeposit } from "../lib/cryptonotes";
import { mnemonicToHDSeed, deriveEd25519Path, KeyPair, keyPairFromSeed } from '@ton/crypto';
//@ts-ignore
import { utils } from "ffjavascript";

describe("secret derivation via hd wallet bip 32", () => {
    it("should create an hd wallet", async () => {
        const firstSecret = 94689101999558503447711315587047797285553390663767543862203419261732524810301n;
        const firstNullifier = 72019624781118465516028022228456025484404980050365267869270564861953969640268n;

        const deposit1 = await bip32derivedDeposit({ masterNullifier: firstNullifier, masterSecret: firstSecret });
        expect(deposit1.secret).toBe(11283244460564867441497902624187393151857840809473899042712308283838065450864n)
        expect(deposit1.nullifier).toBe(30871190191754008778195997942564049416789830138949423931336386132935993425014n)
        console.time("bip32 key derive time")
        const deposit2 = await bip32derivedDeposit({ masterSecret: deposit1.secret, masterNullifier: deposit1.nullifier });
        console.timeEnd("bip32 key derive time")
        console.log(deposit2)
        expect(deposit2.secret).toBe(31260681906241563914876170988233274798685425038747672629724651284604425355690n)
        expect(deposit2.nullifier).toBe(89686447295344543224647122901103962685186689836187504686823726079571009777441n)

        // ..etc.. The keys can be further derived from the previous values
    })

    it("should create an hd wallet with @ton/crypto", async () => {
        const firstSecret = 94689101999558503447711315587047797285553390663767543862203419261732524810301n;
        const firstNullifier = 72019624781118465516028022228456025484404980050365267869270564861953969640268n;

        const derivedMasterSeed = await deriveEd25519Path(utils.leInt2Buff(firstSecret), [0, 1, 1, 1]);
        const keyPair: KeyPair = keyPairFromSeed(derivedMasterSeed);

        console.log(keyPair.secretKey.length);
        console.log(keyPair.publicKey.length);

        //TODO: I could hash the secretkey to reduce the size to 32 bits, with sha256...
    })

})