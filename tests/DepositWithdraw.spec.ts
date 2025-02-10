import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, toNano } from '@ton/core';
import { DepositWithdraw } from '../wrappers/DepositWithdraw';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { deposit, g1Compressed, g2Compressed, generateNoteWithdrawProof, hexToBigint, parseNote, SplitAddress } from '../lib/notes';



//@ts-ignore
import { buildBls12381, utils } from "ffjavascript";
const { unstringifyBigInts } = utils;



describe('DepositWithdraw', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('DepositWithdraw');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let depositWithdraw: SandboxContract<DepositWithdraw>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        depositWithdraw = blockchain.openContract(
            DepositWithdraw.createFromConfig(
                {
                    id: 0,
                    counter: 0,
                },
                code
            )
        );

        deployer = await blockchain.treasury('deployer');

        const deployResult = await depositWithdraw.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: depositWithdraw.address,
            deploy: true,
            success: true,
        });
    });

    // it('should deploy', async () => {
    //     // the check is done inside beforeEach
    //     // blockchain and depositWithdraw are ready to use
    // });

    it("should verify", async () => {
        const noteString = await deposit({ currency: "tbtc", amount: 1 });
        const parsedNote = await parseNote(noteString);
        const recipient_address = deployer.address;
        const splitRaw = SplitAddress(recipient_address.toRawString())
        const recipient_bigint = hexToBigint(splitRaw);
        const { proof, publicSignals } = await generateNoteWithdrawProof({ deposit: parsedNote.deposit, recipient: recipient_bigint, snarkArtifacts: undefined })
        const curve = await buildBls12381();
        const proofProc = unstringifyBigInts(proof);
        const pi_aS = g1Compressed(curve, proofProc.pi_a);
        const pi_bS = g2Compressed(curve, proofProc.pi_b);
        const pi_cS = g1Compressed(curve, proofProc.pi_c);
        const pi_a = Buffer.from(pi_aS, "hex");
        const pi_b = Buffer.from(pi_bS, "hex");
        const pi_c = Buffer.from(pi_cS, "hex");

        const verifier = await blockchain.treasury("verifier");
        console.log(publicSignals)
        const verifyResult = await depositWithdraw.sendWithdraw(
            verifier.getSender(),
            {
                pi_a: pi_a,
                pi_b: pi_b,
                pi_c: pi_c,
                pubInputs: publicSignals,
                value: toNano("0.15") //0.15 TON fee
            });
        expect(verifyResult.transactions).toHaveTransaction({
            from: verifier.address,
            to: depositWithdraw.address,
            success: true
        })

        //TODO: Can do fetching with public view function to check a result

    })

    // it('should increase counter', async () => {
    //     const increaseTimes = 3;
    //     for (let i = 0; i < increaseTimes; i++) {
    //         console.log(`increase ${i + 1}/${increaseTimes}`);

    //         const increaser = await blockchain.treasury('increaser' + i);

    //         const counterBefore = await depositWithdraw.getCounter();

    //         console.log('counter before increasing', counterBefore);

    //         const increaseBy = Math.floor(Math.random() * 100);

    //         console.log('increasing by', increaseBy);

    //         const increaseResult = await depositWithdraw.sendIncrease(increaser.getSender(), {
    //             increaseBy,
    //             value: toNano('0.05'),
    //         });

    //         expect(increaseResult.transactions).toHaveTransaction({
    //             from: increaser.address,
    //             to: depositWithdraw.address,
    //             success: true,
    //         });

    //         const counterAfter = await depositWithdraw.getCounter();

    //         console.log('counter after increasing', counterAfter);

    //         expect(counterAfter).toBe(counterBefore + increaseBy);
    //     }
    // });
});
