import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, toNano } from '@ton/core';
import { DepositWithdraw } from '../wrappers/DepositWithdraw';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { deposit, g1Compressed, g2Compressed, generateNoteWithdrawProof, hexToBigint, parseNote, SplitAddress } from '../lib/cryptonotes';



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



    it("should call deposit and save the data to storage", async () => {
        const noteString = await deposit({ currency: "tbtc", amount: 1 });
        const parsedNote = await parseNote(noteString);

        const depositor = await blockchain.treasury("depositor");

        let depositResult = await depositWithdraw.sendDeposit(
            depositor.getSender(), {
            value: toNano("0.15"),
            commitment: parsedNote.deposit.commitment,
            depositAmount: toNano("0.01")
        })

        expect(depositResult.transactions).toHaveTransaction({
            from: depositor.address,
            to: depositWithdraw.address,
            success: true
        })
        const dict = await depositWithdraw.getDeposit(parsedNote.deposit.commitment);

        expect(dict.commitment).toBe(parsedNote.deposit.commitment);

        expect(dict.nullifier).toBe(0n);
        expect(dict.depositAmount).toBe(toNano("0.01"))

        //Now I save a new deposit...

        depositResult = await depositWithdraw.sendDeposit(
            depositor.getSender(),
            {
                value: toNano("0.15"),
                commitment: parsedNote.deposit.commitment,
                depositAmount: toNano("0.01")
            }
        )
        expect(depositResult.transactions).toHaveTransaction({
            from: depositor.address,
            to: depositWithdraw.address,
            success: false,
            exitCode: 52
        })

        const noteString2 = await deposit({ currency: "tbtc", amount: 0.01 });
        const parsedNote2 = await parseNote(noteString2);

        depositResult = await depositWithdraw.sendDeposit(
            depositor.getSender(),
            {
                value: toNano("0.15"),
                commitment: parsedNote2.deposit.commitment,
                depositAmount: toNano("0.01")
            }
        )

        expect(depositResult.transactions).toHaveTransaction({
            from: depositor.address,
            to: depositWithdraw.address,
            success: true
        })

        //Assert that now with new entries, the old one is still there!

        const dict1 = await depositWithdraw.getDeposit(parsedNote.deposit.commitment);

        expect(dict1.commitment).toBe(parsedNote.deposit.commitment);

        expect(dict1.nullifier).toBe(0n);
        expect(dict1.depositAmount).toBe(toNano("0.01"))


        const dict2 = await depositWithdraw.getDeposit(parsedNote2.deposit.commitment);

        expect(dict2.commitment).toBe(parsedNote2.deposit.commitment);

        expect(dict2.nullifier).toBe(0n);
        expect(dict2.depositAmount).toBe(toNano("0.01"))

    })

    it("should withdraw", async () => {
        const noteString = await deposit({ currency: "tbtc", amount: 1 });
        const parsedNote = await parseNote(noteString);
        const depositor = await blockchain.treasury("depositor");

        let depositResult = await depositWithdraw.sendDeposit(
            depositor.getSender(), {
            value: toNano("0.15"),
            commitment: parsedNote.deposit.commitment,
            depositAmount: toNano("0.01")
        })

        expect(depositResult.transactions).toHaveTransaction({
            from: depositor.address,
            to: depositWithdraw.address,
            success: true
        })


        const verifier = await blockchain.treasury("verifier");
        const recipient_address = verifier.address;
        const [workchain, splitRawAddress] = SplitAddress(recipient_address.toRawString());


        const recipient_bigint = hexToBigint(splitRawAddress);
        const { proof, publicSignals } = await generateNoteWithdrawProof(
            {
                deposit: parsedNote.deposit,
                recipient: recipient_bigint,
                workchain: parseInt(workchain),
                snarkArtifacts: undefined
            })
        const curve = await buildBls12381();
        const proofProc = unstringifyBigInts(proof);
        const pi_aS = g1Compressed(curve, proofProc.pi_a);
        const pi_bS = g2Compressed(curve, proofProc.pi_b);
        const pi_cS = g1Compressed(curve, proofProc.pi_c);
        const pi_a = Buffer.from(pi_aS, "hex");
        const pi_b = Buffer.from(pi_bS, "hex");
        const pi_c = Buffer.from(pi_cS, "hex");



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

        // Can do fetching with public view function to check a result

        const dict1 = await depositWithdraw.getDeposit(parsedNote.deposit.commitment);

        expect(dict1.commitment).toBe(parsedNote.deposit.commitment);

        expect(dict1.nullifier).toBe(parsedNote.deposit.nullifierHash);
        expect(dict1.depositAmount).toBe(toNano("0.01"));

    })
});
