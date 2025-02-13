import { Blockchain, SandboxContract, SendMessageResult, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import { depositJettonsForwardPayload, DepositWithdraw } from '../wrappers/DepositWithdraw';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { deposit, g1Compressed, g2Compressed, generateNoteWithdrawProof, hexToBigint, parseNote, SplitAddress } from '../lib/cryptonotes';



//@ts-ignore
import { buildBls12381, utils } from "ffjavascript";
import { JettonMinter } from '../wrappers/Jetton/JettonMinter';
import { JettonWallet } from '../wrappers/Jetton/JettonWallet';
import { BLOCKCHAIN_START_TIME, INITIAL_JETTON_BALANCE, openContractJettonMinter } from './utils';
const { unstringifyBigInts } = utils;



describe('DepositWithdraw', () => {

    //The code of the main contract
    let contract_code: Cell;


    //Blockchain
    let blockchain: Blockchain;

    //Jetton
    let jetton_sender: SandboxContract<TreasuryContract>;
    let not_jetton_sender: SandboxContract<TreasuryContract>;
    let jetton_receiver: SandboxContract<TreasuryContract>;
    let not_jetton_receiver: SandboxContract<TreasuryContract>;

    let jettonUserWallet: (address: Address) => Promise<SandboxContract<JettonWallet>>;

    let jwallet_code: Cell;
    let minter_code: Cell;

    let jettonMinter: SandboxContract<JettonMinter>;

    let jetton_sender_jetton_wallet: SandboxContract<JettonWallet>;
    let not_jetton_sender_jetton_wallet: SandboxContract<JettonWallet>;
    let jetton_receiver_jetton_wallet: SandboxContract<JettonWallet>;

    let deployer: SandboxContract<TreasuryContract>;
    let depositWithdraw: SandboxContract<DepositWithdraw>;

    let depositWithdraw_Deploy: SendMessageResult;



    beforeAll(async () => {
        contract_code = await compile('DepositWithdraw');
        jwallet_code = await compile("/Jetton/JettonWallet");
        minter_code = await compile("/Jetton/JettonMinter");
    });


    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = BLOCKCHAIN_START_TIME;

        deployer = await blockchain.treasury('deployer');
        jetton_sender = await blockchain.treasury("jetton_sender");
        not_jetton_sender = await blockchain.treasury("not_jetton_sender");
        jetton_receiver = await blockchain.treasury("jetton_receiver");
        not_jetton_receiver = await blockchain.treasury("not_jetton_receiver");

        jettonMinter = openContractJettonMinter(blockchain, jetton_sender.address, jwallet_code, minter_code);

        jettonUserWallet = async (address: Address) => blockchain.openContract(JettonWallet.createFromAddress(await jettonMinter.getWalletAddress(address)));

        //Preparations: deploy jetton minter + set initial balance to jetton wallets and check it
        await jettonMinter.sendDeploy(jetton_sender.getSender(), toNano("1"));

        jetton_sender_jetton_wallet = await jettonUserWallet(jetton_sender.address);
        not_jetton_sender_jetton_wallet = await jettonUserWallet(not_jetton_sender.address);
        jetton_receiver_jetton_wallet = await jettonUserWallet(jetton_receiver.address);



        await jettonMinter.sendMint(
            jetton_sender.getSender(),
            jetton_sender.address,
            INITIAL_JETTON_BALANCE,
            toNano("0.05"),
            toNano("1")
        );

        await jettonMinter.sendMint(
            jetton_sender.getSender(),
            not_jetton_sender.address,
            INITIAL_JETTON_BALANCE,
            toNano("0.05"),
            toNano("1")
        )

        await jettonMinter.sendMint(
            jetton_sender.getSender(),
            jetton_receiver.address,
            INITIAL_JETTON_BALANCE,
            toNano("0.05"),
            toNano("1")
        );

        await jettonMinter.sendMint(
            jetton_sender.getSender(),
            not_jetton_receiver.address,
            INITIAL_JETTON_BALANCE,
            toNano("0.05"),
            toNano("1")
        );

        expect(await jetton_sender_jetton_wallet.getJettonBalance()).toBe(INITIAL_JETTON_BALANCE);
        expect(await jetton_receiver_jetton_wallet.getJettonBalance()).toBe(INITIAL_JETTON_BALANCE);



        depositWithdraw = blockchain.openContract(
            DepositWithdraw.createFromConfig(
                {
                    init: 0,
                    jetton_wallet_address: jettonMinter.address,//Jetton minter address,
                    jetton_wallet_set: 0,
                    creator_address: deployer.address
                },
                contract_code
            )
        );

        depositWithdraw_Deploy = await depositWithdraw.sendDeploy(deployer.getSender(), toNano('10'));

        expect(depositWithdraw_Deploy.transactions).toHaveTransaction({
            from: deployer.address,
            to: depositWithdraw.address,
            deploy: true,
            success: true,
        });

        // depositWithdraw --> jettonMinter (requesting our contract own jetton wallet)
        expect(depositWithdraw_Deploy.transactions).toHaveTransaction({
            from: depositWithdraw.address,
            to: jettonMinter.address,
            success: true,
        });


    });

    describe("Deposits and withraws", () => {

        let depositedAmount: bigint;
        let depositMessageResult: SendMessageResult;

        let forwardAmount: bigint;

        let depositData: Cell;

        let noteString: string;
        let parsedNote: any;

        beforeAll(async () => {
            depositedAmount = toNano("1");
            forwardAmount = toNano("1");
            noteString = await deposit({ currency: "tbtc", amount: 1 });
            parsedNote = await parseNote(noteString);
            depositData = depositJettonsForwardPayload({ commitment: parsedNote.deposit.commitment })
        })

        it("should do a jetton deposit and save the commitment", async () => {
            depositMessageResult = await jetton_sender_jetton_wallet.sendTransfer(
                jetton_sender.getSender(),
                toNano("1.5"),
                depositedAmount,
                depositWithdraw.address, // Send to
                jetton_sender.address, //Response address
                beginCell().endCell(), //CustomPayload
                forwardAmount, //Must have enough Ton to forward it...
                depositData
            );

            expect(depositMessageResult.transactions).toHaveTransaction({
                from: jetton_sender.address,
                to: jetton_sender_jetton_wallet.address,
                success: true
            });

            //Check if it set it... yeah!
            const dict = await depositWithdraw.getDeposit(parsedNote.deposit.commitment);
            expect(dict.nullifier).toBe(0n);
            expect(dict.depositAmount).toBe(toNano("1"));


            //TODO: withraw left!

        })

    })

    // it("should call deposit and save the data to storage", async () => {
    //     const noteString = await deposit({ currency: "tbtc", amount: 1 });
    //     const parsedNote = await parseNote(noteString);

    //     const depositor = await blockchain.treasury("depositor");

    //     let depositResult = await depositWithdraw.sendDeposit(
    //         depositor.getSender(), {
    //         value: toNano("0.15"),
    //         commitment: parsedNote.deposit.commitment,
    //         depositAmount: toNano("0.01")
    //     })

    //     expect(depositResult.transactions).toHaveTransaction({
    //         from: depositor.address,
    //         to: depositWithdraw.address,
    //         success: true
    //     })
    //     const dict = await depositWithdraw.getDeposit(parsedNote.deposit.commitment);


    //     expect(dict.nullifier).toBe(0n);
    //     expect(dict.depositAmount).toBe(toNano("0.01"))

    //     //Now I save a new deposit...

    //     depositResult = await depositWithdraw.sendDeposit(
    //         depositor.getSender(),
    //         {
    //             value: toNano("0.15"),
    //             commitment: parsedNote.deposit.commitment,
    //             depositAmount: toNano("0.01")
    //         }
    //     )

    //     expect(depositResult.transactions).toHaveTransaction({
    //         from: depositor.address,
    //         to: depositWithdraw.address,
    //         success: false,
    //         exitCode: 52
    //     })

    //     const noteString2 = await deposit({ currency: "tbtc", amount: 0.01 });
    //     const parsedNote2 = await parseNote(noteString2);

    //     depositResult = await depositWithdraw.sendDeposit(
    //         depositor.getSender(),
    //         {
    //             value: toNano("0.15"),
    //             commitment: parsedNote2.deposit.commitment,
    //             depositAmount: toNano("0.01")
    //         }
    //     )

    //     expect(depositResult.transactions).toHaveTransaction({
    //         from: depositor.address,
    //         to: depositWithdraw.address,
    //         success: true
    //     })

    //     //Assert that now with new entries, the old one is still there!

    //     const dict1 = await depositWithdraw.getDeposit(parsedNote.deposit.commitment);

    //     expect(dict1.nullifier).toBe(0n);
    //     expect(dict1.depositAmount).toBe(toNano("0.01"))


    //     const dict2 = await depositWithdraw.getDeposit(parsedNote2.deposit.commitment);

    //     expect(dict2.nullifier).toBe(0n);
    //     expect(dict2.depositAmount).toBe(toNano("0.01"))

    // })

    // it("should withdraw", async () => {
    //     const noteString = await deposit({ currency: "tbtc", amount: 1 });
    //     const parsedNote = await parseNote(noteString);
    //     const depositor = await blockchain.treasury("depositor");

    //     let depositResult = await depositWithdraw.sendDeposit(
    //         depositor.getSender(), {
    //         value: toNano("0.15"),
    //         commitment: parsedNote.deposit.commitment,
    //         depositAmount: toNano("0.01")
    //     })

    //     expect(depositResult.transactions).toHaveTransaction({
    //         from: depositor.address,
    //         to: depositWithdraw.address,
    //         success: true
    //     })


    //     const verifier = await blockchain.treasury("verifier");
    //     const recipient_address = verifier.address;
    //     const [workchain, splitRawAddress] = SplitAddress(recipient_address.toRawString());


    //     const recipient_bigint = hexToBigint(splitRawAddress);
    //     const { proof, publicSignals } = await generateNoteWithdrawProof(
    //         {
    //             deposit: parsedNote.deposit,
    //             recipient: recipient_bigint,
    //             workchain: parseInt(workchain),
    //             snarkArtifacts: undefined
    //         })
    //     const curve = await buildBls12381();
    //     const proofProc = unstringifyBigInts(proof);
    //     const pi_aS = g1Compressed(curve, proofProc.pi_a);
    //     const pi_bS = g2Compressed(curve, proofProc.pi_b);
    //     const pi_cS = g1Compressed(curve, proofProc.pi_c);
    //     const pi_a = Buffer.from(pi_aS, "hex");
    //     const pi_b = Buffer.from(pi_bS, "hex");
    //     const pi_c = Buffer.from(pi_cS, "hex");



    //     const verifyResult = await depositWithdraw.sendWithdraw(
    //         verifier.getSender(),
    //         {
    //             pi_a: pi_a,
    //             pi_b: pi_b,
    //             pi_c: pi_c,
    //             pubInputs: publicSignals,
    //             value: toNano("0.15") //0.15 TON fee
    //         });

    //     expect(verifyResult.transactions).toHaveTransaction({
    //         from: verifier.address,
    //         to: depositWithdraw.address,
    //         success: true
    //     })

    //     // Can do fetching with public view function to check a result

    //     const dict1 = await depositWithdraw.getDeposit(parsedNote.deposit.commitment);


    //     expect(dict1.nullifier).toBe(parsedNote.deposit.nullifierHash);
    //     expect(dict1.depositAmount).toBe(toNano("0.01"));

    // })
});
